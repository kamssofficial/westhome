import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = await request.json();

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

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
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
