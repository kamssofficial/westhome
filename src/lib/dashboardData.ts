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

type DateWindow = { start: Date; end: Date; previousStart: Date; previousEnd: Date };

const BUSINESS_TIME_ZONE = "Asia/Kolkata";
const BUSINESS_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function shiftToBusinessClock(date: Date): Date {
  return new Date(date.getTime() + BUSINESS_OFFSET_MS);
}

export function startOfDay(date: Date): Date {
  const shifted = shiftToBusinessClock(date);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - BUSINESS_OFFSET_MS);
}

function endOfDay(date: Date): Date {
  return new Date(startOfDay(addDays(date, 1)).getTime() - 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfMonth(date: Date, monthOffset = 0): Date {
  const shifted = shiftToBusinessClock(date);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + monthOffset, 1) - BUSINESS_OFFSET_MS);
}

function endOfMonth(date: Date, monthOffset = 0): Date {
  return new Date(startOfMonth(date, monthOffset + 1).getTime() - 1);
}

export function formatBusinessDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(date);
}

function businessDayKey(date: Date): string {
  const shifted = shiftToBusinessClock(date);
  return `${shifted.getUTCFullYear()}-${shifted.getUTCMonth()}-${shifted.getUTCDate()}`;
}

export function getDateWindow(range: string): DateWindow {
  const now = new Date();
  const today = startOfDay(now);

  switch (range) {
    case "today": {
      const previous = addDays(today, -1);
      return { start: today, end: now, previousStart: previous, previousEnd: endOfDay(previous) };
    }
    case "yesterday": {
      const current = addDays(today, -1);
      const previous = addDays(today, -2);
      return { start: current, end: endOfDay(current), previousStart: previous, previousEnd: endOfDay(previous) };
    }
    case "7d": {
      const start = addDays(today, -6);
      const previousEnd = addDays(start, -1);
      const previousStart = addDays(previousEnd, -6);
      return { start, end: now, previousStart, previousEnd: endOfDay(previousEnd) };
    }
    case "30d": {
      const start = addDays(today, -29);
      const previousEnd = addDays(start, -1);
      const previousStart = addDays(previousEnd, -29);
      return { start, end: now, previousStart, previousEnd: endOfDay(previousEnd) };
    }
    case "90d": {
      const start = addDays(today, -89);
      const previousEnd = addDays(start, -1);
      const previousStart = addDays(previousEnd, -89);
      return { start, end: now, previousStart, previousEnd: endOfDay(previousEnd) };
    }
    case "thisMonth": {
      const start = startOfMonth(now);
      const previousStart = startOfMonth(now, -1);
      const previousEnd = endOfMonth(now, -1);
      return { start, end: now, previousStart, previousEnd };
    }
    case "lastMonth": {
      const start = startOfMonth(now, -1);
      const end = endOfMonth(now, -1);
      const previousStart = startOfMonth(now, -2);
      const previousEnd = endOfMonth(now, -2);
      return { start, end, previousStart, previousEnd };
    }
    default: {
      const start = addDays(today, -29);
      const previousEnd = addDays(start, -1);
      const previousStart = addDays(previousEnd, -29);
      return { start, end: now, previousStart, previousEnd: endOfDay(previousEnd) };
    }
  }
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function loadDashboardData(range: string) {
  try {
    const window = getDateWindow(range);
    const since = window.start;
    const until = window.end;
    const prevStart = window.previousStart;
    const prevEnd = window.previousEnd;
    const sinceClause = { gte: since, lte: until };
    const previousClause = { gte: prevStart, lte: prevEnd };
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = addDays(todayStart, -6);
    const monthStart = startOfMonth(now);
    const chartStart = startOfDay(since);
    const days = Math.max(1, Math.floor((until.getTime() - chartStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);    // ── Parallel wave 1 ──
    // Every query below is independent of every other one, so they are issued
    // together. The database is remote (Supabase pooler), so each round trip
    // costs ~150ms; running them one after another made the dashboard take
    // 6-8s. Fanning them out turns ~30 serial round trips into one wave.
    const customerFilter = { OR: [{ role: "CUSTOMER" as const }, { orders: { some: {} } }], isActive: true };
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      revenueData, prevRevenueData, totalOrders, prevTotalOrders,
      statusCounts, ordersToday, weekOrders, monthOrders,
      unitsData, prevUnitsData,
      totalCustomers, newCustomers, prevNewCustomers,
      totalProducts, activeProducts, outOfStock, inventoryProducts,
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
      paymentMethods, orderOwnership, orderTotals, topCoupons,
      funnelSessionEvents,
    ] = await Promise.all([
      // Revenue & orders
      db.order.aggregate({ _sum: { total: true }, _count: { id: true }, where: { paymentStatus: "COMPLETED", createdAt: sinceClause } }),
      db.order.aggregate({ _sum: { total: true }, _count: { id: true }, where: { paymentStatus: "COMPLETED", createdAt: previousClause } }),
      db.order.count({ where: { createdAt: sinceClause } }),
      db.order.count({ where: { createdAt: previousClause } }),

      // Order status breakdown + order counts
      db.order.groupBy({ by: ["status"], _count: { id: true }, where: { createdAt: sinceClause } }),
      db.order.count({ where: { createdAt: { gte: todayStart } } }),
      db.order.count({ where: { createdAt: { gte: weekStart } } }),
      db.order.count({ where: { createdAt: { gte: monthStart } } }),

      // Units sold
      db.orderItem.aggregate({ _sum: { quantity: true }, where: { order: { createdAt: sinceClause, paymentStatus: "COMPLETED" } } }),
      db.orderItem.aggregate({ _sum: { quantity: true }, where: { order: { createdAt: previousClause, paymentStatus: "COMPLETED" } } }),

      // Customers
      db.user.count({ where: customerFilter }),
      db.user.count({ where: { ...customerFilter, createdAt: sinceClause } }),
      db.user.count({ where: { ...customerFilter, createdAt: previousClause } }),

      // Products
      db.product.count(),
      db.product.count({ where: { status: "ACTIVE", isActive: true } }),
      db.product.count({ where: { trackInventory: true, stockQuantity: 0 } }),
      db.product.findMany({
        where: { trackInventory: true, stockQuantity: { gt: 0 } },
        select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true },
      }),

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
        orderBy: { _sum: { totalPrice: "desc" } }, take: 15,
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
        where: { paymentStatus: "COMPLETED", createdAt: { gte: chartStart, lte: until } },
        select: { total: true, createdAt: true },
      }),

      // Category analytics
      db.category.findMany({ select: { id: true, name: true, slug: true } }),
      db.orderItem.groupBy({
        by: ["productId", "orderId"],
        _sum: { totalPrice: true, quantity: true },
        where: { order: { createdAt: sinceClause, paymentStatus: "COMPLETED" } },
      }),
      db.product.groupBy({ by: ["categoryId"], _count: { id: true } }),

      // Top customers
      db.order.groupBy({
        by: ["userId"], _count: { id: true }, _sum: { total: true },
        where: { createdAt: sinceClause, paymentStatus: "COMPLETED", userId: { not: null } },
        orderBy: { _sum: { total: "desc" } }, take: 20,
      }),

      // Geographic
      db.order.groupBy({
        by: ["state"], _count: { id: true }, _sum: { total: true },
        where: { createdAt: sinceClause, paymentStatus: "COMPLETED" },
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
      db.analyticsEvent.findMany({
        where: { createdAt: sinceClause, sessionId: { not: null } },
        select: { sessionId: true },
        distinct: ["sessionId"],
      }),

      // Payment stats
      db.payment.count({ where: { status: "COMPLETED", createdAt: sinceClause } }),
      db.payment.count({ where: { status: "FAILED", createdAt: sinceClause } }),

      // Payment method mix (Razorpay stamps the method on completed payments;
      // a null method means cash on delivery).
      db.payment.groupBy({
        by: ["method"], _count: { id: true }, _sum: { amount: true },
        where: { status: "COMPLETED", createdAt: sinceClause, order: { createdAt: sinceClause, paymentStatus: "COMPLETED" } },
      }),
      // Guest checkout vs signed-in accounts.
      db.order.groupBy({
        by: ["userId"], _count: { id: true }, _sum: { total: true },
        where: { createdAt: sinceClause, paymentStatus: "COMPLETED" },
      }),
      // Order-level money: gross items, discounts given, delivery collected.
      db.order.aggregate({
        _sum: { subtotal: true, discount: true, deliveryCharge: true },
        where: { paymentStatus: "COMPLETED", createdAt: sinceClause },
      }),
      // Coupons actually used in the range, most used first.
      db.order.groupBy({
        by: ["couponCode"], _count: { id: true }, _sum: { discount: true },
        where: { paymentStatus: "COMPLETED", createdAt: sinceClause, couponCode: { not: null } },
        orderBy: { _count: { id: "desc" } }, take: 5,
      }),
      // Session-based funnel population. Unlike raw event totals, a session can
      // only contribute once to each step, so repeat clicks/actions cannot
      // inflate conversion rates.
      db.analyticsEvent.findMany({
        where: {
          createdAt: sinceClause,
          sessionId: { not: null },
          eventType: { in: ["ADD_TO_CART", "CHECKOUT_STARTED", "PURCHASE", "PAYMENT_SUCCESS"] },
        },
        select: { sessionId: true, eventType: true },
        distinct: ["sessionId", "eventType"],
      }),
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
    const lowStockProductsAtRisk = inventoryProducts.filter((p) => p.stockQuantity <= (p.lowStockThreshold ?? 5));
    const customerOrderRows = await db.order.findMany({
      where: { createdAt: sinceClause, paymentStatus: "COMPLETED", userId: { not: null } },
      select: { userId: true, createdAt: true },
    });
    const customersWithOrders = new Set(customerOrderRows.map((o) => o.userId).filter(Boolean) as string[]);
    const returningCustomerIds = new Set(
      (await db.order.findMany({
        where: { paymentStatus: "COMPLETED", createdAt: { lt: since }, userId: { in: [...customersWithOrders] } },
        select: { userId: true },
      })).map((o) => o.userId).filter(Boolean) as string[]
    );
    const returningCustomers = returningCustomerIds.size;

    const events: Record<string, number> = {};
    eventCounts.forEach(e => { events[e.eventType] = e._count.id; });

    // ── Sales Funnel ──
    const funnel = {
      pageViews: events["PAGE_VIEW"] || 0,
      productViews: (events["PRODUCT_VIEW"] || 0) + (events["VIEW"] || 0),
      searches: events["SEARCH"] || 0,
      wishlistAdds: events["WISHLIST_ADD"] || events["WISHLIST"] || 0,
      cartAdds: events["ADD_TO_CART"] || 0,
      checkoutStarted: events["CHECKOUT_STARTED"] || 0,
      paymentStarted: events["PAYMENT_START"] || 0,
      paymentSuccess: events["PAYMENT_SUCCESS"] || events["PURCHASE"] || 0,
      orderCompleted: completedOrders,
    };

    const funnelSessionSets = {
      visitors: new Set(uniqueVisitorsRows.map((r) => r.sessionId).filter(Boolean) as string[]),
      cart: new Set<string>(),
      checkout: new Set<string>(),
      purchase: new Set<string>(),
    };
    for (const event of funnelSessionEvents) {
      if (!event.sessionId) continue;
      if (event.eventType === "ADD_TO_CART") funnelSessionSets.cart.add(event.sessionId);
      if (event.eventType === "CHECKOUT_STARTED") funnelSessionSets.checkout.add(event.sessionId);
      if (event.eventType === "PURCHASE" || event.eventType === "PAYMENT_SUCCESS") funnelSessionSets.purchase.add(event.sessionId);
    }
    const sessionFunnel = {
      visitorToCart: funnelSessionSets.visitors.size > 0
        ? Math.round((funnelSessionSets.cart.size / funnelSessionSets.visitors.size) * 100)
        : 0,
      cartToCheckout: funnelSessionSets.cart.size > 0
        ? Math.round((funnelSessionSets.checkout.size / funnelSessionSets.cart.size) * 100)
        : 0,
      checkoutToPurchase: funnelSessionSets.checkout.size > 0
        ? Math.round((funnelSessionSets.purchase.size / funnelSessionSets.checkout.size) * 100)
        : 0,
      sessionsWithCart: funnelSessionSets.cart.size,
      sessionsWithCheckout: funnelSessionSets.checkout.size,
      sessionsWithPurchase: funnelSessionSets.purchase.size,
    };

    // ── Parallel wave 2 ──
    // These three depend only on the wave-1 rows above (their id lists), so
    // they run together rather than one after another.
    const allProductIds = new Set<string>();
    [...topByRevenue, ...topByViews, ...topByWishlist, ...topByCart].forEach(t => { if (t.productId) allProductIds.add(t.productId); });
    const categorySaleProductIds = categorySales.map((sale) => sale.productId);
    const custIds = customerOrders.map(c => c.userId).filter(Boolean) as string[];
    const topRevenueProductIds = topByRevenue.map((t) => t.productId).filter(Boolean) as string[];

    const [productDetails, categoryProducts, custDetails, productOrderRows] = await Promise.all([
      allProductIds.size > 0
        ? db.product.findMany({ where: { id: { in: [...allProductIds] } }, select: { id: true, name: true, slug: true, regularPrice: true, salePrice: true, stockQuantity: true, trackInventory: true, images: { take: 1, select: { url: true } } } })
        : Promise.resolve([]),
      categorySaleProductIds.length > 0
        ? db.product.findMany({ where: { id: { in: categorySaleProductIds } }, select: { id: true, categoryId: true } })
        : Promise.resolve([]),
      custIds.length > 0
        ? db.user.findMany({ where: { id: { in: custIds } }, select: { id: true, name: true, email: true, createdAt: true } })
        : Promise.resolve([]),
      topRevenueProductIds.length > 0
        ? db.orderItem.findMany({
            where: {
              productId: { in: topRevenueProductIds },
              order: { createdAt: sinceClause, paymentStatus: "COMPLETED" },
            },
            select: { productId: true, orderId: true },
          })
        : Promise.resolve([]),
    ]);

    const pMap = Object.fromEntries(productDetails.map(p => [p.id, p]));
    const productOrderIds = new Map<string, Set<string>>();
    productOrderRows.forEach((row) => {
      if (!row.productId || !row.orderId) return;
      const ids = productOrderIds.get(row.productId) || new Set<string>();
      ids.add(row.orderId);
      productOrderIds.set(row.productId, ids);
    });

    const enrich = (items: any[], valueField: string) =>
      items.map(t => ({
        ...t,
        product: pMap[t.productId || ""] || null,
        [valueField]: Number(t._sum?.[valueField] || 0),
        orders: productOrderIds.get(t.productId || "")?.size || 0,
      }));

    // ── Revenue Over Time ──
    const dayKey = businessDayKey;
    const dailyTotals = new Map<string, { revenue: number; orders: number }>();
    chartOrders.forEach((order) => {
      const key = dayKey(new Date(order.createdAt));
      const current = dailyTotals.get(key) || { revenue: 0, orders: 0 };
      current.revenue += Number(order.total || 0);
      current.orders += 1;
      dailyTotals.set(key, current);
    });
    const revenueOverTime: { date: string; revenue: number; orders: number }[] = [];
    const chartEndDay = startOfDay(until);
    for (let i = days - 1; i >= 0; i--) {
      const day = addDays(chartEndDay, -i);
      const key = dayKey(day);
      const totals = dailyTotals.get(key) || { revenue: 0, orders: 0 };
      revenueOverTime.push({ date: formatBusinessDate(day), ...totals });
    }

    // ── Category Analytics ──
    const categoryByProduct = Object.fromEntries(categoryProducts.map((product) => [product.id, product.categoryId]));
    const categorySalesById = new Map<string, { orders: number; revenue: number; units: number }>();
    categorySales.forEach((sale) => {
      const categoryId = categoryByProduct[sale.productId];
      if (!categoryId) return;
      const current = categorySalesById.get(categoryId) || { orders: 0, revenue: 0, units: 0 };
      current.orders += 1;
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
      // Payment method mix (null method = cash on delivery, labelled not dropped)
      paymentMethods: paymentMethods.map(m => ({ method: m.method || "COD", count: m._count.id, amount: Number(m._sum.amount || 0) })),
      // Guest checkout vs signed-in accounts, orders and revenue side by side
      orderSources: {
        guest: {
          orders: orderOwnership.filter(o => !o.userId).reduce((s, o) => s + o._count.id, 0),
          revenue: orderOwnership.filter(o => !o.userId).reduce((s, o) => s + Number(o._sum.total || 0), 0),
        },
        account: {
          orders: orderOwnership.filter(o => o.userId).reduce((s, o) => s + o._count.id, 0),
          revenue: orderOwnership.filter(o => o.userId).reduce((s, o) => s + Number(o._sum.total || 0), 0),
        },
      },
      // Where the money goes: gross items, discounts given, delivery collected
      orderMoney: {
        subtotal: Number(orderTotals._sum.subtotal || 0),
        discount: Number(orderTotals._sum.discount || 0),
        delivery: Number(orderTotals._sum.deliveryCharge || 0),
      },
      // Coupons used in the range, most used first
      topCoupons: topCoupons.map(c => ({ code: c.couponCode || "—", orders: c._count.id, discount: Number(c._sum.discount || 0) })),
      // Low Stock
      lowStockProducts: lowStockProductsAtRisk.map(p => ({ id: p.id, name: p.name, stock: p.stockQuantity, threshold: p.lowStockThreshold ?? 5 })),
      // Insights
      insights,
      // Unique visitors
      uniqueVisitors,
      // Image-load failures reported by the storefront in this period.
      // This is a diagnostic event count, not a count of unique broken assets.
      imageErrors: events["IMAGE_ERROR"] || 0,
    };
  } catch (error) {
    console.error("Dashboard data error:", error);
    throw error;
  }
}
