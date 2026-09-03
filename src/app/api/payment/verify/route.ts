import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { notifyLowStock } from "@/lib/notifications";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = await request.json();

    // SECURITY: Verify the order belongs to the authenticated user
    const existingOrder = await db.order.findUnique({ where: { id: orderId } });
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!existingOrder.userId) {
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }
    if (existingOrder.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    // SECURITY: Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(razorpay_signature || "", "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const isAuthentic =
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!isAuthentic) {
      // Payment verification failed
      await db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "FAILED",
          status: "PAYMENT_FAILED",
          statusHistory: {
            create: {
              status: "PAYMENT_FAILED",
              note: "Payment signature verification failed",
            },
          },
        },
      });

      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // IDEMPOTENCY: Check if this order was already processed
    const orderStatus = await db.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true, paymentId: true } });
    if (orderStatus?.paymentStatus === "COMPLETED" && orderStatus.paymentId) {
      return NextResponse.json({
        verified: true,
        message: "Payment already verified",
      });
    }

    // Payment is verified - update order
    await db.order.update({
      where: { id: orderId },
      data: {
        paymentId: razorpay_payment_id,
        paymentStatus: "COMPLETED",
        paymentVerified: true,
        status: "CONFIRMED",
        statusHistory: {
          create: {
            status: "CONFIRMED",
            note: "Payment verified and order confirmed",
          },
        },
      },
    });

    // Update payment record
    await db.payment.updateMany({
      where: { orderId },
      data: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "COMPLETED",
      },
    });

    // Update stock
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (order) {
      for (const item of order.items) {
        if (item.variantId) {
          await db.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        } else {
          await db.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // Check for low stock and notify
        for (const item of order.items) {
          try {
            const product = await db.product.findUnique({ where: { id: item.productId } });
            if (product && product.trackInventory && product.stockQuantity <= (product.lowStockThreshold || 5)) {
              notifyLowStock(product.id, product.name, product.stockQuantity).catch(() => {});
            }
          } catch {}
        }

      // Increment coupon usage if applicable
      if (order.couponId) {
        await db.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { increment: 1 } },
        });

        if (order.userId) {
          await db.couponUsage.create({
            data: {
              couponId: order.couponId,
              userId: order.userId,
              orderId: order.id,
            },
          });
        }
      }
    }

    return NextResponse.json({
      verified: true,
      message: "Payment verified successfully",
    });
  } catch (error: any) {
    const msg = error?.message || "Unknown error";
    if (msg.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Payment verification error:", msg);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
