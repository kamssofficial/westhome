import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// Razorpay initialization (lazy — keys are required at request time, not module load,
// so the build and dev server can start without production credentials)
const Razorpay = require("razorpay");

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { orderId, amount: requestedAmount } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Verify the order exists and belongs to the authenticated user
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // SECURITY: Ensure the order belongs to the authenticated user
    // Orders with null userId (guest) cannot be paid — require userId
    if (!order.userId) {
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }
    if (order.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // SECURITY: Always use server-side order total, never trust client amount
    const amount = Number(order.total);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    // Create Razorpay order
    const razorpay = getRazorpay();
    if (!razorpay) {
      return NextResponse.json(
        { error: "Payment is not configured. Please try again later." },
        { status: 503 }
      );
    }
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: "INR",
      receipt: order.orderNumber,
      notes: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    const msg = error?.message || "Unknown error";
    if (msg.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Payment creation error:", msg);
    return NextResponse.json(
      { error: "Failed to create payment", detail: msg },
      { status: 500 }
    );
  }
}
