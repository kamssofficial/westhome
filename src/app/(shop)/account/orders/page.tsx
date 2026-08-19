"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  items: { productName: string; quantity: number }[];
  createdAt: string;
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-shop py-4 md:py-8 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-serif mb-6">My Orders</h1>

      {loading ? (
        <div className="text-center py-8 text-text-muted">Loading...</div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="block bg-white rounded-xl border border-border-light p-4 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{order.orderNumber}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", getStatusColor(order.status))}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {order.items.map((i) => i.productName).join(", ")}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-semibold">{formatPrice(order.total)}</p>
                  <ChevronRight size={14} className="text-text-muted ml-auto mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto mb-3 text-text-muted" />
          <h3 className="font-semibold mb-1">No orders yet</h3>
          <p className="text-sm text-text-secondary mb-4">Start shopping to see your orders here.</p>
          <Link href="/shop" className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
            Browse Shop
          </Link>
        </div>
      )}
    </div>
  );
}
