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

function getPreviousRange(range: string): { start: Date; end: Date } {
  const now = new Date();
  switch (range) {
    case "today": {
      const end = new Date(now); end.setHours(0,0,0,0);
      const start = new Date(end); start.setDate(start.getDate()-1);
      return { start, end };
    }
    case "7d": {
      return { start: new Date(now.getTime() - 14*24*60*60*1000), end: new Date(now.getTime() - 7*24*60*60*1000) };
    }
    case "30d": {
      return { start: new Date(now.getTime() - 60*24*60*60*1000), end: new Date(now.getTime() - 30*24*60*60*1000) };
    }
    default: {
      return { start: new Date(now.getTime() - 60*24*60*60*1000), end: new Date(now.getTime() - 30*24*60*60*1000) };
    }
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

    // Current period metrics
    const [eventsByType, uniqueSessions, todaySessions, weekSessions] = await Promise.all([
      db.analyticsEvent.groupBy({ by: ["eventType"], _count: { id: true }, where: { createdAt: { gte: since } } }),
      db.analyticsEvent.findMany({ where: { createdAt: { gte: since } }, select: { sessionId: true }, distinct: ["sessionId"] }),
      db.analyticsEvent.findMany({ where: { createdAt: { gte: todayStart } }, select: { sessionId: true }, distinct: ["sessionId"] }),
      db.analyticsEvent.findMany({ where: { createdAt: { gte: weekAgo } }, select: { sessionId: true }, distinct: ["sessionId"] }),
    ]);

    const eventCounts: Record<string, number> = {};
    eventsByType.forEach(e => { eventCounts[e.eventType] = e._count.id; });

    // Previous period for comparison
    const prev = getPreviousRange(range);
    const prevEvents = await db.analyticsEvent.groupBy({ by: ["eventType"], _count: { id: true }, where: { createdAt: { gte: prev.start, lte: prev.end } } });
    const prevCounts: Record<string, number> = {};
    prevEvents.forEach(e => { prevCounts[e.eventType] = e._count.id; });
    const prevSessions = await db.analyticsEvent.findMany({ where: { createdAt: { gte: prev.start, lte: prev.end } }, select: { sessionId: true }, distinct: ["sessionId"] });

    // Revenue
    const [revenueResult, prevRevenueResult] = await Promise.all([
      db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "COMPLETED", createdAt: { gte: since } } }),
      db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "COMPLETED", createdAt: { gte: prev.start, lte: prev.end } } }),
    ]);
    const revenue = Number(revenueResult._sum.total || 0);
    const prevRevenue = Number(prevRevenueResult._sum.total || 0);

    // Purchases & units
    const [purchases, prevPurchases, unitsResult] = await Promise.all([
      db.order.count({ where: { paymentStatus: "COMPLETED", createdAt: { gte: since } } }),
      db.order.count({ where: { paymentStatus: "COMPLETED", createdAt: { gte: prev.start, lte: prev.end } } }),
      db.orderItem.aggregate({ _sum: { quantity: true }, where: { order: { createdAt: { gte: since }, paymentStatus: "COMPLETED" } } }),
    ]);
    const unitsSold = Number(unitsResult._sum.quantity || 0);

    // Traffic sources from metadata
    const trafficEvents = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, metadata: { not: null } },
      select: { metadata: true },
      take: 5000,
    });
    const trafficSources: Record<string, number> = {};
    trafficEvents.forEach(e => {
      const m = e.metadata as any;
      if (m?.trafficSource) trafficSources[m.trafficSource] = (trafficSources[m.trafficSource] || 0) + 1;
    });

    // Device breakdown
    const deviceBreakdown = await db.analyticsEvent.groupBy({ by: ["deviceType"], _count: { id: true }, where: { createdAt: { gte: since } } });

    // Category analytics
    const categoryEvents = await db.analyticsEvent.groupBy({ by: ["categoryId", "eventType"], _count: { id: true }, where: { createdAt: { gte: since }, categoryId: { not: null } } });
    const categoryMap: Record<string, Record<string, number>> = {};
    categoryEvents.forEach(e => {
      if (!e.categoryId) return;
      if (!categoryMap[e.categoryId]) categoryMap[e.categoryId] = {};
      categoryMap[e.categoryId][e.eventType] = e._count.id;
    });
    const catIds = Object.keys(categoryMap);
    const catNames = catIds.length > 0 ? await db.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true, slug: true } }) : [];
    const catNameMap = Object.fromEntries(catNames.map(c => [c.id, c]));
    const categoryAnalytics = catIds.map(id => ({
      id, name: catNameMap[id]?.name || "Unknown", slug: catNameMap[id]?.slug || "",
      views: categoryMap[id]["VIEW"] || 0, clicks: categoryMap[id]["CLICK"] || 0,
      addToCart: categoryMap[id]["ADD_TO_CART"] || 0, purchases: 0, revenue: 0,
    }));

    // Search analytics
    const searchEvents = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, eventType: "SEARCH", metadata: { not: null } },
      select: { metadata: true },
      take: 2000,
    });
    const searchQueries: Record<string, number> = {};
    searchEvents.forEach(e => {
      const q = (e.metadata as any)?.query;
      if (q) searchQueries[q.toLowerCase()] = (searchQueries[q.toLowerCase()] || 0) + 1;
    });
    const topSearches = Object.entries(searchQueries).sort((a,b) => b[1] - a[1]).slice(0, 20).map(([query, count]) => ({ query, count }));

    // Abandoned carts (CHECKOUT_STARTED without PURCHASE within session)
    const checkoutSessions = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, eventType: "CHECKOUT_STARTED" },
      select: { sessionId: true },
    });
    const purchaseSessions = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, eventType: "PURCHASE" },
      select: { sessionId: true },
    });
    const purchasedSessionIds = new Set(purchaseSessions.map(p => p.sessionId).filter(Boolean));
    const abandonedCarts = checkoutSessions.filter(c => c.sessionId && !purchasedSessionIds.has(c.sessionId)).length;

    // Customer retention
    const [newCustomers, returningCustomers] = await Promise.all([
      db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
      db.user.count({ where: { role: "CUSTOMER", createdAt: { lt: since } } }),
    ]);

    // Top products by views
    const topViewed = await db.analyticsEvent.groupBy({ by: ["productId"], _count: { id: true }, where: { eventType: "VIEW", productId: { not: null }, createdAt: { gte: since } }, orderBy: { _count: { id: "desc" } }, take: 10 });
    const topViewedIds = topViewed.map(t => t.productId).filter(Boolean) as string[];
    const topViewedProducts = topViewedIds.length > 0 ? await db.product.findMany({ where: { id: { in: topViewedIds } }, select: { id: true, name: true, slug: true, regularPrice: true, stockQuantity: true } }) : [];
    const tvMap = Object.fromEntries(topViewedProducts.map(p => [p.id, p]));
    const enrichedTopViewed = topViewed.map(t => ({
      productId: t.productId, name: tvMap[t.productId!]?.name || "Unknown", slug: tvMap[t.productId!]?.slug || "",
      count: t._count.id, stock: tvMap[t.productId!]?.stockQuantity || 0,
    }));

    const topPurchased = await db.orderItem.groupBy({ by: ["productId"], _sum: { quantity: true, totalPrice: true }, _count: { id: true }, where: { order: { createdAt: { gte: since }, paymentStatus: "COMPLETED" } }, orderBy: { _sum: { quantity: "desc" } }, take: 10 });
    const topPurchasedIds = topPurchased.map(t => t.productId);
    const topPurchasedProducts = topPurchasedIds.length > 0 ? await db.product.findMany({ where: { id: { in: topPurchasedIds } }, select: { id: true, name: true, slug: true } }) : [];
    const tpMap = Object.fromEntries(topPurchasedProducts.map(p => [p.id, p]));
    const enrichedTopPurchased = topPurchased.map(t => ({
      productId: t.productId, name: tpMap[t.productId]?.name || "Unknown", slug: tpMap[t.productId]?.slug || "",
      quantity: Number(t._sum.quantity || 0), revenue: Number(t._sum.totalPrice || 0), orders: t._count.id,
    }));

    const viewsOverTime: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24*60*60*1000);
      const dayStr = day.toISOString().split("T")[0];
      const dayStart = new Date(dayStr + "T00:00:00.000Z");
      const dayEnd = new Date(dayStr + "T23:59:59.999Z");
      const count = await db.analyticsEvent.count({ where: { eventType: "VIEW", createdAt: { gte: dayStart, lte: dayEnd } } });
      viewsOverTime.push({ date: day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }), count });
    }

    const purchasesOverTime: { date: string; count: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24*60*60*1000);
      const dayStr = day.toISOString().split("T")[0];
      const dayStart = new Date(dayStr + "T00:00:00.000Z");
      const dayEnd = new Date(dayStr + "T23:59:59.999Z");
      const dayOrders = await db.order.findMany({ where: { paymentStatus: "COMPLETED", createdAt: { gte: dayStart, lte: dayEnd } }, select: { total: true } });
      purchasesOverTime.push({ date: day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }), count: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0) });
    }

    const totalVisitors = uniqueSessions.length;
    const conversionRate = totalVisitors > 0 ? ((purchases / totalVisitors) * 100) : 0;
    const prevVisitors = prevSessions.length;
    const prevConversion = prevVisitors > 0 ? ((prevPurchases / prevVisitors) * 100) : 0;
    const pctChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return NextResponse.json({
      summary: {
        totalVisitors, activeToday: todaySessions.length, activeWeek: weekSessions.length,
        productViews: eventCounts["VIEW"] || 0, productClicks: eventCounts["CLICK"] || 0,
        addToCart: eventCounts["ADD_TO_CART"] || 0, buyNow: eventCounts["BUY_NOW"] || 0,
        whatsappEnquiries: eventCounts["WHATSAPP_ENQUIRY"] || 0,
        collectionViews: eventCounts["COLLECTION_VIEW"] || 0,
        searchCount: eventCounts["SEARCH"] || 0,
        checkoutStarted: eventCounts["CHECKOUT_STARTED"] || 0,
        purchases, unitsSold, revenue, conversionRate: Math.round(conversionRate * 100) / 100,
      },
      comparison: {
        visitors: { current: totalVisitors, previous: prevVisitors, change: pctChange(totalVisitors, prevVisitors) },
        revenue: { current: revenue, previous: prevRevenue, change: pctChange(revenue, prevRevenue) },
        purchases: { current: purchases, previous: prevPurchases, change: pctChange(purchases, prevPurchases) },
        conversion: { current: Math.round(conversionRate * 100) / 100, previous: Math.round(prevConversion * 100) / 100, change: pctChange(conversionRate, prevConversion) },
      },
      trafficSources: Object.entries(trafficSources).sort((a,b) => b[1] - a[1]).map(([source, count]) => ({ source, count })),
      deviceBreakdown: deviceBreakdown.map(d => ({ device: d.deviceType || "unknown", count: d._count.id })),
      categoryAnalytics,
      topSearches,
      abandonedCarts,
      customerRetention: { newCustomers, returningCustomers },
      topViewed: enrichedTopViewed,
      topPurchased: enrichedTopPurchased,
      viewsOverTime,
      purchasesOverTime,
      range,
    });
  } catch (error) {
    console.error("Analytics dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}