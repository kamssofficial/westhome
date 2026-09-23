import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { notifyLowStock, createNotification } from "@/lib/notifications";
import { auth } from "@/lib/auth";
import { verifyGuestClaimToken } from "@/lib/guestOrder";

async function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const { default: Razorpay } = await import("razorpay");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function verifyPaymentOnce(params: { orderId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; userId: string | null }) {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, userId } = params;
  const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  const sigBuffer = Buffer.from(razorpaySignature || "", "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) throw new Error("Payment signature verification failed");

  const razorpay = await getRazorpay();
  if (!razorpay) throw new Error("Payment is not configured");
  const [rpOrder, rpPayment] = await Promise.all([razorpay.orders.fetch(razorpayOrderId), razorpay.payments.fetch(razorpayPaymentId)]);

  const expectedOrder = await db.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!expectedOrder) throw new Error("Forbidden");
  if (userId !== null && expectedOrder.userId !== userId) throw new Error("Forbidden");
  if (userId === null && expectedOrder.userId !== null) throw new Error("Forbidden");
  if (!expectedOrder.payment) throw new Error("Payment record not found");
  if (expectedOrder.payment.razorpayOrderId !== razorpayOrderId) throw new Error("Razorpay order does not match this order");
  if (rpOrder.receipt !== expectedOrder.orderNumber) throw new Error("Razorpay receipt does not match this order");

  const expectedPaise = Math.round(Number(expectedOrder.total) * 100);
  if (Number(rpOrder.amount) !== expectedPaise || Number(rpPayment.amount) !== expectedPaise) throw new Error("Payment amount mismatch");
  if (rpOrder.currency !== "INR" || rpPayment.currency !== "INR") throw new Error("Payment currency mismatch");
  if (rpPayment.order_id !== razorpayOrderId) throw new Error("Payment is not attached to the expected Razorpay order");
  if (rpPayment.status !== "captured") throw new Error(`Payment is not captured (status: ${rpPayment.status})`);

  return db.$transaction(async (tx) => {
    const freshOrder = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true } });
    if (!freshOrder || freshOrder.userId !== userId) throw new Error("Forbidden");
    if (freshOrder.paymentStatus === "COMPLETED" && freshOrder.paymentId) return null;
    if (!freshOrder.payment || freshOrder.payment.razorpayOrderId !== razorpayOrderId) throw new Error("Payment record does not match Razorpay order");

    for (const item of freshOrder.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId }, select: { trackInventory: true, allowBackorder: true, isActive: true } });
      if (!product || !product.isActive) throw new Error(`Product ${item.productName} is no longer available`);

      // Stock 0 is un-buyable regardless of trackInventory/allowBackorder:
      // these conditional updates only match when enough stock exists.
      if (item.variantId) {
        const result = await tx.productVariant.updateMany({ where: { id: item.variantId, isActive: true, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
        if (result.count !== 1) throw new Error(`Out of stock: ${item.productName}${item.variantName ? ` (${item.variantName})` : ""}`);
      } else {
        const result = await tx.product.updateMany({ where: { id: item.productId, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
        if (result.count !== 1) throw new Error(`Out of stock: ${item.productName}`);
      }
    }

    if (freshOrder.couponId && freshOrder.userId) {
      const coupon = await tx.coupon.findUnique({ where: { id: freshOrder.couponId } });
      if (!coupon || !coupon.isActive) throw new Error("Coupon is no longer available");
      if (coupon.perCustomerLimit != null) {
        const customerUsage = await tx.couponUsage.count({ where: { couponId: coupon.id, userId: freshOrder.userId } });
        if (customerUsage >= coupon.perCustomerLimit) throw new Error("Coupon per-customer usage limit reached");
      }
      const couponUpdate = await tx.coupon.updateMany({ where: { id: coupon.id, isActive: true, ...(coupon.usageLimit != null ? { usedCount: { lt: coupon.usageLimit } } : {}) }, data: { usedCount: { increment: 1 } } });
      if (couponUpdate.count !== 1) throw new Error("Coupon usage limit reached");
      await tx.couponUsage.create({ data: { couponId: coupon.id, userId: freshOrder.userId, orderId: freshOrder.id } });
    }

    await tx.order.update({ where: { id: orderId }, data: { paymentId: razorpayPaymentId, paymentStatus: "COMPLETED", paymentVerified: true, status: "CONFIRMED", statusHistory: { create: { status: "CONFIRMED", note: "Payment verified and captured; inventory and coupon usage committed atomically" } } } });
    await tx.payment.update({ where: { orderId }, data: { razorpayOrderId, razorpayPaymentId, razorpaySignature, status: "COMPLETED", method: rpPayment.method || undefined } });
    return freshOrder;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
}

export async function POST(request: NextRequest) {
  try {
    // Guests (userId null) verify with the per-order claim token; signed-in
    // customers verify through their session.
    const session = await auth().catch(() => null);
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, guestClaimToken, guestPhone } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });

    const existingOrder = await db.order.findUnique({ where: { id: orderId }, select: { userId: true, customerPhone: true, paymentStatus: true, paymentId: true } });
    if (!existingOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    let verifyingUserId: string | null;
    if (existingOrder.userId) {
      if (!session?.user || existingOrder.userId !== (session.user as any).id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      verifyingUserId = existingOrder.userId;
    } else {
      const tokenOk = verifyGuestClaimToken(orderId, guestClaimToken);
      const phoneOk = typeof guestPhone === "string" && guestPhone.replace(/\D/g, "").slice(-10).length === 10 && existingOrder.customerPhone.replace(/\D/g, "").endsWith(guestPhone.replace(/\D/g, "").slice(-10));
      if (!tokenOk || !phoneOk) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      verifyingUserId = null;
    }
    if (existingOrder.paymentStatus === "COMPLETED" && existingOrder.paymentId === razorpay_payment_id) return NextResponse.json({ verified: true, message: "Payment already verified" });

    let processedOrder;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        processedOrder = await verifyPaymentOnce({ orderId, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, userId: verifyingUserId });
        break;
      } catch (error) {
        if ((error as { code?: string } | null)?.code === "P2034" && attempt < 2) continue;
        throw error;
      }
    }
    if (!processedOrder) return NextResponse.json({ verified: true, message: "Payment already verified" });

    // Notify staff that payment was received
    createNotification({
      type: "PAYMENT_SUCCESS",
      title: "Payment Received",
      message: `Payment verified for order ${processedOrder.orderNumber}`,
      orderId: processedOrder.id,
    }).catch(() => {});

    // Real PURCHASE analytics event (server-side, so it cannot be blocked by
    // the browser and fires exactly once per verified payment)
    db.analyticsEvent.create({
      data: {
        eventType: "PURCHASE",
        sessionId: ("order_" + processedOrder.id).slice(0, 100),
        userId: processedOrder.userId,
        productId: processedOrder.items[0]?.productId || null,
        metadata: { orderId: processedOrder.id, orderNumber: processedOrder.orderNumber, total: Number(processedOrder.total), itemCount: processedOrder.items.length },
      },
    }).catch(() => {});

    for (const item of processedOrder.items) {
      try {
        const product = await db.product.findUnique({ where: { id: item.productId }, select: { id: true, name: true, stockQuantity: true, trackInventory: true, lowStockThreshold: true } });
        if (product?.trackInventory && product.stockQuantity <= product.lowStockThreshold) notifyLowStock(product.id, product.name, product.stockQuantity).catch(() => {});
      } catch {}
    }
    return NextResponse.json({ verified: true, message: "Payment verified successfully" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("Unauthorized")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg.includes("Forbidden")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (/Insufficient stock|Coupon|Payment amount|currency|captured|does not match|not available|Payment signature/.test(msg)) return NextResponse.json({ error: msg }, { status: 400 });
    console.error("Payment verification error:", msg);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
