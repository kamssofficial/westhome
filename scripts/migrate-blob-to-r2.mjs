// Migrate media from Vercel Blob to Cloudflare R2.
//
// Usage:
//   node --env-file=.env scripts/migrate-blob-to-r2.mjs            # dry run (no writes)
//   node --env-file=.env scripts/migrate-blob-to-r2.mjs --apply    # copy objects + rewrite DB URLs
//
// Requires DATABASE_URL plus the R2_* variables (see src/lib/r2.ts).
// Safe to re-run: objects already present in R2 are skipped, and URL rewrites are idempotent.

import pg from "pg";
import { AwsClient } from "aws4fetch";
import { readFileSync, existsSync } from "fs";

// ---------- env loading (works with or without --env-file) ----------
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const APPLY = process.argv.includes("--apply");
const BLOB_HOST_RE = /https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s"'\\<>)]+/gi;

const {
  DATABASE_URL,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
} = process.env;

for (const [name, v] of Object.entries({
  DATABASE_URL,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
})) {
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
const PUBLIC_BASE = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
const r2 = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });

// Columns that may hold blob URLs. Text columns are string-replaced;
// JSON columns are rewritten via ::text round-trip.
const TEXT_TARGETS = [
  ['"ProductImage"', "url", "id"],
  ['"ProductVideo"', "url", "id"],
  ['"VariantImage"', "url", "id"],
  ['"CategoryImage"', "url", "id"],
  ['"Category"', "image", "id"],
  ['"Subcategory"', "image", "id"],
  ['"Review"', "image", "id"],
  ['"OrderItem"', "image", "id"], // order-time snapshot of the product image
  ['"Promotion"', "image", "id"],
  ['"HomepageSection"', "image", "id"],
  ['"HomepageSection"', '"videoUrl"', "id"],
  ['"ContentPage"', "content", "id"],
  ['"Product"', "description", "id"],
  ['"Product"', '"shortDescription"', "id"],
];const JSON_TARGETS = [
  ['"SiteSetting"', "value", "key"],
  ['"HomepageSection"', "content", "id"],
];

// ---------- R2 helpers ----------
function r2KeyFromBlobUrl(blobUrl) {
  const u = new URL(blobUrl);
  return decodeURIComponent(u.pathname.slice(1)); // drop leading slash
}

async function r2ObjectExists(key) {
  const res = await r2.fetch(`${R2_ENDPOINT}/${key.split("/").map(encodeURIComponent).join("/")}`, { method: "HEAD" });
  return res.ok;
}

async function copyToR2(blobUrl) {
  const key = r2KeyFromBlobUrl(blobUrl);
  if (await r2ObjectExists(key)) return { key, skipped: true };

  const dl = await fetch(blobUrl);
  if (!dl.ok) throw new Error(`download failed: HTTP ${dl.status}`);
  const buf = Buffer.from(await dl.arrayBuffer());
  const contentType = dl.headers.get("content-type") || "application/octet-stream";

  const up = await r2.fetch(`${R2_ENDPOINT}/${key.split("/").map(encodeURIComponent).join("/")}`, {
    method: "PUT",
    body: buf,
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
  if (!up.ok) throw new Error(`R2 PUT failed: HTTP ${up.status} ${(await up.text()).slice(0, 200)}`);
  return { key, skipped: false, bytes: buf.length };
}

// ---------- main ----------
const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();

const urlMap = new Map(); // blobUrl -> r2Url
let copyOk = 0, copySkip = 0, copyFail = 0;

async function ensureCopied(blobUrl) {
  if (urlMap.has(blobUrl)) return urlMap.get(blobUrl);
  try {
    const { skipped } = await copyToR2(blobUrl);
    const r2Url = `${PUBLIC_BASE}/${r2KeyFromBlobUrl(blobUrl)}`;
    urlMap.set(blobUrl, r2Url);
    if (skipped) copySkip++;
    else copyOk++;
    console.log(`  ${skipped ? "exists" : "copied"}: ${blobUrl}`);
  } catch (err) {
    copyFail++;
    console.error(`  FAILED: ${blobUrl} -> ${err.message}`);
  }
  return urlMap.get(blobUrl) ?? null;
}

async function processColumn(table, column, pk, isJson) {
  const like = isJson ? `${column}::text` : column;
  const { rows } = await client.query(
    `SELECT ${pk} AS pk, ${like} AS val FROM ${table} WHERE ${like} LIKE '%blob.vercel-storage.com%'`
  );
  if (rows.length === 0) return { table, column, rows: 0, updated: 0 };
  console.log(`\n${table}.${column.replace(/"/g, "")}: ${rows.length} row(s) with blob URLs`);
  let updated = 0;
  for (const row of rows) {
    const found = [...new Set(row.val.match(BLOB_HOST_RE) || [])];
    let val = row.val;
    let allCopied = true;
    for (const blobUrl of found) {
      const r2Url = await ensureCopied(blobUrl);
      if (!r2Url) { allCopied = false; continue; }
      val = val.split(blobUrl).join(r2Url);
    }
    if (!allCopied || val === row.val) continue;
    if (APPLY) {
      if (isJson) {
        await client.query(`UPDATE ${table} SET ${column} = $1::jsonb WHERE ${pk} = $2`, [val, row.pk]);
      } else {
        await client.query(`UPDATE ${table} SET ${column} = $1 WHERE ${pk} = $2`, [val, row.pk]);
      }
    }
    updated++;
  }
  console.log(`  ${APPLY ? "updated" : "would update"}: ${updated} row(s)`);
  return { table, column, rows: rows.length, updated };
}

console.log(`Mode: ${APPLY ? "APPLY (DB writes enabled)" : "DRY RUN (DB writes skipped; R2 copies still performed, idempotent)"}`);

const results = [];
for (const [t, c, pk] of TEXT_TARGETS) results.push(await processColumn(t, c, pk, false));
for (const [t, c, pk] of JSON_TARGETS) results.push(await processColumn(t, c, pk, true));

console.log("\n---- summary ----");
console.log(`objects copied to R2 : ${copyOk}`);
console.log(`already in R2        : ${copySkip}`);
console.log(`copy failures        : ${copyFail}`);
console.log(`rows touched         : ${results.reduce((n, r) => n + r.updated, 0)}${APPLY ? "" : " (dry run — nothing written)"}`);
if (copyFail > 0) process.exitCode = 1;
await client.end();
