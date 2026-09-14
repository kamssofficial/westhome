import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

// GET – Diagnostic: count products by status × isActive breakdown
export async function GET() {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER"]);
  if (authResult.error) return authResult.error;

  const [total, activeAndActive, activeAndInactive, draftAndActive, draftAndInactive, inactiveAndActive, inactiveAndInactive, archivedAndActive, archivedAndInactive] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: "ACTIVE", isActive: true } }),
    db.product.count({ where: { status: "ACTIVE", isActive: false } }),
    db.product.count({ where: { status: "DRAFT", isActive: true } }),
    db.product.count({ where: { status: "DRAFT", isActive: false } }),
    db.product.count({ where: { status: "INACTIVE", isActive: true } }),
    db.product.count({ where: { status: "INACTIVE", isActive: false } }),
    db.product.count({ where: { status: "ARCHIVED", isActive: true } }),
    db.product.count({ where: { status: "ARCHIVED", isActive: false } }),
  ]);

  return NextResponse.json({
    total,
    visibleOnStorefront: activeAndActive,
    hiddenFromStorefront: total - activeAndActive,
    breakdown: {
      ACTIVE: { isActive_true: activeAndActive, isActive_false: activeAndInactive },
      DRAFT: { isActive_true: draftAndActive, isActive_false: draftAndInactive },
      INACTIVE: { isActive_true: inactiveAndActive, isActive_false: inactiveAndInactive },
      ARCHIVED: { isActive_true: archivedAndActive, isActive_false: archivedAndInactive },
    },
    // Products that need fixing (non-ACTIVE or isActive=false, excluding ARCHIVED)
    needsFix: {
      draftProducts: draftAndActive + draftAndInactive,
      inactiveProducts: inactiveAndActive + inactiveAndInactive,
      activeButInactive: activeAndInactive,
      totalFixable: draftAndActive + draftAndInactive + inactiveAndActive + inactiveAndInactive + activeAndInactive,
    },
  });
}

// PATCH – Bulk fix: activate all non-ARCHIVED products
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json().catch(() => ({}));
    const excludeArchived = body.excludeArchived !== false; // default: true

    const where: any = { NOT: { status: "ACTIVE", isActive: true } };
    if (excludeArchived) {
      where.NOT = [
        { status: "ACTIVE", isActive: true },
        { status: "ARCHIVED" },
      ];
    }

    const result = await db.product.updateMany({
      where,
      data: {
        status: "ACTIVE",
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `${result.count} product(s) activated (status → ACTIVE, isActive → true)`,
    });
  } catch (error) {
    console.error("Bulk activate error:", error);
    return NextResponse.json({ error: "Failed to activate products" }, { status: 500 });
  }
}
