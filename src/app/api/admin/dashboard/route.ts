import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function GET() {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "ORDER_MANAGER", "CONTENT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // Fetch stats in parallel
    const [
      totalOrders,
      totalProducts,
      totalCustomers,
      pendingOrders,
      ordersToday,
      lowStockProducts,
      recentOrders,
      revenueResult,
      thirtyDayRevenue,
      orderStatusCounts,
      topProducts,
      ,
    ] = await Promise.all([
      db.order.count(),
      db.product.count({ where: { isActive: true, status: "ACTIVE" } }),
      db.user.count({ where: { role: "CUSTOMER", isActive: true } }),
      db.order.count({ where: { status: { in: ["NEW", "CONFIRMED", "ON_HOLD"] } } }),
      db.order.count({ where: { createdAt: { gte: startOfToday, lt: startOfTomorrow } } }),
      db.product.findMany({
        where: { isActive: true, status: "ACTIVE", trackInventory: true },
        select: { id: true, name: true, slug: true, stockQuantity: true, regularPrice: true, salePrice: true, lowStockThreshold: true },
        orderBy: { stockQuantity: "asc" },
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          status: true,
          createdAt: true,
        },
      }),
      db.order.aggregate({
        _sum: { total: true },
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      // 7-day revenue trend
      db.order.findMany({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: sevenDaysAgo },
        },
        select: { total: true, createdAt: true },
      }),
      // Order status breakdown
      db.order.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      // Top products by order count
      db.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, totalPrice: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      null, // notifications loaded via /api/notifications
    ]);

    const lowStockProductsAtRisk = lowStockProducts.filter(
      (product) => product.stockQuantity <= product.lowStockThreshold
    );
    const lowStockProductsNeedingAttention = lowStockProductsAtRisk.slice(0, 10);

    // Build 7-day revenue chart data
    const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = day.toISOString().split("T")[0];
      const dayStart = new Date(dayStr + "T00:00:00.000Z");
      const dayEnd = new Date(dayStr + "T23:59:59.999Z");
      const dayOrders = thirtyDayRevenue.filter(
        (o) => o.createdAt >= dayStart && o.createdAt <= dayEnd
      );
      dailyRevenue.push({
        date: day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
        orders: dayOrders.length,
      });
    }

    // Fetch product details for top products
    const topProductIds = topProducts.map((tp) => tp.productId);
    const topProductDetails = await db.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, slug: true, regularPrice: true },
    });
    const topProductMap = new Map(topProductDetails.map((p) => [p.id, p]));

    const enrichedTopProducts = topProducts.map((tp) => ({
      ...tp,
      name: topProductMap.get(tp.productId)?.name ?? "Unknown",
      slug: topProductMap.get(tp.productId)?.slug ?? "",
      revenue: Number(tp._sum.totalPrice || 0),
      quantitySold: Number(tp._sum.quantity || 0),
    }));

    // Order status counts
    const statusBreakdown = orderStatusCounts.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    return NextResponse.json({
      stats: {
        revenue: Number(revenueResult._sum.total || 0),
        orders: totalOrders,
        products: totalProducts,
        customers: totalCustomers,
        pendingOrders,
        lowStockProducts: lowStockProductsAtRisk.length,
        ordersToday,
        asOf: now.toISOString(),
      },
      recentOrders: recentOrders.map((o) => ({
        ...o,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
      })),
      lowStockProducts: lowStockProductsNeedingAttention.map((p) => ({
        ...p,
        regularPrice: Number(p.regularPrice),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
      })),
      salesTrend: dailyRevenue,
      statusBreakdown,
      topProducts: enrichedTopProducts,
      notifications: [],
      semantics: {
        products: "active products with status ACTIVE",
        customers: "active users with role CUSTOMER",
        orders: "all orders, including cancelled and returned",
        pendingOrders: "orders with status NEW, CONFIRMED, or ON_HOLD",
        lowStock: "active tracked products where stockQuantity <= lowStockThreshold",
        ordersToday: "orders created between local server midnight boundaries",
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
