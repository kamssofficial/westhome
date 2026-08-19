"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Eye, ChevronDown } from "lucide-react";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

const STATUS_FILTERS = [
  { value: "", label: "All Orders" },
  { value: "NEW", label: "New" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("all", "true");
        params.set("page", String(page));
        params.set("limit", "20");
        if (statusFilter) params.set("status", statusFilter);

        const res = await fetch(`/api/orders?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders);
          setTotal(data.total);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [statusFilter, page]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Orders</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => { setStatusFilter(filter.value); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              statusFilter === filter.value
                ? "bg-primary text-white border-primary"
                : "bg-white text-text-secondary border-border hover:border-foreground/20"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-border-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-surface-muted/50">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Customer</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Total</th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-light">
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20 mx-auto" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-20 mx-auto" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-20 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-border-light last:border-0 hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-accent">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate max-w-[150px]">{order.customerName}</p>
                      <p className="text-xs text-text-muted">{order.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(order.status))}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={cn("text-xs", order.paymentStatus === "COMPLETED" ? "text-success" : "text-warning")}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted hidden md:table-cell">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="p-1.5 hover:bg-surface-muted rounded-lg inline-flex">
                        <Eye size={14} className="text-text-muted" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    {loading ? "Loading..." : "No orders found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-text-secondary">Page {page} of {Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
