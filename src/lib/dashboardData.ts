import db from "@/lib/db";

/**
 * Dashboard data loader.
 *
 * Owns every query behind /api/admin/dashboard so the route stays a thin,
 * authenticated wrapper. Keeping the queries here also means the figures can be
 * loaded (read-only) outside a request cycle, which is how this dashboard gets
 * verified against real data instead of fixtures.
 *
 * Every statement below is a read: aggregate, count, groupBy or findMany.
 */

function getDateRange(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today": { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; }
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "thisMonth": return new Date(now.getFullYear(), now.getMonth(), 1);
    case "lastMonth": return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function getPreviousEnd(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today": { const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(23, 59, 59, 999); return d; }
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate() - 2); d.setHours(23, 59, 59, 999); return d; }
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "thisMonth": return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    case "lastMonth": return new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function getPreviousStart(range: string): Date {
  const now = new Date();
  if (range === "today") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "thisMonth") return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (range === "lastMonth") return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const end = getPreviousEnd(range);
  const diff = now.getTime() - end.getTime();
  return new Date(end.getTime() - diff);
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function loadDashboardData(range: string) {
  try {
    const since = getDateRange(range);
    // "yesterday" must not bleed into today: add an exclusive end bound.
    const until = range === "yesterday" ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(23, 59, 59, 999); return d; })() : null;
    const sinceClause = until ? { gte: since, lte: until } : { gte: since };
    const prevStart = getPreviousStart(range);
    const prevEnd = getPreviousEnd(range);
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);    // ── Parallel wave 1 ──
    // Every query below is independent of every other one, so they are issued
    // together. The database is remote (Supabase pooler), so each round trip
    // costs ~150ms; running them one after another made the dashboard take
    // 6-8s. Fanning them out turns ~30 serial round trips into one wave.
    const customerFilter = { OR: [{ role: "CUSTOMER" as const }, { orders: { some: {} } }], isActive: true };
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const days = range === "today" ? 1 : range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const chartStart = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    chartStart.setHours(0, 0, 0, 0);

    const [
      revenueData, prevRevenueData, totalOrders, prevTotalOrders,
      statusCounts, ordersToday, weekOrders, monthOrders,
      unitsData, prevUnitsData,
      totalCustomers, newCustomers, prevNewCustomers,
      totalProducts, activeProducts, outOfStock, lowStockProductsAtRisk,
      productsSold,
      refundCount, cancelledCount, pendingPayments,
      liveSessions, liveDevices,
      eventCounts,
      topByRevenue, topByViews, topByWishlist, topByCart,
      chartOrders,
      categories, categorySales, categoryProductCounts,
      customerOrders,
      geoDataRaw,
      recentOrders, recentPayments, recentUsers,
      searchEvents,
      devices,
      totalWishlist, wishlistToday,
      uniqueVisitorsRows,
      paymentSuccess, paymentFailed,
    ] = await Promise.all([
      // Revenue & orders
      db.order.aggregate({ _sum: { total: true }, _count: { id: true }, where: { paymentStatus: "COMPLETED", createdAt: sinceClause } }),
      db.order.aggregate({ _sum: { total: true }, _count: { id: true }, where: { paymentStatus: "COMPLETED", createdAt: { gte: prevStart, lte: prevEnd } } }),
      db.order.count({ where: { createdAt: sinceClause } }),
      db.order.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),

      // Order status breakdown + order counts
      db.order.groupBy({ by: ["status"], _count: { id: true }, where: { createdAt: sinceClause } }),
      db.order.count({ where: { createdAt: { gte: todayStart } } }),
      db.order.count({ where: { createdAt: { gte: weekStart } } }),
      db.order.count({ where: { createdAt: { gte: monthStart } } }),

      // Units sold
      db.orderItem.aggregate({ _sum: { quantity: true }, where: { order: { createdAt: sinceClause, paymentStatus: "COMPLETED" } } }),
      db.orderItem.aggregate({ _sum: { quantity: true }, where: { order: { createdAt: { gte: prevStart, lte: prevEnd }, paymentStatus: "COMPLETED" } } }),

      // Customers
      db.user.count({ where: customerFilter }),
      db.user.count({ where: { ...customerFilter, createdAt: sinceClause } }),
      db.user.count({ where: { ...customerFilter, createdAt: { gte: prevStart, lte: prevEnd } } }),

      // Products
      db.product.count(),
      db.product.count({ where: { status: "ACTIVE" } }),
      db.product.count({ where: { trackInventory: true, stockQuantity: 0 } }),
      db.product.findMany({ where: { trackInventory: true, stockQuantity: { gt: 0, lte: 5 } }, select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true }, take: 50 }),

      // Products sold (distinct)
      db.orderItem.groupBy({ by: ["productId"], where: { order: { createdAt: sinceClause, paymentStatus: "COMPLETED" } } }),

      // Refunds / cancelled / pending
      db.order.count({ where: { paymentStatus: "REFUNDED", createdAt: sinceClause } }),
      db.order.count({ where: { status: "CANCELLED", createdAt: sinceClause } }),
      db.order.count({ where: { paymentStatus: "PENDING", createdAt: sinceClause } }),

      // Live sessions
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false } }),
      db.liveSession.groupBy({ by: ["deviceType"], _count: { id: true }, where: { lastActive: { gte: fiveMinAgo }, isStaff: false } }),

      // Analytics events
      db.analyticsEvent.groupBy({ by: ["eventType"], _count: { id: true }, where: { createdAt: sinceClause } }),

      // Top products
      db.orderItem.groupBy({
        by: ["productId"], _sum: { totalPrice: true, quantity: true }, _count: { id: true },
        where: { order: { createdAt: sinceClause, paymentStatus: "COMPLETED" } },
        orderBy: { _sum: { totalPrice: "desc" } }, take: 10,
      }),
      db.analyticsEvent.groupBy({
        by: ["productId"], _count: { id: true },
        where: { eventType: { in: ["VIEW", "PRODUCT_VIEW"] }, productId: { not: null }, createdAt: sinceClause },
        orderBy: { _count: { id: "desc" } }, take: 10,
      }),
      db.analyticsEvent.groupBy({
        by: ["productId"], _count: { id: true },
        where: { eventType: { in: ["WISHLIST_ADD", "WISHLIST"] }, productId: { not: null }, createdAt: sinceClause },
        orderBy: { _count: { id: "desc" } }, take: 10,
      }),
      db.analyticsEvent.groupBy({
        by: ["productId"], _count: { id: true },
        where: { eventType: "ADD_TO_CART", productId: { not: null }, createdAt: sinceClause },
        orderBy: { _count: { id: "desc" } }, take: 10,
      }),

      // Revenue over time
      db.order.findMany({
        where: { paymentStatus: "COMPLETED", createdAt: { gte: chartStart, lte: now } },
        select: { total: true, createdAt: true },
      }),

      // Category analytics
      db.category.findMany({ select: { id: true, name: true, slug: true } }),
      db.orderItem.groupBy({
        by: ["productId"],
        _count: { id: true },
        _sum: { totalPrice: true, quantity: true },
        where: { order: { createdAt: sinceClause, paymentStatus: "COMPLETED" } },
      }),
      db.product.groupBy({ by: ["categoryId"], _count: { id: true } }),

      // Top customers
      db.order.groupBy({
        by: ["userId"], _count: { id: true }, _sum: { total: true },
        where: { createdAt: sinceClause, userId: { not: null } },
        orderBy: { _sum: { total: "desc" } }, take: 20,
      }),

      // Geographic
      db.order.groupBy({
        by: ["state"], _count: { id: true }, _sum: { total: true },
        where: { createdAt: sinceClause },
        orderBy: { _count: { id: "desc" } }, take: 30,
      }),

      // Recent activity
      db.order.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, orderNumber: true, total: true, status: true, paymentStatus: true, createdAt: true, customerName: true } }),
      db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, status: true, amount: true, createdAt: true, orderId: true } }),
      db.user.findMany({ where: { role: "CUSTOMER" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true } }),

      // Search terms
      db.analyticsEvent.findMany({
        where: { eventType: "SEARCH", metadata: { not: null }, createdAt: sinceClause },
        select: { metadata: true }, take: 2000,
      }),

      // Device breakdown
      db.analyticsEvent.groupBy({ by: ["deviceType"], _count: { id: true }, where: { createdAt: sinceClause } }),

      // Wishlist stats
      db.wishlist.count(),
      db.analyticsEvent.count({ where: { eventType: { in: ["WISHLIST_ADD", "WISHLIST"] }, createdAt: { gte: todayStart } } }),

      // Unique visitors
      db.analyticsEvent.findMany({ where: { createdAt: sinceClause }, select: { sessionId: true }, distinct: ["sessionId"] }),

      // Payment stats
      db.payment.count({ where: { status: "COMPLETED", createdAt: sinceClause } }),
      db.payment.count({ where: { status: "FAILED", createdAt: sinceClause } }),
    ]);

    const revenue = Number(revenueData._sum.total || 0);
    const prevRevenue = Number(prevRevenueData._sum.total || 0);
    const completedOrders = revenueData._count.id || 0;
    const prevCompletedOrders = prevRevenueData._count.id || 0;
    const avgOrderValue = completedOrders > 0 ? Math.round(revenue / completedOrders) : 0;
    const prevAvgOrderValue = prevCompletedOrders > 0 ? Math.round(prevRevenue / prevCompletedOrders) : 0;

    const statusMap: Record<string, number> = {};
    statusCounts.forEach(s => { statusMap[s.status] = s._count.id; });

    const unitsSold = Number(unitsData._sum.quantity || 0);
    const prevUnitsSold = Number(prevUnitsData._sum.quantity || 0);
    const returningCustomers = totalCustomers - newCustomers;

    const events: Record<string, number> = {};
    eventCounts.forEach(e => { events[e.eventType] = e._count.id; });

    // ── Sales Funnel ──
    const funnel = {
      pageViews: events["PAGE_VIEW"] || events["VIEW"] || 0,
      productViews: events["PRODUCT_VIEW"] || events["VIEW"] || 0,
      searches: events["SEARCH"] || 0,
      wishlistAdds: events["WISHLIST_ADD"] || events["WISHLIST"] || 0,
      cartAdds: events["ADD_TO_CART"] || 0,
      checkoutStarted: events["CHECKOUT_STARTED"] || 0,
      paymentStarted: events["PAYMENT_START"] || 0,
      paymentSuccess: events["PAYMENT_SUCCESS"] || events["PURCHASE"] || 0,
      orderCompleted: completedOrders,
    };

    // ── Parallel wave 2 ──
    // These three depend only on the wave-1 rows above (their id lists), so
    // they run together rather than one after another.
    const allProductIds = new Set<string>();
    [...topByRevenue, ...topByViews, ...topByWishlist, ...topByCart].forEach(t => { if (t.productId) allProductIds.add(t.productId); });
    const categorySaleProductIds = categorySales.map((sale) => sale.productId);
    const custIds = customerOrders.map(c => c.userId).filter(Boolean) as string[];

    const [productDetails, categoryProducts, custDetails] = await Promise.all([
      allProductIds.size > 0
        ? db.product.findMany({ where: { id: { in: [...allProductIds] } }, select: { id: true, name: true, slug: true, regularPrice: true, salePrice: true, stockQuantity: true, trackInventory: true, images: { take: 1, select: { url: true } } } })
        : Promise.resolve([]),
      categorySaleProductIds.length > 0
        ? db.product.findMany({ where: { id: { in: categorySaleProductIds } }, select: { id: true, categoryId: true } })
        : Promise.resolve([]),
      custIds.length > 0
        ? db.user.findMany({ where: { id: { in: custIds } }, select: { id: true, name: true, email: true, createdAt: true } })
        : Promise.resolve([]),
    ]);

    const pMap = Object.fromEntries(productDetails.map(p => [p.id, p]));

    const enrich = (items: any[], valueField: string, countField = "_count") =>
      items.map(t => ({ ...t, product: pMap[t.productId || ""] || null, [valueField]: Number(t._sum?.[valueField] || 0), orders: t[countField]?.id || 0 }));

    // ── Revenue Over Time ──
    const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const dailyTotals = new Map<string, { revenue: number; orders: number }>();
    chartOrders.forEach((order) => {
      const key = dayKey(new Date(order.createdAt));
      const current = dailyTotals.get(key) || { revenue: 0, orders: 0 };
      current.revenue += Number(order.total || 0);
      current.orders += 1;
      dailyTotals.set(key, current);
    });
    const revenueOverTime: { date: string; revenue: number; orders: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = dayKey(day);
      const totals = dailyTotals.get(key) || { revenue: 0, orders: 0 };
      revenueOverTime.push({ date: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), ...totals });
    }

    // ── Category Analytics ──
    const categoryByProduct = Object.fromEntries(categoryProducts.map((product) => [product.id, product.categoryId]));
    const categorySalesById = new Map<string, { orders: number; revenue: number; units: number }>();
    categorySales.forEach((sale) => {
      const categoryId = categoryByProduct[sale.productId];
      if (!categoryId) return;
      const current = categorySalesById.get(categoryId) || { orders: 0, revenue: 0, units: 0 };
      current.orders += sale._count.id;
      current.revenue += Number(sale._sum.totalPrice || 0);
      current.units += Number(sale._sum.quantity || 0);
      categorySalesById.set(categoryId, current);
    });
    const categoryAnalytics = categories.map((cat) => {
      const sales = categorySalesById.get(cat.id) || { orders: 0, revenue: 0, units: 0 };
      const productCount = categoryProductCounts.find((entry) => entry.categoryId === cat.id)?._count.id || 0;
      return { ...cat, products: productCount, ...sales };
    });

    // ── Customer List (top) ──
    const cMap = Object.fromEntries(custDetails.map(c => [c.id, c]));

    // ── Geographic ──
    const geoData = geoDataRaw.filter(g => g.state != null);

    // ── Search Terms ──
    const searchTerms: Record<string, number> = {};
    searchEvents.forEach(e => {
      const q = (e.metadata as any)?.query;
      if (q) searchTerms[q.toLowerCase().trim()] = (searchTerms[q.toLowerCase().trim()] || 0) + 1;
    });
    const topSearches = Object.entries(searchTerms).sort((a, b) => b[1] - a[1]).slice(0, 15);

    // ── Conversion Rate ──
    const uniqueVisitors = uniqueVisitorsRows.length;
    const conversionRate = uniqueVisitors > 0 ? Math.round((completedOrders / uniqueVisitors) * 10000) / 100 : 0;

    // Insights
    const insights: string[] = [];
    if (topByRevenue.length > 0 && pMap[topByRevenue[0].productId || ""] ) {
      insights.push("Your highest-selling product is " + pMap[topByRevenue[0].productId!].name + ".");
    }
    // Insights stay a place for synthesis, not a second copy of the page. Stock
    // counts, conversion rate, orders today and the revenue change each restated a
    // KPI tile or the Action required card verbatim, so they were dropped — the two
    // that remain say something no single card does.
    // Both sides of this percentage must come from the same population: the
    // device groupBy counts *every* event in the range, so dividing it by a
    // single event type (product views) reported nonsense like "mobile 2372%".
    const deviceOrder = [...devices].sort((a, b) => b._count.id - a._count.id);
    const topDevice = deviceOrder[0];
    const deviceTotal = deviceOrder.reduce((s, d) => s + d._count.id, 0);
    if (topDevice && deviceTotal > 0) {
      insights.push("Most visitors are on " + (topDevice.deviceType || "unknown") + " (" + Math.round((topDevice._count.id / deviceTotal) * 100) + "%).");
    }

    return {
      range,
      // KPIs
      kpis: {
        revenue, prevRevenue, revenueChange: pctChange(revenue, prevRevenue),
        netRevenue: revenue, // No refund data yet
        totalOrders, prevTotalOrders, ordersChange: pctChange(totalOrders, prevTotalOrders),
        completedOrders, avgOrderValue, prevAvgOrderValue, aovChange: pctChange(avgOrderValue, prevAvgOrderValue),
        totalCustomers, newCustomers, prevNewCustomers, newCustomersChange: pctChange(newCustomers, prevNewCustomers),
        returningCustomers, conversionRate,
        productsSold: productsSold.length, unitsSold, prevUnitsSold, unitsChange: pctChange(unitsSold, prevUnitsSold),
        refunds: refundCount, pendingPayments, cancelledOrders: cancelledCount,
        lowStock: lowStockProductsAtRisk.length, outOfStock, totalProducts, activeProducts,
        ordersToday, weekOrders, monthOrders,
      },
      // Live
      live: { sessions: liveSessions, devices: liveDevices.map(d => ({ type: d.deviceType || "unknown", count: d._count.id })) },
      // Funnel
      funnel,
      // Charts
      revenueOverTime,
      // Order Status
      orderStatus: statusMap,
      // Top Products
      topByRevenue: enrich(topByRevenue, "revenue"),
      topByViews: topByViews.map(t => ({ ...t, product: pMap[t.productId || ""] || null, views: t._count.id })),
      topByWishlist: topByWishlist.map(t => ({ ...t, product: pMap[t.productId || ""] || null, wishlists: t._count.id })),
      topByCart: topByCart.map(t => ({ ...t, product: pMap[t.productId || ""] || null, cartAdds: t._count.id })),
      // Categories
      categoryAnalytics: categoryAnalytics.filter(c => c.products > 0 || c.orders > 0),
      // Customers
      topCustomers: customerOrders.map(c => ({ ...c, total: Number(c._sum.total || 0), customer: cMap[c.userId || ""] || null })),
      // Geographic
      geographic: geoData.map(g => ({ state: g.state || "Unknown", orders: g._count.id, revenue: Number(g._sum.total || 0) })),
      // Activity
      activity: {
        recentOrders,
        recentPayments: recentPayments.map(p => ({ ...p, amount: Number(p.amount || 0) })),
        recentUsers,
      },
      // Search
      topSearches: topSearches.map(([query, count]) => ({ query, count })),
      // Devices
      deviceBreakdown: deviceOrder.map(d => ({ device: d.deviceType || "unknown", count: d._count.id })),
      // Wishlist
      wishlist: { total: totalWishlist, today: wishlistToday },
      // Payments
      payments: { success: paymentSuccess, failed: paymentFailed, successRate: (paymentSuccess + paymentFailed) > 0 ? Math.round((paymentSuccess / (paymentSuccess + paymentFailed)) * 100) : 0 },
      // Low Stock
      lowStockProducts: lowStockProductsAtRisk.map(p => ({ id: p.id, name: p.name, stock: p.stockQuantity, threshold: p.lowStockThreshold || 5 })),
      // Insights
      insights,
      // Unique visitors
      uniqueVisitors,
    };
  } catch (error) {
    console.error("Dashboard data error:", error);
    throw error;
  }
}
