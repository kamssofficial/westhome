import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

export async function GET() {
  const authResult = await requireAdminOrManager();
  if (authResult.error) return authResult.error;

  try {
    // Hide accounts that were deleted through an older soft-delete flow
    // (anonymized emails like "deleted_..." with name "Deleted Customer")
    const customers = await db.user.findMany({
      where: {
OR: [
          { role: "CUSTOMER" },
          { orders: { some: {} } }
        ],
        NOT: { name: "Deleted Customer", isActive: false },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Purge leftover soft-deleted accounts once (legacy cleanup)
    const legacyDeleted = await db.user.findMany({
      where: {
        role: "CUSTOMER",
        name: "Deleted Customer",
        isActive: false,
      },
      select: { id: true, email: true },
    });

    if (legacyDeleted.length > 0) {
      // Best-effort: a failed cleanup must never break listing customers
      try {
        await db.$transaction(async (tx) => {
          for (const u of legacyDeleted) {
            await tx.review.deleteMany({ where: { userId: u.id } });
            await tx.couponUsage.deleteMany({ where: { userId: u.id } });
            await tx.order.updateMany({ where: { userId: u.id }, data: { userId: null } });
            await tx.analyticsEvent.updateMany({ where: { userId: u.id }, data: { userId: null } });
            await tx.user.delete({ where: { id: u.id } });
          }
        });

        for (const u of legacyDeleted) {
          await logAdminAction({
            action: "DELETE",
            entity: "USER",
            entityId: u.id,
            details: { email: u.email, legacyCleanup: true },
          });
        }
      } catch (cleanupError) {
        console.error("Legacy customer cleanup failed:", cleanupError);
      }
    }

    return NextResponse.json({
      customers: customers.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        orders: c._count.orders,
      })),
    });
  } catch (error) {
    console.error("Customers API error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
