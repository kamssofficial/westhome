import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch stats in parallel
    const [
      totalOrders,
      totalProducts,
      totalCustomers,
      pendingOrders,
      lowStockProducts,
      recentOrders,
      revenueResult,
    ] = await Promise.all([
      db.order.count(),
      db.product.count({ where: { isActive: true } }),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.order.count({ where: { status: { in: ["NEW", "CONFIRMED"] } } }),
      db.product.findMany({
        where: { isActive: true, trackInventory: true, stockQuantity: { lte: 5 } },
        select: { id: true, name: true, stockQuantity: true },
        take: 10,
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
    ]);

    return NextResponse.json({
      stats: {
        revenue: Number(revenueResult._sum.total || 0),
        orders: totalOrders,
        products: totalProducts,
        customers: totalCustomers,
        pendingOrders,
        lowStockProducts: lowStockProducts.length,
      },
      recentOrders: recentOrders.map((o) => ({
        ...o,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
      })),
      lowStockProducts,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
