"use client";

import { useState, useEffect } from "react";
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  recentOrders: any[];
}

export default function StaffDashboard() {
  const [stats, setStats] = useState<Stats>({ totalProducts: 0, totalOrders: 0, totalCustomers: 0, recentOrders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products?limit=1").then(r => r.json()),
      fetch("/api/orders?limit=5").then(r => r.json()).catch(() => ({ orders: [] })),
      fetch("/api/customers?limit=1").then(r => r.json()).catch(() => ({ total: 0 })),
    ]).then(([products, orders, customers]) => {
      setStats({
        totalProducts: products.total || 0,
        totalOrders: orders.total || orders.orders?.length || 0,
        totalCustomers: customers.total || 0,
        recentOrders: orders.orders || [],
      });
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: "Products", value: stats.totalProducts, icon: Package, color: "bg-blue-50 text-blue-600" },
    { label: "Orders", value: stats.totalOrders, icon: ShoppingCart, color: "bg-emerald-50 text-emerald-600" },
    { label: "Customers", value: stats.totalCustomers, icon: Users, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Staff Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Overview of store activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-surface rounded-[1.35rem] p-5 border border-border">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-stone-900">
                    {loading ? "—" : stat.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-surface rounded-[1.35rem] p-5 border border-border">
        <h2 className="text-sm font-semibold text-stone-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a href="/staff/orders" className="flex items-center gap-2 px-4 py-3 bg-surface-muted/30 hover:bg-surface-muted rounded-lg transition-colors text-sm font-medium text-stone-700">
            <ShoppingCart size={16} /> View Orders
          </a>
          <a href="/staff/products" className="flex items-center gap-2 px-4 py-3 bg-surface-muted/30 hover:bg-surface-muted rounded-lg transition-colors text-sm font-medium text-stone-700">
            <Package size={16} /> View Products
          </a>
          <a href="/staff/customers" className="flex items-center gap-2 px-4 py-3 bg-surface-muted/30 hover:bg-surface-muted rounded-lg transition-colors text-sm font-medium text-stone-700">
            <Users size={16} /> View Customers
          </a>
          <a href="/" className="flex items-center gap-2 px-4 py-3 bg-surface-muted/30 hover:bg-surface-muted rounded-lg transition-colors text-sm font-medium text-stone-700">
            <TrendingUp size={16} /> View Store
          </a>
        </div>
      </div>
    </div>
  );
}
