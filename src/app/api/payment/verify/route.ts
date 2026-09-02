import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { notifyLowStock } from "@/lib/notifications";
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
    const razorpayOrderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id.trim() : "";
    const razorpayPaymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id.trim() : "";
    const razorpaySignature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature.trim() : "";
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) return NextResponse.json({ error: "Payment verification fields are required" }, { status: 400 });

    const existingOrder = await db.order.findUnique({ where: { id: orderId }, include: { payment: true, items: true } });
    if (!existingOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (existingOrder.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existingOrder.paymentVerified && existingOrder.paymentId === razorpayPaymentId) return NextResponse.json({ verified: true, message: "Payment already verified" });
    if (!existingOrder.payment || existingOrder.payment.razorpayOrderId !== razorpayOrderId) return NextResponse.json({ error: "Payment does not match this order" }, { status: 400 });

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: "Payment provider is not configured" }, { status: 503 });
    const expectedSignature = crypto.createHmac("sha256", secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
    const sigBuffer = Buffer.from(razorpaySignature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const isAuthentic = sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    if (!isAuthentic) {
      await db.$transaction(async (tx) => {
        await tx.payment.updateMany({ where: { orderId, razorpayOrderId }, data: { status: "FAILED" } });
        await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "FAILED", status: "PAYMENT_FAILED", statusHistory: { create: { status: "PAYMENT_FAILED", note: "Payment signature verification failed" } } } });
      });
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // Signature validation alone does not prove the paid amount. Verify the Razorpay payment server-side.
    const razorpayPayment = await getRazorpay().payments.fetch(razorpayPaymentId);
    const expectedAmount = Math.round(Number(existingOrder.total) * 100);
    if (razorpayPayment.order_id !== razorpayOrderId || Number(razorpayPayment.amount) !== expectedAmount || razorpayPayment.currency !== "INR" || razorpayPayment.status !== "captured") {
      return NextResponse.json({ error: "Payment amount or status does not match this order" }, { status: 400 });
    }

    const lowStock: Array<{ id: string; name: string; stockQuantity: number }> = [];
    await db.$transaction(async (tx) => {
      const lockedOrder = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!lockedOrder) throw new Error("Order not found");
      if (lockedOrder.paymentVerified) return;
      for (const item of lockedOrder.items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { stockQuantity: true } });
          if (!variant) throw new Error("Variant not found");
          const updated = await tx.productVariant.updateMany({ where: { id: item.variantId, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
          if (updated.count !== 1) throw new Error("Insufficient stock");
        } else {
          const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stockQuantity: true, trackInventory: true, allowBackorder: true } });
          if (!product) throw new Error("Product not found");
          if (!product.trackInventory) continue;
          if (!product.allowBackorder && product.stockQuantity < item.quantity) throw new Error("Insufficient stock");
          if (product.stockQuantity >= item.quantity) await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { decrement: item.quantity } } });
          else if (product.allowBackorder) await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: 0 } });
        }
      }
      await tx.payment.update({ where: { orderId }, data: { razorpayPaymentId, razorpaySignature, status: "COMPLETED", method: razorpayPayment.method || null } });
      await tx.order.update({ where: { id: orderId }, data: { paymentId: razorpayPaymentId, paymentStatus: "COMPLETED", paymentVerified: true, status: "CONFIRMED", statusHistory: { create: { status: "CONFIRMED", note: "Payment verified and order confirmed" } } } });
      if (lockedOrder.couponId) {
        await tx.coupon.update({ where: { id: lockedOrder.couponId }, data: { usedCount: { increment: 1 } } });
        if (lockedOrder.userId) await tx.couponUsage.create({ data: { couponId: lockedOrder.couponId, userId: lockedOrder.userId, orderId } });
      }
    });

    for (const item of existingOrder.items) {
      const product = await db.product.findUnique({ where: { id: item.productId }, select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true, trackInventory: true } });
      if (product && product.trackInventory && product.stockQuantity <= product.lowStockThreshold) lowStock.push({ id: product.id, name: product.name, stockQuantity: product.stockQuantity });
    }
    for (const product of lowStock) notifyLowStock(product.id, product.name, product.stockQuantity).catch((error) => console.error("Low-stock notification failed", error));
    return NextResponse.json({ verified: true, message: "Payment verified successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Payment verification error:", error);
    const message = error instanceof Error && error.message === "Insufficient stock" ? "Insufficient stock" : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: message === "Insufficient stock" ? 409 : 500 });
  }
}
