// One-off: import the 11 "New Arrivals" carpets from the local Google Drive
// mirror into the catalogue.
//   Source:  G:/My Drive/Westhome/Carpets/New Arrivals  (file_*.png, 1024x1536)
//   Every rug is 6x4 ft, priced like the existing 6x4 tier: MRP 4999 → sale 3999.
//   Images are converted to JPEG q85 in public/collections/carpets/<slug>.jpg
//   and served as static assets (same convention as the cushion-covers import;
//   Drive-proxied /api/images/<id> needs credentials this machine doesn't have).
//
// Usage:
//   node scripts/add-new-arrival-carpets.mjs             # dry run + stage images
//   node scripts/add-new-arrival-carpets.mjs --apply     # write to DB
import pg from "pg";
import { readFileSync, readdirSync, mkdirSync, existsSync } from "fs";
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
const SRC_DIR = "G:/My Drive/Westhome/Carpets/New Arrivals";
const OUT_DIR = path.join(process.cwd(), "public", "collections", "carpets");
const CATEGORY_SLUG = "carpets";

// Sorted glob order == the #01..#11 order from the visual review.
const RUGS = [
  { file: "file_00000000293882109f86958bc462a30a.png", name: "Ivory Gold Wave Line Area Rug 6*4fts" },
  { file: "file_000000003c808208ad2706520a3cea19.png", name: "Ivory Carved Swirl Area Rug 6*4fts" },
  { file: "file_0000000041908208bb31935865f015fb.png", name: "Grey Distressed Texture Area Rug 6*4fts" },
  { file: "file_0000000044348211a5378c2894453364.png", name: "Sage Green Leaf Pattern Area Rug 6*4fts" },
  { file: "file_0000000060e48246a743d6be0b9b2895.png", name: "Ivory Gold Hexagon Area Rug 6*4fts" },
  { file: "file_00000000b0dc81f4a5004c441b42e6fe.png", name: "Beige Textured Lines Area Rug 6*4fts" },
  { file: "file_00000000be1c82119684959d1185eb2e.png", name: "Ivory Charcoal Trellis Area Rug 6*4fts" },
  { file: "file_00000000c93c82088d522b1695f24c89.png", name: "Coffee Brown Solid Area Rug 6*4fts" },
  { file: "file_00000000cf8c8246a1ab094ccc717566.png", name: "Ivory Border Frame Area Rug 6*4fts" },
  { file: "file_00000000d7fc81f489e4f5abb83fe4f2.png", name: "Grey Striped Distressed Area Rug 6*4fts" },
  { file: "file_00000000dec082119f407157b93cc97c.png", name: "Beige Classic Solid Area Rug 6*4fts" },
];

function slugify(name) {
  return name.toLowerCase().replace(/[*×]/g, "x").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ── 1. Verify every source file exists ──
const present = new Set(readdirSync(SRC_DIR));
for (const rug of RUGS) {
  if (!present.has(rug.file)) { console.error(`MISSING source file: ${rug.file}`); process.exit(1); }
}
console.log(`All ${RUGS.length} source files present.\n`);

// ── 2. Stage images as optimized static assets (always; harmless to repeat) ──
mkdirSync(OUT_DIR, { recursive: true });
const sharp = (await import("sharp")).default;
for (const rug of RUGS) {
  const slug = slugify(rug.name);
  const out = path.join(OUT_DIR, `${slug}.jpg`);
  if (existsSync(out)) { console.log(`image exists: ${slug}.jpg`); continue; }
  await sharp(path.join(SRC_DIR, rug.file))
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(out);
  console.log(`staged: ${slug}.jpg`);
}

// ── 3. Dry-run summary ──
console.log("\nProducts to create:");
for (const rug of RUGS) console.log(`  ${rug.name}  ->  /collections/carpets/${slugify(rug.name)}.jpg`);
if (!APPLY) { console.log("\nDRY RUN — rerun with --apply to write to the database."); process.exit(0); }

// ── 4. Insert into the database ──
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await client.connect();

const cat = (await client.query(`SELECT id FROM "Category" WHERE slug = $1`, [CATEGORY_SLUG])).rows[0];
if (!cat) { console.error("Carpet category missing — aborting"); process.exit(1); }

const existingSlugs = new Set((await client.query(`SELECT slug FROM "Product"`)).rows.map((r) => r.slug));

let created = 0;
for (const rug of RUGS) {
  const slug = slugify(rug.name);
  if (existingSlugs.has(slug)) { console.log(`SKIP (slug exists): ${slug}`); continue; }

  const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  await client.query(
    `INSERT INTO "Product" (
       id, name, slug, status, "isActive", "stockQuantity", "lowStockThreshold",
       "trackInventory", "allowBackorder", "regularPrice", "salePrice",
       "purchaseMethod", "shortDescription", description,
       "isNewArrival", "dimensionUnit", "categoryId", "createdAt", "updatedAt"
     ) VALUES (
       $1,$2,$3,'ACTIVE',true,1,5,
       false,false,4999,3999,
       'BOTH',$4,$5,
       true,'cm',$6,now(),now()
     )`,
    [
      id,
      rug.name,
      slug,
      `${rug.name} — carpets from the West Home collection`,
      `soft, textured comfort underfoot to complete your space.\nSIZE :6*4 FTS`,
      cat.id,
    ]
  );
  await client.query(
    `INSERT INTO "ProductImage" (id, "productId", url, alt, position, "isPrimary", "imageType")
     VALUES ($1,$2,$3,$4,0,true,'PRODUCT')`,
    ["i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), id, `/collections/carpets/${slug}.jpg`, rug.name]
  );
  console.log(`CREATED: ${rug.name} (${id})`);
  created++;
}

console.log(`\nDone — created ${created} product(s).`);
await client.end();
