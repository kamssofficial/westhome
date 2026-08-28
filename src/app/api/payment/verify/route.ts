import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { notifyLowStock } from "@/lib/notifications";
import { requireAuth } from "@/lib/auth";

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
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      return NextResponse.json({ error: "Payment verification fields are required" }, { status: 400 });
    }

    const existingOrder = await db.order.findUnique({ where: { id: orderId }, include: { payment: true, items: true } });
    if (!existingOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (existingOrder.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existingOrder.paymentVerified && existingOrder.paymentId === razorpayPaymentId) {
      return NextResponse.json({ verified: true, message: "Payment already verified" });
    }
    if (!existingOrder.payment || existingOrder.payment.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: "Payment does not match this order" }, { status: 400 });
    }

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
          const updated = await tx.product.updateMany({ where: { id: item.productId, OR: [{ trackInventory: false }, { stockQuantity: { gte: item.quantity } }] }, data: { stockQuantity: { decrement: item.quantity } } });
          if (updated.count !== 1) throw new Error("Insufficient stock");
        }
      }

      await tx.payment.update({ where: { orderId }, data: { razorpayPaymentId, razorpaySignature, status: "COMPLETED" } });
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
