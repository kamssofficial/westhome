"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { useState, useEffect } from "react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: { productName: string; quantity: number; unitPrice: number; image?: string }[];
}

const TABS = ["All", "Processing", "Shipped", "Delivered"];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-amber-100 text-amber-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  ON_HOLD: "bg-orange-100 text-orange-800",
  PAYMENT_FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  ON_HOLD: "On Hold",
  PAYMENT_FAILED: "Payment Failed",
  REFUNDED: "Refunded",
};

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === "All"
    ? orders
    : orders.filter((o) => {
        const s = o.status.toUpperCase();
        if (activeTab === "Processing") return s === "NEW" || s === "CONFIRMED" || s === "PROCESSING" || s === "ON_HOLD";
        if (activeTab === "Shipped") return s === "SHIPPED" || s === "OUT_FOR_DELIVERY";
        if (activeTab === "Delivered") return s === "DELIVERED";
        return true;
      });

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <Link href="/account" className="p-1 hover:bg-surface-muted rounded-lg transition-colors"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-semibold text-primary">My Orders</h1>
      </div>

      <div className="px-4 pb-3">
        <div className="flex gap-1 bg-surface-muted rounded-xl p-1">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("flex-1 py-2 text-xs font-medium rounded-lg transition-colors", activeTab === tab ? "bg-white text-primary shadow-sm" : "text-secondary")}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3 pb-8">
        {loading ? (
          [1, 2, 3].map((i) => (<div key={i} className="skeleton h-32 rounded-xl" />))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-secondary">No orders found</p>
            <Link href="/shop" className="text-sm text-accent hover:underline mt-2 inline-block">Start shopping</Link>
          </div>
        ) : (
          filtered.map((order) => (
            <Link key={order.id} href={"/account/orders/" + order.id} className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-secondary">Order ID</p>
                  <p className="text-sm font-semibold text-primary">{order.orderNumber}</p>
                </div>
                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold", STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800")}>
                  {STATUS_LABELS[order.status] || order.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-secondary mb-2">Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              <div className="space-y-1.5">
                {order.items?.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {item.image ? (
                      <Image src={item.image} alt={item.productName} width={32} height={32} className="w-8 h-8 rounded object-cover bg-surface-muted flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-surface-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] text-text-muted">img</span>
                      </div>
                    )}
                    <p className="text-xs text-secondary truncate">{item.productName} x{item.quantity}</p>
                  </div>
                ))}
                {order.items?.length > 3 && (
                  <p className="text-[10px] text-text-muted">+{order.items.length - 3} more item{(order.items.length - 3) > 1 ? "s" : ""}</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-sm text-secondary">{order.items.length} item{order.items.length > 1 ? "s" : ""}</span>
                <span className="text-sm font-bold text-primary">{formatPrice(order.total)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
