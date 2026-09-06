import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const updates: any = {};
    if (body.code !== undefined) updates.code = body.code.toUpperCase();
    if (body.type !== undefined) {
      if (body.type !== "PERCENTAGE" && body.type !== "FIXED") {
        return NextResponse.json({ error: "type must be PERCENTAGE or FIXED" }, { status: 400 });
      }
      updates.type = body.type;
    }
    if (body.value !== undefined) {
      if (typeof body.value !== "number" || body.value <= 0) {
        return NextResponse.json({ error: "value must be a positive number" }, { status: 400 });
      }
      const couponType = body.type || (await db.coupon.findUnique({ where: { id } }))?.type;
      if (couponType === "PERCENTAGE" && body.value > 100) {
        return NextResponse.json({ error: "percentage value cannot exceed 100" }, { status: 400 });
      }
      updates.value = body.value;
    }
    if (body.maxDiscountAmount !== undefined) updates.maxDiscountAmount = body.maxDiscountAmount;
    if (body.minOrderAmount !== undefined) updates.minOrderAmount = body.minOrderAmount;
    if (body.usageLimit !== undefined) updates.usageLimit = body.usageLimit;
    if (body.perCustomerLimit !== undefined) updates.perCustomerLimit = body.perCustomerLimit;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.startsAt !== undefined) updates.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const coupon = await db.coupon.update({
      where: { id },
      data: updates,
    });

    await logAdminAction({ action: "UPDATE", entity: "COUPON", entityId: id, details: { code: coupon.code, changes: Object.keys(updates) }, request });

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error("Coupon update error:", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    const existing = await db.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    // Check for active orders using this coupon
    const activeOrders = await db.order.count({
      where: { couponId: id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    });
    if (activeOrders > 0) {
      return NextResponse.json({ error: `Cannot delete coupon used by ${activeOrders} active order(s). Deactivate instead.` }, { status: 409 });
    }

    await db.coupon.delete({ where: { id } });
    await logAdminAction({ action: "DELETE", entity: "COUPON", entityId: id, details: { code: existing.code }, request });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Coupon delete error:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
