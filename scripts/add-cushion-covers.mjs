// One-off: import Cushion Covers from the local Google Drive mirror.
//   Source:  /G/My Drive/Westhome/Accessories/Cushion Covers
//   Filename format: ₹<MRP>(<SKU>) (n).png   — e.g. "₹499(cc275) (1).png"
//   Grouping rule: files with the SAME ₹MRP + SKU are multiple photos of ONE
//   product ("(1)", "(2)"… suffixes). Files like "₹299.png" (no SKU) are
//   skipped — the SKU is required to build a unique product.
//   MRP → regularPrice. No sale price given → salePrice = null (sells at MRP).
// Images are copied into public/collections/cushion-covers/ and served as
// static assets (same convention the existing catalogue uses).
//
// Usage:  node scripts/add-cushion-covers.mjs            # dry run
//         node scripts/add-cushion-covers.mjs --apply    # write to DB
import pg from "pg";
import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from "fs";
import path from "path";

function loadEnvFile(file) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* optional */ }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const APPLY = process.argv.includes("--apply");
const SRC_DIR = "G:/My Drive/Westhome/Accessories/Cushion Covers";
const OUT_DIR = path.join(process.cwd(), "public", "collections", "cushion-covers");
const CATEGORY_SLUG = "accessories";
const SUBCATEGORY_SLUG = "cushion-covers";

// ── 1. Parse filenames: ₹<mrp>(<sku>) (<n>).png ──
const NAME_RE = /^[₹]?\s*(\d+)\s*\(([^)]+)\)(?:\s*\((\d+)\))?\.png$/i;

function listFiles(dir) {
  try { return readdirSync(dir).filter(f => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg")); }
  catch (e) { console.error(`Cannot read source dir: ${dir}\n${e.message}`); process.exit(1); }
}

const products = new Map(); // key: mrp|sku  -> { mrp, sku, files: [src...] }
let skipped = 0;

for (const file of listFiles(SRC_DIR)) {
  const m = file.match(NAME_RE);
  if (!m) { console.log(`SKIP (no mrp+sku pattern): ${file}`); skipped++; continue; }
  const [, mrp, skuRaw] = m;
  const sku = skuRaw.trim();
  const key = `${mrp}|${sku}`;
  if (!products.has(key)) products.set(key, { mrp: Number(mrp), sku, files: [] });
  products.get(key).files.push(path.join(SRC_DIR, file));
}

console.log(`\nParsed ${products.size} product(s) from ${listFiles(SRC_DIR).length} file(s), skipped ${skipped}.\n`);

// ── 2. Connect + resolve category ──
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await client.connect();
const cat = (await client.query(`SELECT id FROM "Category" WHERE slug = $1`, [CATEGORY_SLUG])).rows[0];
const sub = (await client.query(`SELECT id FROM "Subcategory" WHERE slug = $1`, [SUBCATEGORY_SLUG])).rows[0];
if (!cat || !sub) { console.error("Category/subcategory missing — aborting"); process.exit(1); }

// Existing slugs + SKUs to avoid collisions
const existingSlugs = new Set((await client.query(`SELECT slug FROM "Product"`)).rows.map(r => r.slug));
const existingSkus = new Set((await client.query(`SELECT sku FROM "Product" WHERE sku IS NOT NULL`)).rows.map(r => r.sku.toUpperCase()));

// ── 3. Create products ──
if (APPLY) mkdirSync(OUT_DIR, { recursive: true });

let created = 0, wouldCreate = 0, failed = 0;

for (const { mrp, sku, files } of products.values()) {
  const name = `Cushion Cover ${sku}`;
  const baseSlug = `cushion-cover-${sku.toLowerCase()}`;
  let slug = baseSlug, n = 2;
  while (existingSlugs.has(slug)) slug = `${baseSlug}-${n++}`;

  const skuTaken = existingSkus.has(sku.toUpperCase());
  const finalSku = skuTaken ? null : sku; // don't violate unique constraint
  if (skuTaken) console.log(`  NOTE: SKU ${sku} already exists in DB → product will be created without SKU (duplicate listing)`);

  // Copy + rename images: cushion-cover-<sku>-1.png, -2.png …
  const imageRows = files.map((src, i) => {
    const destName = `${slug}-${i + 1}${path.extname(src)}`;
    if (APPLY) copyFileSync(src, path.join(OUT_DIR, destName));
    return { url: `/collections/cushion-covers/${destName}`, isPrimary: i === 0 };
  });

  try {
    if (APPLY) {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO "Product"
           (id, name, slug, sku, description, status, "isActive", "regularPrice", "salePrice",
            "stockQuantity", "lowStockThreshold", "trackInventory", "purchaseMethod",
            "categoryId", "subcategoryId", "publishedAt", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'ACTIVE', true, $5, NULL,
                 10, 5, true, 'BOTH', $6, $7, now(), now(), now())
         RETURNING id, name, slug`,
        [name, slug, finalSku, "Premium cushion cover from the Westhome Accessories collection.", mrp, cat.id, sub.id]
      );
      const productId = rows[0].id;
      for (let i = 0; i < imageRows.length; i++) {
        await client.query(
          `INSERT INTO "ProductImage" (id, "productId", url, alt, position, "isPrimary", "imageType")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'PRODUCT')`,
          [productId, imageRows[i].url, `${name} — image ${i + 1}`, i, i === 0]
        );
      }
      await client.query("COMMIT");
      existingSlugs.add(slug);
      if (finalSku) existingSkus.add(finalSku.toUpperCase());
      console.log(`  ✓ ${name} — MRP ₹${mrp}, SKU ${finalSku || "—"}, ${imageRows.length} image(s)`);
    } else {
      console.log(`  · [dry] ${name} — MRP ₹${mrp}, SKU ${finalSku || "—"}, ${imageRows.length} image(s)`);
    }
    if (APPLY) created++;
    else wouldCreate++;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(`  ✗ FAILED ${name}: ${e.message}`);
    failed++;
  }
}

console.log(`\n${APPLY ? `Created ${created} product(s)` : `Dry run — ${wouldCreate} product(s) would be created`}${failed ? `, ${failed} FAILED` : ""}.`);
if (!APPLY) console.log("Re-run with --apply to write to the database.");
await client.end();
if (failed > 0) process.exitCode = 1;
