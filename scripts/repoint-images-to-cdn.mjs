#!/usr/bin/env node
// Move product/category image URLs between the app's own proxy and Google's CDN.
//
//   node --env-file=.env scripts/repoint-images-to-cdn.mjs            # dry run
//   node --env-file=.env scripts/repoint-images-to-cdn.mjs --apply    # write
//   node --env-file=.env scripts/repoint-images-to-cdn.mjs --revert   # undo from the manifest
//
// WHY THE PROXY FORM IS PREFERRED: /api/images/<driveFileId> streams bytes
// through a serverless function, and those bytes counted as Vercel Fast Origin
// Transfer — the fair-use metric that soft-blocked this project. But Google
// rate-limits anonymous hotlinks to the CDN form: during a real page load it
// answers 429 with a text/html body, and the browser discards that non-image
// cross-origin response as opaque (ERR_BLOCKED_BY_ORB), so the image silently
// never renders. The proxy is the shape the rest of the app is built around (see
// src/lib/categoryImages.ts) and it now falls back to fetching the CDN copy
// server-side when Drive credentials are unavailable, so prefer it.
//
// SAFE: the rewrite is a pure function of the file id, so it is exactly
// reversible, and --apply writes a manifest naming every row it changed.
//
// DELIBERATELY NOT TOUCHED:
//   * ids containing "/" — legacy local paths like /api/images/banners/x.png,
//     which are served off disk and must stay where they are.
//   * ProductImage rows for `cushion-cover*` products — resolveProductImage()
//     prefers a committed /collections asset for those, and moving them would
//     change which image the grid shows.
//   * OrderItem.image — a historical snapshot of what a customer bought.
import fs from "fs";
import path from "path";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const manifestFlag = process.argv.indexOf("--manifest");
const MANIFEST_PATH = path.resolve(
  process.cwd(),
  manifestFlag === -1 ? "tmp/image-url-repoint.json" : process.argv[manifestFlag + 1],
);

const PREFIX = "/api/images/";
const CDN = "https://lh3.googleusercontent.com/d/";

/** The one and only transform: proxy path -> CDN url. */
function toCdn(url) {
  if (typeof url !== "string" || !url.startsWith(PREFIX)) return null;
  const id = url.slice(PREFIX.length);
  if (!id || id.includes("/")) return null;
  return CDN + id;
}

// Each target names its table and column, so both directions can be built from
// one definition instead of a separate callback per direction.
const targets = [
  {
    label: "ProductImage.url (excluding cushion-cover products)",
    table: "ProductImage",
    column: "url",
    select: `
      SELECT pi.id, pi.url
      FROM "ProductImage" pi
      JOIN "Product" p ON p.id = pi."productId"
      WHERE pi.url LIKE '${PREFIX}%'
        AND p.slug NOT LIKE 'cushion-cover%'
    `,
  },
  {
    label: "CategoryImage.url",
    table: "CategoryImage",
    column: "url",
    select: `SELECT id, url FROM "CategoryImage" WHERE url LIKE '${PREFIX}%'`,
  },
  {
    label: "Category.image",
    table: "Category",
    column: "image",
    select: `SELECT id, image AS url FROM "Category" WHERE image LIKE '${PREFIX}%'`,
  },
];

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await client.connect();

/**
 * Set one column for every row in a single statement rather than a round trip
 * per row. With `guard` set, a row is only written when it still holds `current`,
 * so a revert cannot clobber an image someone edited in the admin since.
 */
async function updateMany(table, column, rows, guard = false) {
  if (rows.length === 0) return 0;
  const width = guard ? 3 : 2;
  const tuple = (i) =>
    `(${Array.from({ length: width }, (_, c) => `$${i * width + c + 1}::text`).join(", ")})`;
  const params = rows.flatMap((r) => (guard ? [r.id, r.current, r.value] : [r.id, r.value]));
  const { rowCount } = await client.query(
    `UPDATE "${table}" AS t SET "${column}" = v.value
     FROM (VALUES ${rows.map((_, i) => tuple(i)).join(", ")})
       AS v(${guard ? "id, current, value" : "id, value"})
     WHERE t.id = v.id${guard ? ` AND t."${column}" = v.current` : ""}`,
    params,
  );
  return rowCount;
}

if (REVERT) {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`No manifest at ${MANIFEST_PATH} — pass --manifest <path>.`);
    process.exit(1);
  }
  const { changes = [] } = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const byLabel = new Map(targets.map((t) => [t.label, t]));

  const grouped = new Map();
  for (const change of changes) {
    const target = byLabel.get(change.table);
    if (target) grouped.set(target, [...(grouped.get(target) ?? []), change]);
  }

  let restored = 0;
  for (const [target, list] of grouped) {
    const n = await updateMany(
      target.table,
      target.column,
      list.map((c) => ({ id: c.id, current: c.to, value: c.from })),
      true,
    );
    restored += n;
    console.log(`${target.label}: ${n} of ${list.length} rows restored`);
  }
  console.log(`\nreverted ${restored} of ${changes.length} recorded rows -> ${MANIFEST_PATH}`);
} else {
  if (APPLY) {
    console.warn(
      "Applying the CDN form: Drive hotlinks are rate-limited and the browser " +
        "blocks the non-image response, so these images may stop rendering. " +
        "Keep the manifest to undo with --revert.\n",
    );
  }

  // What we are skipping, so it shows up in the output rather than being silent.
  const skipped = await client.query(
    `SELECT COUNT(*)::int AS n FROM "ProductImage" pi
     JOIN "Product" p ON p.id = pi."productId"
     WHERE pi.url LIKE '${PREFIX}%' AND p.slug LIKE 'cushion-cover%'`,
  );
  const skippedOrder = await client.query(
    `SELECT COUNT(*)::int AS n FROM "OrderItem" WHERE image LIKE '${PREFIX}%'`,
  );

  const manifest = { startedAt: new Date().toISOString(), applied: APPLY, changes: [] };

  for (const target of targets) {
    const { rows } = await client.query(target.select);
    const convertible = rows
      .map((row) => ({ id: row.id, from: row.url, to: toCdn(row.url) }))
      .filter((row) => row.to);
    console.log(`${target.label}: ${rows.length} matched, ${convertible.length} convertible`);

    if (APPLY && convertible.length) {
      await client.query("BEGIN");
      try {
        await updateMany(
          target.table,
          target.column,
          convertible.map((row) => ({ id: row.id, value: row.to })),
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    manifest.changes.push(...convertible.map((row) => ({ table: target.label, ...row })));
  }

  console.log(`\nskipped: cushion-cover product images = ${skipped.rows[0].n}`);
  console.log(`skipped: OrderItem.image snapshots    = ${skippedOrder.rows[0].n}`);
  console.log(
    `total rewritten: ${APPLY ? manifest.changes.length : 0} ` +
      `(dry run found ${manifest.changes.length} rows)`,
  );

  if (APPLY) {
    fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`manifest (for exact revert) -> ${MANIFEST_PATH}`);
  }

  // Remaining proxy references, per column, so the effect is visible.
  console.log("\nremaining proxied rows after this run:");
  for (const target of [...targets, { label: "OrderItem.image", table: "OrderItem", column: "image" }]) {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM "${target.table}" WHERE "${target.column}" LIKE '${PREFIX}%'`,
    );
    console.log(`  ${target.table}.${target.column}: ${rows[0].n}`);
  }
}

await client.end();
