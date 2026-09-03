import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/apiAuth";

export async function GET() {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("Coupons GET error:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    // Validate coupon values
    if (!body.code || !body.type || body.value === undefined) {
      return NextResponse.json({ error: "code, type, and value are required" }, { status: 400 });
    }
    if (body.type !== "PERCENTAGE" && body.type !== "FIXED") {
      return NextResponse.json({ error: "type must be PERCENTAGE or FIXED" }, { status: 400 });
    }
    if (typeof body.value !== "number" || body.value <= 0) {
      return NextResponse.json({ error: "value must be a positive number" }, { status: 400 });
    }
    if (body.type === "PERCENTAGE" && body.value > 100) {
      return NextResponse.json({ error: "percentage value cannot exceed 100" }, { status: 400 });
    }

    const coupon = await db.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        type: body.type,
        value: body.value,
        maxDiscountAmount: body.maxDiscountAmount,
        minOrderAmount: body.minOrderAmount,
        usageLimit: body.usageLimit,
        perCustomerLimit: body.perCustomerLimit,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
