"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Order { id: string; orderNumber: string; customerName: string; status: string; total: number; createdAt: string; items: { productName: string; quantity: number }[]; }

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border border-blue-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  SHIPPED: "bg-purple-50 text-purple-700 border border-purple-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
  RETURNED: "bg-orange-50 text-orange-700 border border-orange-200",
};

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("all", "true");
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");
      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setOrders(data?.orders || []);
      } else {
        toast.error(data?.error || "Failed to load orders");
      }
    } catch {
      toast.error("Failed to load orders");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        toast.success("Order updated");
      } else {
        toast.error(data?.error || "Failed to update order");
      }
    } catch {
      toast.error("Failed to update order");
    } finally { setUpdatingId(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1a1917]">Orders</h1>
        <p className="text-sm text-[#6b6560] mt-1">View and manage customer orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); fetchOrders(); }} className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aba6]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/[.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 text-[#1a1917]" />
        </form>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 pr-8 bg-white border border-black/[.08] rounded-xl text-sm focus:outline-none appearance-none text-[#1a1917]">
            <option value="">All Status</option>
            <option value="NEW">New</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b0aba6] pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#b0aba6] text-sm">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-[#b0aba6] text-sm">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[.06] bg-[#f7f5f2]">
                  <th className="text-left px-4 py-3 font-medium text-[#6b6560]">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6b6560]">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6b6560] hidden sm:table-cell">Items</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6b6560]">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6b6560]">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-[#6b6560]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.04]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#f7f5f2] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1a1917]">#{order.orderNumber}</p>
                      <p className="text-xs text-[#b0aba6]">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3 text-[#6b6560]">{order.customerName || "\u2014"}</td>
                    <td className="px-4 py-3 text-[#6b6560] hidden sm:table-cell">{order.items?.length || 0}</td>
                    <td className="px-4 py-3 font-medium text-[#1a1917]">₹{Number(order.total).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", STATUS_COLORS[order.status] || "bg-[#f0ede8] text-[#6b6560]")}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)}
                          disabled={updatingId === order.id}
                          className="px-2 py-1 pr-6 border border-black/[.08] rounded-lg text-xs focus:outline-none appearance-none bg-white text-[#1a1917]">
                          <option value="NEW">New</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="PROCESSING">Processing</option>
                          <option value="SHIPPED">Shipped</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#b0aba6] pointer-events-none" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
