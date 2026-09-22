"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Eye, ChevronDown, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";
import toast from "react-hot-toast";

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

function AdminOrdersPageContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string, orderNumber: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete order ${orderNumber} permanently? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast.success(`Order ${orderNumber} deleted`);
        setOrders((prev) => prev.filter((o) => o.id !== id));        setTotal((t) => Math.max(0, t - 1));
      } else {
        toast.error(data?.error || "Failed to delete order");
      }
    } catch {
      toast.error("Failed to delete order");
    } finally {
      setDeletingId(null);
    }
  };

  const clearOrderHistory = async () => {
    if (!window.confirm("Clear the entire order history permanently? This deletes ALL orders and cannot be undone.")) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/orders`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Cleared ${data.deletedOrders || 0} orders from history`);
        setOrders([]);
        setTotal(0);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to clear order history");
      }
    } catch { toast.error("Failed to clear order history"); }
    finally { setClearing(false); }
  };

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
        if (res.status === 401 || res.status === 403) {
          // Stale/expired session — bounce to login instead of a stuck empty table.
          window.location.href = "/login";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
          setTotal(data.total || 0);
        } else {
          toast.error("Failed to load orders");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [statusFilter, page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Orders</h1>
        <Button variant="outline" size="sm" onClick={clearOrderHistory} loading={clearing}>
          <Trash2 size={14} /> Clear Order History
        </Button>
      </div>

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
      <div className="bg-surface rounded-[1.35rem] border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50">
                <th className="text-left px-3 py-3 font-medium text-text-secondary">Order</th>
                <th className="text-right px-3 py-3 font-medium text-text-secondary">Total</th>
                <th className="text-center px-3 py-3 font-medium text-text-secondary hidden sm:table-cell">Status</th>
                <th className="text-center px-3 py-3 font-medium text-text-secondary hidden md:table-cell">Payment</th>
                <th className="text-right px-3 py-3 font-medium text-text-secondary hidden md:table-cell">Date</th>
                <th className="text-right px-3 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-3 py-3"><Skeleton className="h-5 w-20" /><Skeleton className="h-3 w-24 mt-1" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-5 w-16 ml-auto" /></td>
                    <td className="px-3 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-20 mx-auto" /></td>
                    <td className="px-3 py-3 hidden md:table-cell"><Skeleton className="h-5 w-20 mx-auto" /></td>
                    <td className="px-3 py-3 hidden md:table-cell"><Skeleton className="h-5 w-20 ml-auto" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-5 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                    <td className="px-3 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-accent text-xs sm:text-sm">
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-text-muted truncate max-w-[100px] sm:max-w-none">{order.customerName}</p>
                      <span className={cn("sm:hidden inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium", getStatusColor(order.status))}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-xs sm:text-sm">{formatPrice(order.total)}</td>
                    <td className="px-3 py-3 text-center hidden sm:table-cell">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(order.status))}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center hidden md:table-cell">
                      <span className={cn("text-xs", order.paymentStatus === "COMPLETED" ? "text-success" : "text-warning")}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-text-muted hidden md:table-cell text-xs">{formatDate(order.createdAt)}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/orders/${order.id}`} className="p-1.5 hover:bg-surface-muted rounded-lg inline-flex" title="View order">
                          <Eye size={14} className="text-text-muted" />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(e, order.id, order.orderNumber)}
                          disabled={deletingId === order.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          title="Delete order"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    No orders found
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

export default function AdminOrdersPage() {
  return <Suspense fallback={<div className="space-y-4"><div className="h-8 w-32 bg-gray-100 rounded animate-pulse" /></div>}><AdminOrdersPageContent /></Suspense>;
}