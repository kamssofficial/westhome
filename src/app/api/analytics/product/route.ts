import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

function getDateRange(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today": { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    case "7d": return new Date(now.getTime() - 7*24*60*60*1000);
    case "30d": return new Date(now.getTime() - 30*24*60*60*1000);
    case "90d": return new Date(now.getTime() - 90*24*60*60*1000);
    default: return new Date(now.getTime() - 30*24*60*60*1000);
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN","MANAGER","PRODUCT_MANAGER","ORDER_MANAGER","CONTENT_MANAGER","STAFF"]);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const range = searchParams.get("range") || "30d";

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const since = getDateRange(range);
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, slug: true, regularPrice: true, salePrice: true, stockQuantity: true },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Event counts for this product
    const events = await db.analyticsEvent.groupBy({
      by: ["eventType"],
      _count: { id: true },
      where: { productId, createdAt: { gte: since } },
    });
    const eventCounts: Record<string, number> = {};
    events.forEach(e => { eventCounts[e.eventType] = e._count.id; });

    // Unique visitors
    const uniqueVisitors = await db.analyticsEvent.findMany({
      where: { productId, createdAt: { gte: since } },
      select: { sessionId: true },
      distinct: ["sessionId"],
    });

    // Purchase data
    const orderItems = await db.orderItem.findMany({
      where: { productId, order: { createdAt: { gte: since }, paymentStatus: "COMPLETED" } },
      select: { quantity: true, totalPrice: true, orderId: true },
    });
    const totalPurchases = orderItems.length;
    const totalUnits = orderItems.reduce((s, i) => s + i.quantity, 0);
    const totalRevenue = orderItems.reduce((s, i) => s + Number(i.totalPrice), 0);
    const uniqueOrders = new Set(orderItems.map(i => i.orderId)).size;

    // Conversion rates
    const views = eventCounts["VIEW"] || 0;
    const visitors = uniqueVisitors.length;
    const addToCart = eventCounts["ADD_TO_CART"] || 0;
    const buyNow = eventCounts["BUY_NOW"] || 0;

    const viewToPurchase = views > 0 ? ((totalPurchases / views) * 100) : 0;
    const visitorToPurchase = visitors > 0 ? ((totalPurchases / visitors) * 100) : 0;
    const cartToPurchase = addToCart > 0 ? ((totalPurchases / addToCart) * 100) : 0;
    const buyNowToPurchase = buyNow > 0 ? ((totalPurchases / buyNow) * 100) : 0;

    // Views over time (last 7 days)
    const viewsOverTime: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24*60*60*1000);
      const dayStr = day.toISOString().split("T")[0];
      const dayStart = new Date(dayStr + "T00:00:00.000Z");
      const dayEnd = new Date(dayStr + "T23:59:59.999Z");
      const count = await db.analyticsEvent.count({
        where: { productId, eventType: "VIEW", createdAt: { gte: dayStart, lte: dayEnd } },
      });
      viewsOverTime.push({ date: day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }), count });
    }

    // Funnel
    const funnel = {
      views: views,
      clicks: eventCounts["CLICK"] || 0,
      addToCart: addToCart,
      buyNow: buyNow,
      purchases: totalPurchases,
    };

    return NextResponse.json({
      product,
      summary: {
        views,
        uniqueVisitors: visitors,
        clicks: eventCounts["CLICK"] || 0,
        addToCart,
        buyNow,
        whatsappEnquiries: eventCounts["WHATSAPP_ENQUIRY"] || 0,
        purchases: uniqueOrders,
        unitsSold: totalUnits,
        revenue: totalRevenue,
        conversionRate: Math.round(viewToPurchase * 100) / 100,
        visitorConversionRate: Math.round(visitorToPurchase * 100) / 100,
        cartConversionRate: Math.round(cartToPurchase * 100) / 100,
        buyNowConversionRate: Math.round(buyNowToPurchase * 100) / 100,
      },
      funnel,
      viewsOverTime,
      range,
    });
  } catch (error) {
    console.error("Product analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch product analytics" }, { status: 500 });
  }
}
