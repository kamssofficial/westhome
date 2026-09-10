import pg from "pg";

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for the size variant seed");
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  query_timeout: 60000,
});

const SIZES = [
  { name: "Small", price: 499 },
  { name: "Medium", price: 699 },
  { name: "Large", price: 899 },
];

try {
  await client.connect();

  const category = await client.query(`SELECT id FROM "Category" WHERE slug = 'laundry'`);
  if (category.rowCount === 0) {
    console.log("Laundry category not found; skipping size variant seed.");
    process.exit(0);
  }
  const categoryId = category.rows[0].id;

  const products = await client.query(
    `SELECT p.id, p.name, p."stockQuantity"
     FROM "Product" p
     WHERE p."categoryId" = $1
       AND p.name ILIKE '%basket%'
       AND NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id)`,
    [categoryId]
  );

  if (products.rowCount === 0) {
    console.log("No laundry basket products without variants; size variant seed is a no-op.");
    process.exit(0);
  }

  let created = 0;
  for (const product of products.rows) {
    await client.query("BEGIN");

    const sizeAttr = await client.query(
      `INSERT INTO "VariantAttribute" (id, "productId", name, type, position)
       VALUES ($1, $2, 'Size', 'TEXT', 0)
       ON CONFLICT ("productId", "name") DO NOTHING
       RETURNING id`,
      [crypto.randomUUID(), product.id]
    );
    const sizeAttrId =
      sizeAttr.rowCount > 0
        ? sizeAttr.rows[0].id
        : (
            await client.query(
              `SELECT id FROM "VariantAttribute" WHERE "productId" = $1 AND name = 'Size'`,
              [product.id]
            )
          ).rows[0].id;

    const baseStock = Math.max(0, Math.floor(product.stockQuantity ?? 0));
    const perSize = Math.floor(baseStock / SIZES.length);

    let position = 0;
    for (const size of SIZES) {
      const variant = await client.query(
        `INSERT INTO "ProductVariant" (id, "productId", name, price, "stockQuantity", "isActive", position)
         VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING id`,
        [crypto.randomUUID(), product.id, size.name, size.price, perSize, position]
      );

      await client.query(
        `INSERT INTO "VariantAttributeValue" (id, "variantAttributeId", "variantId", value, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), sizeAttrId, variant.rows[0].id, size.name, position]
      );

      position++;
      created++;
    }

    await client.query("COMMIT");
    console.log(`Seeded S/M/L for "${product.name}" (${product.id})`);
  }

  console.log(`Size variant seed completed: ${created} variants created across ${products.rowCount} products.`);
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // The original error is the actionable failure.
  }
  console.error("Size variant seed failed.", error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}