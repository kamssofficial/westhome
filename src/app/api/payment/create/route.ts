import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const { default: Razorpay } = await import("razorpay");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { orderId } = await request.json();
    if (!orderId) return NextResponse.json({ error: "Order ID is required" }, { status: 400 });

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!order.userId || order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.status === "CANCELLED" || order.status === "REFUNDED") {
      return NextResponse.json({ error: "This order cannot be paid" }, { status: 400 });
    }
    if (order.paymentStatus === "COMPLETED") {
      return NextResponse.json({ error: "Order is already paid" }, { status: 400 });
    }

    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const existingPayment = order.payment;
    if (existingPayment?.razorpayOrderId) {
      if (Math.round(Number(existingPayment.amount) * 100) !== Math.round(amount * 100)) {
        return NextResponse.json({ error: "Stored payment amount mismatch" }, { status: 409 });
      }
      return NextResponse.json({
        razorpayOrderId: existingPayment.razorpayOrderId,
        amount: Math.round(amount * 100),
        currency: existingPayment.currency || "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    const razorpay = await getRazorpay();
    if (!razorpay) {
      return NextResponse.json({ error: "Payment is not configured. Please try again later." }, { status: 503 });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: order.id, orderNumber: order.orderNumber },
    });

    if (!existingPayment) {
      await db.payment.create({
        data: {
          orderId: order.id,
          amount,
          currency: "INR",
          razorpayOrderId: razorpayOrder.id,
          status: "PENDING",
        },
      });
    } else {
      await db.payment.update({
        where: { orderId: order.id },
        data: {
          amount,
          currency: "INR",
          razorpayOrderId: razorpayOrder.id,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Payment creation error:", msg);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
