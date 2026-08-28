import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const Razorpay = require("razorpay");

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Payment provider is not configured");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    if (!orderId) return NextResponse.json({ error: "Order ID is required" }, { status: 400 });

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (order.paymentStatus === "COMPLETED" || order.paymentVerified) {
      return NextResponse.json({ error: "Order is already paid" }, { status: 409 });
    }

    const expectedAmount = Number(order.total);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return NextResponse.json({ error: "Invalid order amount" }, { status: 409 });
    }

    if (order.payment?.razorpayOrderId && Number(order.payment.amount) === expectedAmount && order.payment.status !== "FAILED") {
      return NextResponse.json({
        razorpayOrderId: order.payment.razorpayOrderId,
        amount: Math.round(expectedAmount * 100),
        currency: order.payment.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(expectedAmount * 100),
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: order.id, orderNumber: order.orderNumber },
    });

    await db.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { orderId: order.id },
        create: { orderId: order.id, razorpayOrderId: razorpayOrder.id, amount: expectedAmount, currency: "INR", status: "PROCESSING" },
        update: { razorpayOrderId: razorpayOrder.id, amount: expectedAmount, currency: "INR", status: "PROCESSING", razorpayPaymentId: null, razorpaySignature: null },
      });
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PROCESSING" } });
    });

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
