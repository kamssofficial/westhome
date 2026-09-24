"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE",
    value: "",
    maxDiscountAmount: "",
    minOrderAmount: "",
    usageLimit: "",
    perCustomerLimit: "",
    startsAt: "",
    expiresAt: "",
  });

  const fetchCoupons = async () => {
    try {
      const res = await fetch("/api/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value),
          maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : null,
          minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
          usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        }),
      });
      if (res.ok) {
        toast.success("Coupon created");
        setShowForm(false);
        setForm({ code: "", type: "PERCENTAGE", value: "", maxDiscountAmount: "", minOrderAmount: "", usageLimit: "", perCustomerLimit: "", startsAt: "", expiresAt: "" });
        fetchCoupons();
      }
    } catch {
      toast.error("Failed to create coupon");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      toast.success("Coupon deleted");
      fetchCoupons();
    } catch {
      toast.error("Failed to delete coupon");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchCoupons();
    } catch {
      toast.error("Failed to update coupon");
    }
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Coupons</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> {showForm ? "Cancel" : "Create Coupon"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface rounded-[1.35rem] border border-border p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Code *</label>
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputClass} required placeholder="SUMMER20" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Value * {form.type === "PERCENTAGE" ? "(%)" : "(₹)"}</label>
              <input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Min Order (₹)</label>
              <input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Max Discount (₹)</label>
              <input type="number" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Usage Limit</label>
              <input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className={inputClass} />
            </div>
          </div>
          <Button type="submit" size="sm">Create Coupon</Button>
        </form>
      )}

      <div className="overflow-hidden rounded-[1.35rem] border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50">
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Code</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Type</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Value</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Usage</th>
              <th className="text-center px-4 py-3 font-medium text-text-secondary">Status</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Loading...</td></tr>
            ) : coupons.length > 0 ? (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono font-medium">{coupon.code}</td>
                  <td className="px-4 py-3 text-text-secondary">{coupon.type}</td>
                  <td className="px-4 py-3 text-right">{coupon.type === "PERCENTAGE" ? `${coupon.value}%` : formatPrice(coupon.value)}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-text-muted">{coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", coupon.isActive ? "bg-success/10 text-success" : "bg-gray-100 text-gray-500")}>
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggle(coupon.id, coupon.isActive)} className="p-1.5 hover:bg-surface-muted rounded-lg">
                        {coupon.isActive ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} className="text-text-muted" />}
                      </button>
                      <button onClick={() => handleDelete(coupon.id)} className="p-1.5 hover:bg-error/10 rounded-lg">
                        <Trash2 size={14} className="text-error" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No coupons yet</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
