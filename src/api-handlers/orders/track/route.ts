import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verifyGuestClaimToken } from "@/lib/guestOrder";

export const dynamic = "force-dynamic";

// Low rate limit: this endpoint is public and keyed by guessable-ish values.
const trackLimiter = rateLimit({ windowMs: 60_000, max: 20 });

/**
 * GET /api/orders/track?orderNumber=WH…&phone=9876543210
 *   — guest order lookup: both values must match.
 * GET /api/orders/track?orderId=…&token=<guestClaimToken>
 *   — token lookup straight after checkout (token is bound to the order id).
 *
 * Both paths return a minimal, safe projection: status, order number, placed
 * date, items and totals. No internal ids beyond the order number, no payment
 * artifacts, no admin notes.
 */
export async function GET(request: NextRequest) {
  try {
    if (!trackLimiter.check(request)) {
      return NextResponse.json({ error: "Too many lookups. Please wait a minute and try again." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const orderNumber = (searchParams.get("orderNumber") || "").trim();
    const phone = (searchParams.get("phone") || "").replace(/\D/g, "");
    const orderId = (searchParams.get("orderId") || "").trim();
    const token = searchParams.get("token");

    let where:
      | { id: string }
      | { orderNumber: string; customerPhone: { endsWith: string } }
      | null = null;

    if (orderId && token) {
      if (!verifyGuestClaimToken(orderId, token)) {
        return NextResponse.json({ error: "This order link is not valid." }, { status: 403 });
      }
      where = { id: orderId };
    } else if (orderNumber && phone.length >= 10) {
      // Match on the last 10 digits so +91 / 0 prefixes still work.
      where = { orderNumber, customerPhone: { endsWith: phone.slice(-10) } };
    } else {
      return NextResponse.json(
        { error: "Provide your order number and the phone number you ordered with." },
        { status: 400 }
      );
    }

    const order = await db.order.findFirst({
      where,
      include: {
        items: { select: { productName: true, variantName: true, quantity: true, totalPrice: true, image: true } },
        statusHistory: { orderBy: { createdAt: "desc" as const }, take: 10, select: { status: true, note: true, createdAt: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "No order found for those details. Check your order number and phone number." }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        placedAt: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
        customerName: order.customerName,
        items: order.items.map((i) => ({
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          totalPrice: Number(i.totalPrice),
          image: i.image,
        })),
        subtotal: Number(order.subtotal),
        deliveryCharge: Number(order.deliveryCharge),
        discount: Number(order.discount),
        total: Number(order.total),
        statusHistory: order.statusHistory,
      },
    });
  } catch (error) {
    console.error("GET /api/orders/track error:", error);
    return NextResponse.json({ error: "Failed to look up order" }, { status: 500 });
  }
}
