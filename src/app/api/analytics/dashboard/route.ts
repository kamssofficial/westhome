import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

function getDateRange(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today": { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate()-1); d.setHours(0,0,0,0); return d; }
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
    const range = searchParams.get("range") || "30d";
    const since = getDateRange(range);
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekAgo = new Date(now.getTime() - 7*24*60*60*1000);

    // Aggregate counts by eventType
    const eventsByType = await db.analyticsEvent.groupBy({
      by: ["eventType"],
      _count: { id: true },
      where: { createdAt: { gte: since } },
    });
    const eventCounts: Record<string, number> = {};
    eventsByType.forEach(e => { eventCounts[e.eventType] = e._count.id; });

    // Unique sessions (visitors) in period
    const uniqueSessions = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { sessionId: true },
      distinct: ["sessionId"],
    });
    const totalVisitors = uniqueSessions.length;

    // Unique sessions today
    const todaySessions = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { sessionId: true },
      distinct: ["sessionId"],
    });
    const activeToday = todaySessions.length;

    // Unique sessions this week
    const weekSessions = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { sessionId: true },
      distinct: ["sessionId"],
    });
    const activeWeek = weekSessions.length;

    // Active month = totalVisitors
    const activeMonth = totalVisitors;

    // Revenue from completed orders in period
    const revenueResult = await db.order.aggregate({
      _sum: { total: true },
      where: { paymentStatus: "COMPLETED", createdAt: { gte: since } },
    });
    const revenue = Number(revenueResult._sum.total || 0);

    // Purchases = orders with COMPLETED payment
    const purchases = await db.order.count({
      where: { paymentStatus: "COMPLETED", createdAt: { gte: since } },
    });

    // Total units sold
    const unitsResult = await db.orderItem.aggregate({
      _sum: { quantity: true },
      where: { order: { createdAt: { gte: since }, paymentStatus: "COMPLETED" } },
    });
    const unitsSold = Number(unitsResult._sum.quantity || 0);

    // Views over time (last 7 days)
    const viewsOverTime: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24*60*60*1000);
      const dayStr = day.toISOString().split("T")[0];
      const dayStart = new Date(dayStr + "T00:00:00.000Z");
      const dayEnd = new Date(dayStr + "T23:59:59.999Z");
      const count = await db.analyticsEvent.count({
        where: { eventType: "VIEW", createdAt: { gte: dayStart, lte: dayEnd } },
      });
      viewsOverTime.push({ date: day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }), count });
    }

    // Purchases over time (last 7 days)
    const purchasesOverTime: { date: string; count: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24*60*60*1000);
      const dayStr = day.toISOString().split("T")[0];
      const dayStart = new Date(dayStr + "T00:00:00.000Z");
      const dayEnd = new Date(dayStr + "T23:59:59.999Z");
      const dayOrders = await db.order.findMany({
        where: { paymentStatus: "COMPLETED", createdAt: { gte: dayStart, lte: dayEnd } },
        select: { total: true },
      });
      purchasesOverTime.push({
        date: day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        count: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
      });
    }

    // Top products by views
    const topViewed = await db.analyticsEvent.groupBy({
      by: ["productId"],
      _count: { id: true },
      where: { eventType: "VIEW", productId: { not: null }, createdAt: { gte: since } },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });
    const topViewedIds = topViewed.map(t => t.productId).filter(Boolean) as string[];
    const topViewedProducts = topViewedIds.length > 0 ? await db.product.findMany({
      where: { id: { in: topViewedIds } },
      select: { id: true, name: true, slug: true },
    }) : [];
    const topViewedMap = new Map(topViewedProducts.map(p => [p.id, p]));
    const enrichedTopViewed = topViewed.map(t => ({
      productId: t.productId,
      name: topViewedMap.get(t.productId!)?.name || "Unknown",
      slug: topViewedMap.get(t.productId!)?.slug || "",
      count: t._count.id,
    }));

    // Top products by purchases
    const topPurchased = await db.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, totalPrice: true },
      _count: { id: true },
      where: { order: { createdAt: { gte: since }, paymentStatus: "COMPLETED" } },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });
    const topPurchasedIds = topPurchased.map(t => t.productId);
    const topPurchasedProducts = topPurchasedIds.length > 0 ? await db.product.findMany({
      where: { id: { in: topPurchasedIds } },
      select: { id: true, name: true, slug: true },
    }) : [];
    const topPurchasedMap = new Map(topPurchasedProducts.map(p => [p.id, p]));
    const enrichedTopPurchased = topPurchased.map(t => ({
      productId: t.productId,
      name: topPurchasedMap.get(t.productId)?.name || "Unknown",
      slug: topPurchasedMap.get(t.productId)?.slug || "",
      quantity: Number(t._sum.quantity || 0),
      revenue: Number(t._sum.totalPrice || 0),
      orders: t._count.id,
    }));

    // Conversion rate: purchases / unique product visitors
    const conversionRate = totalVisitors > 0 ? ((purchases / totalVisitors) * 100) : 0;

    // Device breakdown
    const deviceBreakdown = await db.analyticsEvent.groupBy({
      by: ["deviceType"],
      _count: { id: true },
      where: { createdAt: { gte: since } },
    });

    return NextResponse.json({
      summary: {
        totalVisitors,
        activeToday,
        activeWeek,
        activeMonth,
        productViews: eventCounts["VIEW"] || 0,
        productClicks: eventCounts["CLICK"] || 0,
        addToCart: eventCounts["ADD_TO_CART"] || 0,
        buyNow: eventCounts["BUY_NOW"] || 0,
        whatsappEnquiries: eventCounts["WHATSAPP_ENQUIRY"] || 0,
        purchases,
        unitsSold,
        revenue,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      viewsOverTime,
      purchasesOverTime,
      topViewed: enrichedTopViewed,
      topPurchased: enrichedTopPurchased,
      deviceBreakdown: deviceBreakdown.map(d => ({ device: d.deviceType || "unknown", count: d._count.id })),
      range,
    });
  } catch (error) {
    console.error("Analytics dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
