#!/usr/bin/env node
// READ-ONLY audit of every display-image URL in the database.
//
//   node --env-file=.env scripts/audit-media-urls.mjs
//
// For each row in each display column, the stored URL is classified:
//   drive     — a Drive-backed shape (proxy path, lh3 CDN, drive.google.com),
//               probed end-to-end through this app's /api/images/<id> route,
//               because that is exactly what a visitor's browser requests.
//   http      — any other absolute URL, fetched directly.
//   local     — a root-relative path, checked against public/ on disk.
//   empty     — null/blank, fine for optional columns, reported for required ones.
//
// A row "fails" when the fetch does not return 200 with an image/* content type
// and a non-empty body, or a local file is missing. The point is to catch, in
// one sweep, every image a customer could hit — not just the ones a test page
// happened to load.
import fs from "fs";
import path from "path";
import pg from "pg";

const BASE = process.env.AUDIT_BASE_URL || "http://localhost:3001";
const OUT = path.resolve(process.cwd(), process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : "tmp/image-sweep.json");

// Every column a visitor-facing <img> can end up sourcing, mirroring the
// schema. OrderItem.image is a historical snapshot of a purchase and is never
// rendered on the storefront, so it is excluded.
const TARGETS = [
  { table: "ProductImage", column: "url", label: "ProductImage.url", required: true },
  { table: "VariantImage", column: "url", label: "VariantImage.url", required: true },
  { table: "Category", column: "image", label: "Category.image", required: false },
  { table: "CategoryImage", column: "url", label: "CategoryImage.url", required: true },
  { table: "Subcategory", column: "image", label: "Subcategory.image", required: false },
  { table: "Review", column: "image", label: "Review.image", required: false },
  { table: "Promotion", column: "image", label: "Promotion.image", required: false },
  { table: "HomepageSection", column: "image", label: "HomepageSection.image", required: false },
  { table: "User", column: "image", label: "User.image", required: false },
];

// Drive URL shapes that carry a file id. Anything here is routed through the
// app's proxy for the probe, since that is the render path the fix guarantees.
const DRIVE_PATTERNS = [
  /^\/api\/images\/([^/?#]+)$/,
  /^https:\/\/lh3\.googleusercontent\.com\/(?:d|id)\/([^/?#=]+)/,
  /^https:\/\/drive\.google\.com\/uc\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/,
  /^https:\/\/drive\.google\.com\/(?:open\?id=|file\/d\/)([a-zA-Z0-9_-]+)/,
];

function driveFileId(url) {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  const bare = trimmed.split(/[?#]/)[0];
  for (const re of DRIVE_PATTERNS) {
    const m = re.exec(bare) ?? re.exec(trimmed);
    if (m) return m[1];
  }
  return null;
}

function classify(url) {
  if (url == null || String(url).trim() === "") return "empty";
  const t = String(url).trim();
  if (driveFileId(t)) return "drive";
  if (/^https?:\/\//i.test(t)) return "http";
  if (t.startsWith("/")) return "local";
  return "other";
}

async function probeDrive(fileId) {
  try {
    const res = await fetch(`${BASE}/api/images/${encodeURIComponent(fileId)}`, { signal: AbortSignal.timeout(90_000) });
    const type = res.headers.get("content-type") ?? "";
    const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
    return { status: res.status, contentType: type, bytes: buf.byteLength };
  } catch (err) {
    return { status: 0, contentType: "", bytes: 0, error: String(err?.cause?.code || err?.message || err) };
  }
}

async function probeHttp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "westhome-media-audit" } });
    const type = res.headers.get("content-type") ?? "";
    // Don't download huge bodies; a HEAD-ish range read is enough to see type+existence.
    const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
    return { status: res.status, contentType: type, bytes: buf.byteLength };
  } catch (err) {
    return { status: 0, contentType: "", bytes: 0, error: String(err?.cause?.code || err?.message || err) };
  }
}

function probeLocal(url) {
  const rel = url.replace(/^\/+/, "");
  const full = path.resolve(process.cwd(), "public", rel);
  if (!full.startsWith(path.resolve(process.cwd(), "public"))) return { status: 0, contentType: "", bytes: 0, error: "outside public/" };
  try {
    const bytes = fs.statSync(full).size;
    return { status: 200, contentType: "local-file", bytes };
  } catch {
    return { status: 404, contentType: "local-file", bytes: 0 };
  }
}

const ok = (r) => r.status === 200 && (r.contentType.startsWith("image/") || r.contentType === "local-file") && r.bytes > 0;

/** Bound concurrent probes: a busy page fires many image requests at once, and
 *  the proxy's Drive fetches are network-bound, not CPU-bound. */
const CONCURRENCY = Number(process.env.AUDIT_CONCURRENCY || 6);
async function mapPool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function runOne() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, runOne));
  return results;
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await client.connect();

const report = { generatedAt: new Date().toISOString(), base: BASE, targets: [] };
let total = 0, failures = 0;

for (const target of TARGETS) {
  const { rows } = await client.query(
    `SELECT id, "${target.column}" AS url FROM "${target.table}" ORDER BY id`,
  );
  const results = [];
  const counts = { drive: 0, http: 0, local: 0, empty: 0, other: 0 };

  const nonEmpty = rows.filter((row) => classify(row.url) !== "empty");
  for (const row of rows) counts[classify(row.url)] += 1;
  total += nonEmpty.length;

  await mapPool(nonEmpty, async (row) => {
    const kind = classify(row.url);
    let probe;
    if (kind === "drive") probe = await probeDrive(driveFileId(String(row.url).trim()));
    else if (kind === "http") probe = await probeHttp(String(row.url).trim());
    else if (kind === "local") probe = probeLocal(String(row.url).trim());
    else probe = { status: 0, contentType: "", bytes: 0, error: `unrecognized shape: ${row.url.slice(0, 80)}` };

    const passed = ok(probe);
    if (!passed) failures += 1;
    results.push({
      table: target.label,
      id: row.id,
      url: String(row.url),
      kind,
      ok: passed,
      ...probe,
    });
  });

  const failedRows = results.filter((r) => !r.ok);
  console.log(
    `${target.label}: ${rows.length} rows ` +
      `(drive ${counts.drive}, http ${counts.http}, local ${counts.local}, empty ${counts.empty}, other ${counts.other})` +
      (failedRows.length ? ` — ${failedRows.length} FAILED` : " — all ok"),
  );
  for (const f of failedRows) {
    console.log(`    FAIL ${f.id} status=${f.status} type=${f.contentType} bytes=${f.bytes} ${f.error ?? ""}`);
    console.log(`         ${f.url.slice(0, 120)}`);
  }
  report.targets.push({ ...target, counts, results });
}

await client.end();

console.log(`\nchecked ${total} non-empty urls, ${failures} failed`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`full report -> ${OUT}`);
process.exitCode = failures > 0 ? 1 : 0;
