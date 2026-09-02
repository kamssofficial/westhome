import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, orderId } = await request.json();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay is not configured on the server" }, { status: 503 });
    }

    if (orderId) {
      const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true, userId: true, total: true } });
      if (!order || order.userId !== (session.user as any).id) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (Math.abs(Number(order.total) - numericAmount) > 0.01) {
        return NextResponse.json({ error: "Payment amount does not match order total" }, { status: 400 });
      }
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const receipt = orderId ? `wh_${orderId.slice(-12)}` : `wh_${Date.now()}`;
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(numericAmount * 100),
      currency: "INR",
      receipt,
      notes: orderId ? { westhomeOrderId: orderId } : undefined,
    });

    return NextResponse.json({ id: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency, keyId });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 500 });
  }
}