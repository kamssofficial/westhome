import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = await request.json();
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return NextResponse.json({ error: "Razorpay is not configured on the server" }, { status: 503 });

    const order = await db.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order || order.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpaySignature))) {
      await db.order.update({ where: { id: orderId }, data: { paymentStatus: "FAILED" } });
      if (order.payment) await db.payment.update({ where: { orderId }, data: { status: "FAILED", razorpayOrderId, razorpayPaymentId, razorpaySignature } });
      return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID", paymentMethod: "razorpay" } });
      await tx.payment.upsert({
        where: { orderId },
        update: { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount: order.total, method: "razorpay", status: "COMPLETED" },
        create: { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, amount: order.total, currency: "INR", method: "razorpay", status: "COMPLETED" },
      });
      await tx.notification.create({
        data: { type: "PAYMENT_SUCCESS", title: "Payment Received", message: `Razorpay payment received for order ${order.orderNumber}`, orderId, readBy: "[]" },
      });
    });

    return NextResponse.json({ verified: true, orderNumber: order.orderNumber });
  } catch (error) {
    console.error("Razorpay verification error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}