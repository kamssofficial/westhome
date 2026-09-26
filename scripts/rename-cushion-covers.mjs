// Rename the 41 imported cushion cover products from "Cushion Cover <sku>"
// to descriptive names based on the color/texture analysis of each product's
// photos (see scripts/analyze-cushion-colors.mjs). Slugs + SEO fields are
// updated to match; SKU stays as the stable identifier.
//
// Usage:  node scripts/rename-cushion-covers.mjs            # dry run
//         node scripts/rename-cushion-covers.mjs --apply    # write to DB
import pg from "pg";
import { readFileSync } from "fs";

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

// Descriptive names per SKU (from photo color/texture analysis).
// Format: <color/pattern descriptor> + "Cushion Cover".
const NAMES = {
  "1012":   "Charcoal Woven Grid Cushion Cover",
  "1490":   "Terracotta & Charcoal Block Print Cushion Cover",
  "1552":   "Blush Boho Textured Cushion Cover",
  "1682":   "Rust Orange Embossed Cushion Cover",
  "1685":   "Black & Cream Geometric Cushion Cover",
  "3508":   "Grey & Blush Abstract Cushion Cover",
  "3786":   "Rust Textured Solid Cushion Cover",
  "4353":   "Black Contemporary Patterned Cushion Cover",
  "4373":   "Maroon & Rust Traditional Cushion Cover",
  "4532":   "Black Rust Motif Cushion Cover",   // note: 3 variants share this SKU family — distinguished below
  "5218":   "Cream & Blush Floral Cushion Cover",
  "5644":   "Multi-Tone Abstract Weave Cushion Cover",
  "5647":   "Blush Accent Textured Cushion Cover",
  "5648":   "Dusty Rose Solid Cushion Cover",
  "5671":   "Silver Grey Textured Cushion Cover",
  "5911":   "Black & Blush Duotone Cushion Cover",
  "5915":   "Rust & Cream Patchwork Cushion Cover",
  "5927":   "Matte Black Solid Cushion Cover",
  "8138":   "Black & Rose Accent Cushion Cover",
  "8169":   "Autumn Rust Patterned Cushion Cover",
  "3521":   "Indigo & Rust Folk Print Cushion Cover",
  "3509":   "Blush Cream Ombré Cushion Cover",
  "as1717": "Peach & Rust Art Deco Cushion Cover",
  "as4350": "Black Rust Graphic Cushion Cover",
  "as4375": "Burnt Orange Textured Cushion Cover",
  "as8730": "Terracotta Woven Cushion Cover",
  "cc112":  "Black & Rust Bohemian Cushion Cover",
  "cc1211": "Rose Taupe Melange Cushion Cover",
  "cc122":  "Rust Charcoal Bold Stripe Cushion Cover",
  "cc130":  "Amber Accent Weave Cushion Cover",
  "cc267":  "Charcoal Rust Tribal Cushion Cover",
  "cc275":  "Slate Grey Monochrome Cushion Cover",
  "cc289":  "Copper Accent Textured Cushion Cover",
  "cc316":  "Rust Fine Weave Cushion Cover",
  "cc318":  "Graphite Grey Contemporary Cushion Cover",
  "hs301":  "Hazelnut Rust Woven Cushion Cover",
};

// SKU-colliding duplicates (no SKU in DB) — disambiguated by their slug suffix.
const NAMES_NO_SKU = {
  "cushion-cover-1012-2":  "Onyx Rust Kilim Cushion Cover",
  "cushion-cover-1415":    "Blush Pink Textured Cushion Cover",
  "cushion-cover-3509-2":  "Charcoal & Rust Scatter Cushion Cover",
  "cushion-cover-4532-2":  "Black Ivory Classic Cushion Cover",
  "cushion-cover-4532-3":  "Sandstone Blend Everyday Cushion Cover",
};

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await client.connect();

const targets = (await client.query(
  `SELECT id, name, slug, sku FROM "Product"
   WHERE "subcategoryId" = 'cmt62yna1000aj4v1hdeait49' AND name LIKE 'Cushion Cover %'
   ORDER BY slug`
)).rows;

const existingSlugs = new Set((await client.query(`SELECT slug FROM "Product"`)).rows.map(r => r.slug));
const renames = [];

for (const p of targets) {
  let newName = p.sku ? NAMES[p.sku] : NAMES_NO_SKU[p.slug];
  if (!newName) { console.log(`  ! no mapping for ${p.slug} (sku=${p.sku}) — skipping`); continue; }

  // Build slug from new name; disambiguate if taken
  let slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let n = 2;
  while (existingSlugs.has(slug) && slug !== p.slug) slug = `${newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${n++}`;

  const seoTitle = `${newName} | West Home`;
  renames.push({ id: p.id, old: p.name, newName, oldSlug: p.slug, slug, seoTitle });
  existingSlugs.add(slug);
}

try {
  if (APPLY) await client.query("BEGIN");
  for (const r of renames) {
    if (APPLY) {
      await client.query(
        `UPDATE "Product" SET name = $1, slug = $2, "seoTitle" = $3, "updatedAt" = now() WHERE id = $4`,
        [r.newName, r.slug, r.seoTitle, r.id]
      );
      console.log(`  ✓ ${r.old} (${r.oldSlug}) → ${r.newName}`);
    } else {
      console.log(`  · [dry] ${r.old} (${r.oldSlug}) → ${r.newName}`);
    }
  }
  if (APPLY) await client.query("COMMIT");
  console.log(`\n${APPLY ? `Renamed ${renames.length} product(s).` : `Dry run — ${renames.length} product(s) would be renamed.`}`);
  if (!APPLY) console.log("Re-run with --apply to write to the database.");
} catch (e) {
  if (APPLY) await client.query("ROLLBACK");
  console.error("FAILED, rolled back:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
