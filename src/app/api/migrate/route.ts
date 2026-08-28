import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST() {
  try {
    const results: string[] = [];

    // Step 1: Add averageRating and reviewCount columns if they don't exist
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE "Product" 
        ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0
      `);
      results.push("✓ Added averageRating and reviewCount columns");
    } catch (e: any) {
      results.push(`⚠ Columns may already exist: ${e.message}`);
    }

    // Step 2: Backfill averageRating and reviewCount from reviews
    try {
      await db.$executeRawUnsafe(`
        UPDATE "Product" p SET
          "averageRating" = COALESCE(
            (SELECT AVG(r.rating)::double precision
             FROM "Review" r
             WHERE r."productId" = p.id
             AND r.status = 'APPROVED'
            ), 0),
          "reviewCount" = COALESCE(
            (SELECT COUNT(*)::integer
             FROM "Review" r
             WHERE r."productId" = p.id
             AND r.status = 'APPROVED'
            ), 0)
      `);
      results.push("✓ Backfilled averageRating and reviewCount");
    } catch (e: any) {
      results.push(`⚠ Backfill error: ${e.message}`);
    }

    // Step 3: Add composite indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "Product_isActive_status_categoryId_createdAt_idx" ON "Product"("isActive", "status", "categoryId", "createdAt")',
      'CREATE INDEX IF NOT EXISTS "Product_isActive_status_isFeatured_createdAt_idx" ON "Product"("isActive", "status", "isFeatured", "createdAt")',
      'CREATE INDEX IF NOT EXISTS "Product_isActive_status_isNewArrival_createdAt_idx" ON "Product"("isActive", "status", "isNewArrival", "createdAt")',
      'CREATE INDEX IF NOT EXISTS "Product_isActive_status_isBestseller_createdAt_idx" ON "Product"("isActive", "status", "isBestseller", "createdAt")',
      'CREATE INDEX IF NOT EXISTS "Product_isActive_status_regularPrice_idx" ON "Product"("isActive", "status", "regularPrice")',
    ];

    for (const sql of indexes) {
      try {
        await db.$executeRawUnsafe(sql);
        const idxName = sql.match(/CREATE INDEX IF NOT EXISTS "(\w+)"/)?.[1] || "unknown";
        results.push(`✓ Created index: ${idxName}`);
      } catch (e: any) {
        results.push(`⚠ Index error: ${e.message}`);
      }
    }

    // Step 4: Verify
    const productCount = await db.product.count();
    const reviewCount = await db.$executeRawUnsafe(`SELECT COUNT(*)::integer as count FROM "Review" WHERE status = 'APPROVED'`);

    results.push(`✓ Total products: ${productCount}`);
    results.push("✓ Migration complete!");

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
