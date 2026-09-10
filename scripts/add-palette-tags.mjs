// Extract each cushion cover product's color palette from its photos and store
// as ProductTag rows ("color:Rust", "color:Charcoal", …) — up to 3 per product,
// ordered by prominence. These power homepage swatches.
// Also creates real selectable Color variants for SKU 4353 (the only product
// whose photos are genuinely the same design in 2 colorways).
//
// Usage:  node scripts/add-palette-tags.mjs            # dry run
//         node scripts/add-palette-tags.mjs --apply    # write to DB
import pg from "pg";
import { readFileSync } from "fs";
import path from "path";
import sharp from "sharp";

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

// Named palette (label + representative hex for swatch rendering)
const NAMED = [
  ["Charcoal", [40, 40, 40]], ["Black", [20, 20, 20]], ["Grey", [130, 130, 130]],
  ["Slate", [95, 105, 115]], ["Cream", [235, 230, 218]], ["Ivory", [240, 236, 226]],
  ["Blush", [222, 176, 168]], ["Rose", [200, 140, 140]], ["Rust", [170, 95, 55]],
  ["Terracotta", [185, 110, 70]], ["Amber", [200, 150, 70]], ["Gold", [190, 155, 80]],
  ["Tan", [190, 150, 110]], ["Beige", [215, 195, 165]], ["Olive", [120, 125, 80]],
  ["Indigo", [70, 80, 130]], ["Navy", [40, 50, 90]], ["Maroon", [120, 45, 50]],
];

function nearestName([r, g, b]) {
  let best = NAMED[0], bestD = Infinity;
  for (const n of NAMED) {
    const d = (r - n[1][0]) ** 2 + (g - n[1][1]) ** 2 + (b - n[1][2]) ** 2;
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

async function palette(file, n = 3) {
  const { data } = await sharp(file).resize(48, 48).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const k = `${Math.round(data[i] / 30) * 30},${Math.round(data[i + 1] / 30) * 30},${Math.round(data[i + 2] / 30) * 30}`;
    buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  const top = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const total = top.reduce((s, e) => s + e[1], 0);
  return top.map(([k, c]) => {
    const [r, g, b] = k.split(",").map(Number);
    const weight = c / total;
    // skip near-white backgrounds unless nothing else
    return { rgb: [r, g, b], weight };
  }).filter(e => !(e.rgb[0] > 235 && e.rgb[1] > 235 && e.rgb[2] > 230) || e.weight > 0.6)
    .map(e => ({ ...e, name: nearestName(e.rgb)[0], hex: nearestName(e.rgb)[1].map(v => v.toString(16).padStart(2, "0")).join("") }));
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await client.connect();

const { rows: products } = await client.query(`
  SELECT p.id, p.slug, p.sku,
    (SELECT ARRAY_AGG(pi.url ORDER BY pi."isPrimary" DESC, pi.position) FROM "ProductImage" pi
     WHERE pi."productId" = p.id AND pi.url LIKE '/%') AS imgs
  FROM "Product" p
  WHERE p."subcategoryId" = 'cmt62yna1000aj4v1hdeait49' AND p."isActive"`);

let updated = 0;
for (const p of products) {
  if (!p.imgs?.length) continue;
  // Palette = merged top colors across up to first 3 photos
  const seen = new Map();
  for (const u of p.imgs.slice(0, 3)) {
    try {
      for (const c of await palette(path.join(process.cwd(), "public", u))) {
        if (!seen.has(c.name)) seen.set(c.name, c);
      }
    } catch { /* unreadable image — skip */ }
  }
  const tags = [...seen.values()].sort((a, b) => b.weight - a.weight).slice(0, 3);
  if (tags.length === 0) continue;
  if (APPLY) {
    // Replace existing color: tags only
    await client.query(`DELETE FROM "ProductTag" WHERE "productId" = $1 AND tag LIKE 'color:%'`, [p.id]);
    for (const t of tags) {
      await client.query(
        `INSERT INTO "ProductTag" (id, "productId", tag) VALUES (gen_random_uuid()::text, $1, $2)
         ON CONFLICT DO NOTHING`,
        [p.id, `color:${t.name}`]
      );
    }
  }
  console.log(`${APPLY ? "✓" : "·"} ${(p.sku || p.slug).padEnd(10)} ${tags.map(t => `${t.name}(#${t.hex})`).join(" ")}`);
  updated++;
}

// ── Real variants for 4353 (same design, 2 colorways confirmed by RMS 19) ──
const { rows: p4353 } = await client.query(`SELECT id, name FROM "Product" WHERE sku = '4353' LIMIT 1`);
if (p4353[0]) {
  const { rows: existingVariants } = await client.query(`SELECT count(*)::int AS n FROM "ProductVariant" WHERE "productId" = $1`, [p4353[0].id]);
  if (existingVariants[0].n === 0 && APPLY) {
    const { rows: imgs } = await client.query(`SELECT id, url FROM "ProductImage" WHERE "productId" = $1 ORDER BY "isPrimary" DESC, position`, [p4353[0].id]);
    const { rows: va } = await client.query(
      `INSERT INTO "VariantAttribute" (id, "productId", name, type, position) VALUES (gen_random_uuid()::text, $1, 'Color', 'COLOR', 0) RETURNING id`,
      [p4353[0].id]
    );
    const colorways = [
      { value: "Grey", hex: "#828282", img: imgs[0] },
      { value: imgs[1] ? "Charcoal" : null, hex: "#282828", img: imgs[1] || imgs[0] },
    ].filter(c => c.value);
    for (const [i, cw] of colorways.entries()) {
      const { rows: v } = await client.query(
        `INSERT INTO "ProductVariant" (id, "productId", name, price, "stockQuantity", "isActive", position)
         VALUES (gen_random_uuid()::text, $1, $2, 499, 3, true, $3) RETURNING id`,
        [p4353[0].id, `Color: ${cw.value}`, i]
      );
      await client.query(
        `INSERT INTO "VariantAttributeValue" (id, "variantAttributeId", "variantId", value, "colorCode", position)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
        [va[0].id, v[0].id, cw.value, cw.hex, i]
      );
      if (cw.img) await client.query(`INSERT INTO "VariantImage" (id, "variantId", url, alt, position, "isPrimary") VALUES (gen_random_uuid()::text, $1, $2, $3, 0, true)`, [v[0].id, cw.img.url, `${p4353[0].name} — ${cw.value}`]);
    }
    console.log(`✓ 4353: created ${colorways.length} Color variants (Grey, Charcoal) with per-variant images`);
  } else if (!APPLY) {
    console.log(`· 4353 would get 2 Color variants (Grey, Charcoal)`);
  }
}

console.log(`\n${APPLY ? `Updated ${updated} product(s) with palette tags.` : `Dry run — ${updated} product(s) would get palette tags.`}`);
await client.end();
