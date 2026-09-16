// Which files under public/ does the running app actually use?
//
//   npm run audit:images        (or: node --env-file=.env scripts/audit-public-images.mjs)
//
// Run this BEFORE removing anything from public/, so a cleanup can never delete
// an image that a page or the database still points at.
//
// Exact-match only, and only against things that are served:
//   • every image-ish column in the database
//   • runtime source under src/ plus public/*.json (the web manifest)
// One-off scripts under scripts/ are deliberately NOT treated as references —
// they mention historical paths that the app no longer serves. Writes the
// orphan list to image-orphans.txt in the repo root. Keeping a file is always
// the safe default.
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),
});
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// ── 1. Database ─────────────────────────────────────────────────────────────
const dbRefs = new Set();
const columns = await prisma.$queryRawUnsafe(`
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND data_type IN ('text', 'character varying')
    AND (column_name ILIKE '%image%' OR column_name ILIKE '%url%' OR column_name ILIKE '%photo%')
`);
for (const { table_name, column_name } of columns) {
  let rows;
  try {
    rows = await prisma.$queryRawUnsafe(
      `SELECT DISTINCT "${column_name}" AS v FROM "${table_name}" WHERE "${column_name}" LIKE '/%'`,
    );
  } catch {
    continue;
  }
  for (const { v } of rows) {
    if (typeof v !== "string") continue;
    const clean = v.split("?")[0].split("#")[0];
    // A Drive id has no slash after the prefix and is not a file on disk.
    if (clean.startsWith("/api/images/")) {
      if (clean.slice("/api/images/".length).includes("/")) {
        dbRefs.add("/" + clean.slice("/api/images/".length));
      }
      continue;
    }
    dbRefs.add(clean);
  }
}
await prisma.$disconnect();

// ── 2. Runtime source + the web manifest ────────────────────────────────────
const sourceRefs = new Set();
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html)$/i;
const skipped = new Set(["node_modules", ".next", ".git", "scripts", "tmp-img-audit"]);

function scanFile(full) {
  const text = fs.readFileSync(full, "utf8");
  for (const m of text.matchAll(/["'`(](\/[A-Za-z0-9._@%()\-/\[\] ]{2,}?)["'`)]/g)) {
    sourceRefs.add(m[1].split("?")[0]);
  }
}
function scanDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skipped.has(entry.name)) continue;
      scanDir(path.join(dir, entry.name));
      continue;
    }
    if (SOURCE_EXT.test(entry.name)) scanFile(path.join(dir, entry.name));
  }
}
scanDir(path.join(ROOT, "src"));
for (const entry of fs.readdirSync(PUBLIC_DIR, { withFileTypes: true })) {
  if (entry.isFile() && SOURCE_EXT.test(entry.name)) scanFile(path.join(PUBLIC_DIR, entry.name));
}

// ── 3. Compare ──────────────────────────────────────────────────────────────
const files = walk(PUBLIC_DIR);
const fileSet = new Set(files.map((f) => "/" + path.relative(PUBLIC_DIR, f).split(path.sep).join("/")));

// Assets the browser requests by convention rather than by a path in our code:
// the web manifest, favicons/home-screen icons, the service worker, and the
// legacy UPI QR. Deleting any of these breaks something you cannot see in the
// source, so they are never treated as orphans.
const ALWAYS_KEEP = [
  /^\/manifest\.json$/,
  /^\/favicon\.ico$/,
  /^\/apple-touch-icon\.png$/,
  /^\/icon-.*\.(png|svg)$/,
  /^\/sw\.js$/,
  /^\/upi-qr\.(png|jpg)$/,
];

const keep = new Set();
for (const rel of fileSet) {
  if (dbRefs.has(rel) || sourceRefs.has(rel) || ALWAYS_KEEP.some((re) => re.test(rel))) {
    keep.add(rel);
  }
}
const orphan = [...fileSet].filter((rel) => !keep.has(rel)).sort();

const mb = (n) => (n / 1048576).toFixed(1) + " MB";
const sizeOf = (rel) => fs.statSync(path.join(PUBLIC_DIR, rel)).size;
const totalBytes = files.reduce((s, f) => s + fs.statSync(f).size, 0);
const keepBytes = [...keep].reduce((s, r) => s + sizeOf(r), 0);

console.log("── references ──");
console.log("distinct db paths:", dbRefs.size, "| distinct runtime source paths:", sourceRefs.size);
console.log("\n── public/ ──");
console.log("files:", files.length, mb(totalBytes));
console.log("KEEP:", keep.size, mb(keepBytes));
console.log("ORPHANS:", orphan.length, mb(totalBytes - keepBytes));

// Referenced paths that are not on disk would be broken images right now.
const missing = [...new Set([...dbRefs, ...sourceRefs])].filter(
  (r) => /^\/(images|collections|banners|logo|icons)\/\S+\.(png|jpe?g|webp|svg|gif|avif)$/i.test(r) && !fileSet.has(r),
);
if (missing.length) {
  console.log("\n⚠ referenced but MISSING on disk (" + missing.length + "):");
  for (const m of missing) console.log("   " + m);
}

console.log("\n── KEEP list (" + keep.size + ") ──");
for (const r of [...keep].sort()) console.log("  " + mb(sizeOf(r)).padStart(9) + "  " + r);

const orphanFile = path.join(ROOT, "image-orphans.txt");
fs.writeFileSync(orphanFile, orphan.join("\n"));
const byDir = new Map();
for (const rel of orphan) {
  const dir = path.dirname(rel);
  byDir.set(dir, byDir.get(dir) || { n: 0, b: 0 });
  const cur = byDir.get(dir);
  byDir.set(dir, { n: cur.n + 1, b: cur.b + sizeOf(rel) });
}
console.log("\n── orphans by folder ──");
for (const [dir, { n, b }] of [...byDir].sort((a, c) => c[1].b - a[1].b).slice(0, 15)) {
  console.log("  " + mb(b).padStart(9) + "  " + String(n).padStart(4) + " files  " + dir);
}
console.log("\norphan list → " + orphanFile);
