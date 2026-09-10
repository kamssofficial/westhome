import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { code, subtotal, userId } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const coupon = await db.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: "This coupon is no longer active" }, { status: 400 });
    }

    if (coupon.startsAt && coupon.startsAt > new Date()) {
      return NextResponse.json({ error: "This coupon is not yet valid" }, { status: 400 });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "This coupon has expired" }, { status: 400 });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "This coupon has reached its usage limit" }, { status: 400 });
    }

    if (typeof userId === "string" && userId && coupon.perCustomerLimit != null) {
      const used = await db.couponUsage.count({ where: { couponId: coupon.id, userId } });
      if (used >= coupon.perCustomerLimit) {
        return NextResponse.json({ error: "You have already used this coupon" }, { status: 400 });
      }
    }

    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      return NextResponse.json(
        { error: `Minimum order value for this coupon is ₹${coupon.minOrderAmount}` },
        { status: 400 }
      );
    }

    let discount = 0;
    if (coupon.type === "PERCENTAGE") {
      discount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, Number(coupon.maxDiscountAmount));
      }
    } else {
      discount = Number(coupon.value);
    }

    discount = Math.min(discount, subtotal);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      discount,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
