import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/apiAuth";

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
    if (body.type !== undefined) updates.type = body.type;
    if (body.value !== undefined) updates.value = body.value;
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

    await db.coupon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Coupon delete error:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
