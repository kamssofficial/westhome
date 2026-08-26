"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronDown, Eye } from "lucide-react";
import { cn, formatPrice, formatDate, getStatusColor } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  items: { productName: string; quantity: number; sku?: string | null }[];
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

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
        let filteredOrders = data.orders || [];
        // Client-side search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          filteredOrders = filteredOrders.filter((o: Order) =>
            o.orderNumber.toLowerCase().includes(q) ||
            (o.customerName || "").toLowerCase().includes(q) ||
            (o.customerPhone || "").includes(q)
          );
        }
        setOrders(filteredOrders);
        setTotal(data.total || 0);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter, page]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    } catch {} finally { setUpdatingId(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1a1917]">Orders</h1>
        <p className="text-sm text-[#6b6560] mt-1">View and manage customer orders</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aba6]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") fetchOrders(); }}
          placeholder="Search by order number, customer name, or phone..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/[.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 text-[#1a1917]"
        />
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              statusFilter === f.value
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-[#6b6560] border-black/[.08] hover:border-black/20"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[.06] bg-[#f7f5f2]">
                <th className="text-left px-4 py-3 font-medium text-[#6b6560]">Order</th>
                <th className="text-left px-4 py-3 font-medium text-[#6b6560]">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-[#6b6560] hidden sm:table-cell">Items</th>
                <th className="text-right px-4 py-3 font-medium text-[#6b6560]">Total</th>
                <th className="text-center px-4 py-3 font-medium text-[#6b6560]">Status</th>
                <th className="text-center px-4 py-3 font-medium text-[#6b6560] hidden md:table-cell">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-[#6b6560] hidden md:table-cell">Date</th>
                <th className="text-center px-4 py-3 font-medium text-[#6b6560]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[.04]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-28 bg-gray-100 rounded" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-12 bg-gray-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-100 rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-100 rounded mx-auto" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-16 bg-gray-100 rounded mx-auto" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-16 bg-gray-100 rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 bg-gray-100 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#f7f5f2]/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-semibold text-[#1a1917] hover:text-[#d4a574] transition-colors">
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate max-w-[150px] text-[#6b6560]">{order.customerName}</p>
                      <p className="text-xs text-[#b0aba6]">{order.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-[#6b6560] hidden sm:table-cell">{order.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1a1917]">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", getStatusColor(order.status))}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={cn("text-xs", order.paymentStatus === "COMPLETED" ? "text-emerald-600" : "text-amber-600")}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#b0aba6] text-xs hidden md:table-cell">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Link href={`/admin/orders/${order.id}`} className="p-1.5 hover:bg-[#f0ede8] rounded-lg inline-flex" title="View order">
                          <Eye size={14} className="text-[#6b6560]" />
                        </Link>
                        <div className="relative">
                          <select
                            value={order.status}
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                            disabled={updatingId === order.id}
                            className="px-2 py-1 pr-6 border border-black/[.08] rounded-lg text-xs focus:outline-none appearance-none bg-white text-[#1a1917]"
                          >
                            <option value="NEW">New</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#b0aba6] pointer-events-none" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#b0aba6]">
                    {loading ? "Loading..." : "No orders found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium border border-black/[.08] rounded-xl hover:bg-[#f7f5f2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[#6b6560]">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-4 py-2 text-sm font-medium border border-black/[.08] rounded-xl hover:bg-[#f7f5f2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
