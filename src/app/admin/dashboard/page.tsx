"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, ShoppingBag, Package, Users, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";

interface DashboardStats {
  revenue: number;
  orders: number;
  pendingOrders: number;
  products: number;
  customers: number;
  lowStockProducts: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    orders: 0,
    pendingOrders: 0,
    products: 0,
    customers: 0,
    lowStockProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentOrders(data.recentOrders);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const statCards = [
    { label: "Revenue", value: formatPrice(stats.revenue), icon: DollarSign, color: "text-success", bg: "bg-success/10" },
    { label: "Orders", value: stats.orders, icon: ShoppingBag, color: "text-info", bg: "bg-info/10" },
    { label: "Products", value: stats.products, icon: Package, color: "text-accent", bg: "bg-accent/10" },
    { label: "Customers", value: stats.customers, icon: Users, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Pending Orders", value: stats.pendingOrders, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Low Stock", value: stats.lowStockProducts, icon: AlertTriangle, color: "text-error", bg: "bg-error/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">Welcome to WESTHOME Admin</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-border-light p-4">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", card.bg)}>
              <card.icon size={18} className={card.color} />
            </div>
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-text-secondary mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-border-light">
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-accent hover:underline">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Customer</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Total</th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border-light last:border-0 hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-accent">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(order.status))}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">{formatDate(order.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                    {loading ? "Loading..." : "No orders yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
