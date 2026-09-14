#!/usr/bin/env node
/**
 * activate-all-products.mjs
 *
 * Standalone script that connects to the database via Prisma 7 (driver adapter)
 * and bulk-activates all DRAFT / INACTIVE products so they become
 * visible on the storefront.
 *
 * Usage:
 *   node scripts/activate-all-products.mjs              # activate all (excludes ARCHIVED)
 *   node scripts/activate-all-products.mjs --include-archived   # also activate ARCHIVED
 *   node scripts/activate-all-products.mjs --dry-run     # show counts without writing
 *
 * Requires DATABASE_URL in .env or environment.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const includeArchived = args.includes("--include-archived");

async function main() {
  console.log("━━━ Product Visibility Diagnostic ━━━\n");

  // 1. Count by status × isActive
  const [total, counts] = await Promise.all([
    prisma.product.count(),
    Promise.all([
      prisma.product.count({ where: { status: "ACTIVE", isActive: true } }),
      prisma.product.count({ where: { status: "ACTIVE", isActive: false } }),
      prisma.product.count({ where: { status: "DRAFT", isActive: true } }),
      prisma.product.count({ where: { status: "DRAFT", isActive: false } }),
      prisma.product.count({ where: { status: "INACTIVE", isActive: true } }),
      prisma.product.count({ where: { status: "INACTIVE", isActive: false } }),
      prisma.product.count({ where: { status: "ARCHIVED", isActive: true } }),
      prisma.product.count({ where: { status: "ARCHIVED", isActive: false } }),
    ]),
  ]);

  const [activeTrue, activeFalse, draftTrue, draftFalse, inactiveTrue, inactiveFalse, archivedTrue, archivedFalse] = counts;

  const visible = activeTrue;

  console.log(`  Total products:            ${total}`);
  console.log(`  Visible on storefront:     ${visible}`);
  console.log(`  Hidden from storefront:    ${total - visible}\n`);

  console.log("  Breakdown:");
  console.log(`    ACTIVE  + isActive=true:   ${activeTrue}   ✅ visible`);
  console.log(`    ACTIVE  + isActive=false:  ${activeFalse}  ❌ hidden`);
  console.log(`    DRAFT   + isActive=true:   ${draftTrue}   ❌ hidden`);
  console.log(`    DRAFT   + isActive=false:  ${draftFalse}  ❌ hidden`);
  console.log(`    INACTIVE+ isActive=true:   ${inactiveTrue}   ❌ hidden`);
  console.log(`    INACTIVE+ isActive=false:  ${inactiveFalse}  ❌ hidden`);
  console.log(`    ARCHIVED+ isActive=true:   ${archivedTrue}   🔒 archived`);
  console.log(`    ARCHIVED+ isActive=false:  ${archivedFalse}  🔒 archived\n`);

  // 2. Build fixable set
  const fixWhere = includeArchived
    ? { NOT: [{ status: "ACTIVE", isActive: true }] }
    : { NOT: [{ status: "ACTIVE", isActive: true }, { status: "ARCHIVED" }] };

  const fixableCount = await prisma.product.count({ where: fixWhere });

  console.log(`  Products to activate:      ${fixableCount}${includeArchived ? " (including archived)" : " (excluding archived)"}`);

  if (fixableCount === 0) {
    console.log("\n  ✅ All products are already visible. Nothing to do.\n");
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log("\n  ⚠️  Dry run — no changes made.\n");
    await prisma.$disconnect();
    return;
  }

  // 3. Apply fix
  console.log("\n  Activating products...");
  const result = await prisma.product.updateMany({
    where: fixWhere,
    data: { status: "ACTIVE", isActive: true },
  });

  console.log(`  ✅ Updated ${result.count} product(s).\n`);

  // 4. Verify
  const afterVisible = await prisma.product.count({ where: { status: "ACTIVE", isActive: true } });
  console.log(`  Visible on storefront after fix: ${afterVisible} / ${total}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
