#!/usr/bin/env node
/**
 * Migrate heavy static images from public/ to Google Drive so the repository
 * holds no product/category images and Vercel never serves them.
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-images-to-drive.mjs              # dry run — prints the plan
 *   node --env-file=.env scripts/migrate-images-to-drive.mjs --apply      # uploads + rewrites code + DB
 *   node --env-file=.env scripts/migrate-images-to-drive.mjs --upload-only # uploads + prints mapping, no edits
 *
 * Requires one of:
 *   GOOGLE_OAUTH_CLIENT_ID / _CLIENT_SECRET / _REFRESH_TOKEN   (OAuth)
 *   GOOGLE_CREDENTIALS_PATH or GOOGLE_CREDENTIALS_JSON         (service account)
 *
 * What it migrates:
 *   Every raster image in public/ that is > 30 KB (PNG/JPG/WEBP).
 *
 * What it keeps as static:
 *   Favicons, manifest, sw.js, SVG placeholders, logos, UPI QR — all < 30 KB,
 *   all referenced by browser convention or at paths that would break if moved.
 *
 * After --apply:
 *   1. Code references in src/ are rewritten from static paths to /api/images/<id>.
 *   2. Database rows (ProductImage.url, Category.image, etc.) are updated.
 *   3. The migrated files are deleted from public/.
 *   4. npm run audit:images re-run to confirm 0 orphans and 0 missing.
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");

// ── 1. Discover every raster image in public/ and classify it ──────────────

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const RASTER_THRESHOLD = 30 * 1024; // 30 KB — below this, not worth a Drive round-trip
const allImages = walk(PUBLIC_DIR);
const heavy = [];
const tiny = [];

for (const full of allImages) {
  const rel = "/" + path.relative(PUBLIC_DIR, full).split(path.sep).join("/");
  const size = fs.statSync(full).size;
  if (size >= RASTER_THRESHOLD) heavy.push({ rel, full, size });
  else tiny.push({ rel, size });
}

console.log(`\n  Raster images found: ${allImages.length}`);
console.log(`  Heavy (>30 KB, will migrate): ${heavy.length} (${fmtBytes(heavy.reduce((s, h) => s + h.size, 0))})`);
console.log(`  Tiny (<30 KB, kept as static): ${tiny.length} (${fmtBytes(tiny.reduce((s, t) => s + t.size, 0))})`);

if (heavy.length === 0) {
  console.log("\n  Nothing to migrate.\n");
  process.exit(0);
}

console.log("\n  Files to migrate:");
for (const h of heavy) console.log(`    ${fmtBytes(h.size).padStart(10)}  ${h.rel}`);

// ── 2. Connect to Google Drive ─────────────────────────────────────────────

async function getAuth() {
  const { google } = await import("googleapis");
  const oauth =
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (oauth) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    return auth;
  }

  let creds;
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  } else if (process.env.GOOGLE_CREDENTIALS_PATH) {
    creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH, "utf8"));
  } else {
    console.error("\n  No Google Drive credentials found in env.\n");
    process.exit(1);
  }
  return google.auth.fromJSON(creds);
}

// Folder cache (Drive folders created once per name)
const folderCache = new Map();

async function resolveFolder(drive, name) {
  const cached = folderCache.get(name);
  if (cached) return cached;
  const parentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const q = parentId
    ? `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({ q, fields: "files(id, name)", pageSize: 5, supportsAllDrives: true, includeItemsFromAllDrives: true });
  const match = res.data.files?.[0];
  if (match) { folderCache.set(name, match.id); return match.id; }
  const created = await drive.files.create({ requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : [] }, fields: "id", supportsAllDrives: true });
  if (!created.data.id) throw new Error(`Failed to create folder: ${name}`);
  folderCache.set(name, created.data.id);
  return created.data.id;
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

// ── 3. Upload + build mapping ──────────────────────────────────────────────

async function uploadOne(drive, folderId, { full, rel }) {
  const filename = rel.replace(/^\//, "").replace(/\//g, "__"); // flat: collections__carpets__foo.png
  const ext = path.extname(rel).toLowerCase();
  const buffer = fs.readFileSync(full);
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId], mimeType: MIME[ext] || "application/octet-stream" },
    media: { mimeType: MIME[ext] || "application/octet-stream", body: new (await import("stream")).Readable.from(buffer) },
    fields: "id, name, size, mimeType",
    supportsAllDrives: true,
  });
  if (!res.data.id) throw new Error(`Upload failed for ${rel}`);
  return { id: res.data.id, name: res.data.name, size: Number(res.data.size || buffer.byteLength), mimeType: res.data.mimeType };
}

// ── 4. Rewrite code references ─────────────────────────────────────────────

function rewriteCodeRefs(mapping) {
  const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { if (!["node_modules", ".next", ".git", "scripts", "prisma"].includes(entry.name)) scan(path.join(dir, entry.name)); continue; }
      if (!SRC_EXT.test(entry.name)) continue;
      const full = path.join(dir, entry.name);
      let text = fs.readFileSync(full, "utf8");
      let changed = false;
      for (const [oldPath, newPath] of Object.entries(mapping)) {
        if (text.includes(`"${oldPath}"`)) { text = text.replaceAll(`"${oldPath}"`, `"${newPath}"`); changed = true; }
        if (text.includes(`'${oldPath}'`)) { text = text.replaceAll(`'${oldPath}'`, `'${newPath}'`); changed = true; }
      }
      if (changed) { fs.writeFileSync(full, text); console.log(`    rewritten: ${path.relative(ROOT, full)}`); }
    }
  }
  scan(path.join(ROOT, "src"));

  // public/manifest.json is also a source of image paths (PWA icons)
  const manifestPath = path.join(ROOT, "public", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    let manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    let changed = false;
    for (const entry of Object.values(manifest.icons || {})) {
      if (Array.isArray(entry)) {
        for (const icon of entry) { if (mapping[icon.src]) { icon.src = mapping[icon.src]; changed = true; } }
      } else if (entry && mapping[entry.src]) { entry.src = mapping[entry.src]; changed = true; }
    }
    if (changed) { fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n"); console.log("    rewritten: public/manifest.json"); }
  }
}

// ── 5. Rewrite DB references ───────────────────────────────────────────────

async function rewriteDbRefs(mapping) {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) });

  const columns = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type IN ('text','character varying')
      AND (column_name ILIKE '%image%' OR column_name ILIKE '%url%' OR column_name ILIKE '%photo%')
  `);

  let total = 0;
  for (const { table_name, column_name } of columns) {
    const rows = await prisma.$queryRawUnsafe(`SELECT DISTINCT "${column_name}" AS v FROM "${table_name}" WHERE "${column_name}" LIKE '/%'`);
    for (const { v } of rows) {
      const clean = v.split("?")[0].split("#")[0];
      if (mapping[clean]) {
        await prisma.$executeRawUnsafe(`UPDATE "${table_name}" SET "${column_name}" = REPLACE("${column_name}", $1, $2) WHERE "${column_name}" LIKE $3`, clean, mapping[clean], `%${clean}%`);
        total++;
        console.log(`    db: ${table_name}.${column_name}  ${clean} → ${mapping[clean]}`);
      }
    }
  }
  await prisma.$disconnect();
  return total;
}

// ── 6. Delete migrated files ───────────────────────────────────────────────

function deleteMigratedFiles(heavy) {
  for (const { full } of heavy) {
    fs.unlinkSync(full);
    // Remove empty parent dirs
    let dir = path.dirname(full);
    while (dir !== PUBLIC_DIR) {
      try { fs.rmdirSync(dir); dir = path.dirname(dir); } catch { break; }
    }
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function fmtBytes(n) { return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`; }

// ── main ───────────────────────────────────────────────────────────────────

const apply = process.argv.includes("--apply");
const uploadOnly = process.argv.includes("--upload-only");
const dryRun = !apply && !uploadOnly;

console.log(`\n  Mode: ${apply ? "APPLY (upload + rewrite)" : uploadOnly ? "UPLOAD ONLY" : "DRY RUN"}`);

if (dryRun) {
  console.log("\n  Run with --upload-only or --apply to execute.\n");
  process.exit(0);
}

const { google } = await import("googleapis");
const auth = await getAuth();
const drive = google.drive({ version: "v3", auth });
const folderId = await resolveFolder(drive, "static-assets");
console.log(`\n  Drive folder: static-assets (${folderId})`);

const mapping = {}; // oldPath → new /api/images/<id>

for (const img of heavy) {
  console.log(`\n  Uploading ${img.rel} (${fmtBytes(img.size)})...`);
  try {
    const file = await uploadOne(drive, folderId, img);
    const newPath = `/api/images/${file.id}`;
    mapping[img.rel] = newPath;
    console.log(`    → ${newPath} (${fmtBytes(file.size)})`);
  } catch (err) {
    console.error(`    FAILED: ${err.message}`);
  }
}

console.log(`\n  Upload complete: ${Object.keys(mapping).length}/${heavy.length} files`);
console.log(`  Mapping written to scripts/migrate-images-to-drive.mapping.json`);

fs.writeFileSync(path.join(ROOT, "scripts", "migrate-images-to-drive.mapping.json"), JSON.stringify(mapping, null, 2) + "\n");

if (uploadOnly) {
  console.log("\n  Done. Review the mapping, then run with --apply to rewrite code + DB.\n");
  process.exit(0);
}

// --apply: rewrite code + DB, delete files
console.log("\n  Rewriting code references...");
rewriteCodeRefs(mapping);

console.log("  Rewriting database references...");
const dbUpdates = await rewriteDbRefs(mapping);
console.log(`  Database: ${dbUpdates} rows updated`);

console.log("  Deleting migrated files from public/...");
deleteMigratedFiles(heavy);

console.log("\n  Done. Re-run audit:");
console.log("    npm run audit:images\n");
