"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, Users, Shield, ShieldOff, X, Eye, EyeOff, MoreVertical, Pencil, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  permissions: string;
  createdAt: string;
  updatedAt: string;
  _count?: { orders: number };
}

const ROLES = [
  { value: "MANAGER", label: "Manager", description: "Full staff access to products, orders, and content" },
  { value: "PRODUCT_MANAGER", label: "Product Manager", description: "Manage products and inventory" },
  { value: "ORDER_MANAGER", label: "Order Manager", description: "Manage orders and deliveries" },
  { value: "CONTENT_MANAGER", label: "Content Manager", description: "Manage homepage, content, and promotions" },
  { value: "STAFF", label: "Staff", description: "Full product and catalog management access" },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  PRODUCT_MANAGER: "bg-amber-100 text-amber-700",
  ORDER_MANAGER: "bg-cyan-100 text-cyan-700",
  CONTENT_MANAGER: "bg-emerald-100 text-emerald-700",
  STAFF: "bg-orange-100 text-orange-700",
};

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "MANAGER",
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/staff?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openAddModal = () => {
    setEditingStaff(null);
    setForm({ name: "", email: "", password: "", phone: "", role: "MANAGER" });
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setForm({
      name: member.name || "",
      email: member.email || "",
      password: "",
      phone: member.phone || "",
      role: member.role,
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    if (!editingStaff && !form.password) {
      toast.error("Password is required for new staff");
      return;
    }

    try {
      const url = editingStaff
        ? `/api/admin/staff/${editingStaff.id}`
        : "/api/admin/staff";
      const method = editingStaff ? "PUT" : "POST";

      const body: any = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        role: form.role,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingStaff ? "Staff updated" : "Staff member added");
        setShowModal(false);
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save staff member");
    }
  };

  const handlePermanentDelete = async (member: StaffMember) => {
    if (!confirm("PERMANENTLY delete " + member.name + "? Their login will stop working. This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/staff/" + member.id + "?permanent=true", { method: "DELETE" });
      if (res.ok) { toast.success("Staff permanently deleted"); fetchStaff(); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Failed"); }
  };

  const handleDeactivate = async (member: StaffMember) => {
    if (!confirm(`Deactivate ${member.name}? They won't be able to log in.`)) return;
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Staff member deactivated");
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to deactivate");
      }
    } catch {
      toast.error("Failed to deactivate staff member");
    }
  };

  const handleReactivate = async (member: StaffMember) => {
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        toast.success("Staff member reactivated");
        fetchStaff();
      }
    } catch {
      toast.error("Failed to reactivate");
    }
  const handlePermanentDelete = async (member: StaffMember) => {
    if (!confirm(`Permanently delete ${member.name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/staff/${member.id}?permanent=true`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Staff member permanently deleted");
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete staff member");
    }
  };
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Staff Management</h1>
          <p className="text-sm text-text-muted mt-0.5">{staff.length} team members</p>
        </div>
        <Link href="/admin/staff/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1a1917] text-white rounded-xl text-sm font-medium hover:bg-[#2d2926] transition-colors">
          <Plus size={16} /> Add Staff
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aba6]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/[.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 text-[#1a1917]" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[{ v: "", l: "All" }, { v: "active", l: "Active" }, { v: "inactive", l: "Inactive" }].map(f => (
            <button key={f.v} onClick={() => setStatusFilter(f.v)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                statusFilter === f.v ? "bg-[#1a1917] text-white border-[#1a1917]" : "bg-white text-[#6b6560] border-black/[.08] hover:bg-[#f7f5f2]")}
            >{f.l}</button>
          ))}
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-[#6b6560] border border-black/[.08] appearance-none pr-6 focus:outline-none">
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {/* Staff List */}
            <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-black/[.06] p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2"><div className="h-4 w-32 bg-gray-100 rounded" /><div className="h-3 w-48 bg-gray-100 rounded" /></div>
              </div>
            </div>
          ))
        ) : staff.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/[.06] p-12 text-center">
            <Users size={32} className="mx-auto mb-2 text-[#b0aba6]" />
            <p className="text-sm text-[#8a857f]">No staff members found</p>
          </div>
        ) : (
          staff.map((member) => {
            const initials = member.name?.slice(0, 2).toUpperCase() || "??";
            const roleLabel = ROLES.find(r => r.value === member.role)?.label || member.role.replace(/_/g, " ");
            const date = new Date(member.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            return (
              <div key={member.id} className="bg-white rounded-2xl border border-black/[.06] p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-medium">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm text-[#1a1917] truncate">{member.name}</h3>
                      <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0",
                        member.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600")}>
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-[#8a857f] truncate mt-0.5">{member.email}</p>
                    {member.phone && <p className="text-xs text-[#b0aba6] mt-0.5">{member.phone}</p>}
                  </div>
                  <div className="relative flex-shrink-0" ref={openMenuId === member.id ? menuRef : undefined}>
                    <button onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#b0aba6] hover:bg-[#f7f5f2] active:bg-[#ece8e1] transition-colors">
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === member.id && (
                      <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-black/[.08] shadow-lg z-40 py-1">
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-[#b0aba6] uppercase tracking-wider">Staff actions</p>
                        <button onClick={() => { setForm({ name: member.name, email: member.email, password: "", phone: member.phone || "", role: member.role }); setEditingStaff(member); setShowModal(true); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#1a1917] hover:bg-[#f7f5f2]"><Pencil size={14} className="text-[#6b6560]" /> Edit Staff</button>
                        {member.isActive ? (
                          <button onClick={() => { handleDeactivate(member); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"><ShieldOff size={14} /> Deactivate</button>
                        ) : (
                          <button onClick={() => { handleReactivate(member); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"><Shield size={14} /> Activate</button>
                        )}
                        <button onClick={() => { setEditingStaff(member); setShowModal(true); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#1a1917] hover:bg-[#f7f5f2]"><Lock size={14} className="text-[#6b6560]" /> Manage Permissions</button>
                        <div className="border-t border-black/[.06] my-1" />
                        <button onClick={() => { handlePermanentDelete(member); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete Permanently</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/[.04]">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", ROLE_COLORS[member.role] || "bg-gray-100 text-gray-700")}>{roleLabel}</span>
                    {member._count?.orders ? <span className="text-[10px] text-[#b0aba6]">{member._count.orders} orders</span> : null}
                  </div>
                  <span className="text-[10px] text-[#b0aba6]">Joined {date}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-modal animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold">{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-muted rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">
                  {editingStaff ? "New Password (leave blank to keep)" : "Password *"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={cn(inputClass, "pr-10")}
                    required={!editingStaff}
                    placeholder={editingStaff ? "••••••••" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={inputClass}
                  required
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-text-muted mt-1">
                  {ROLES.find((r) => r.value === form.role)?.description}
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#1a1917] rounded-xl hover:bg-stone-800 transition-colors">
                  {editingStaff ? "Save Changes" : "Add Staff Member"}
                </button>
                <button type="button" className="px-4 py-2.5 text-sm font-medium text-[#6b6560] bg-white border border-black/[.08] rounded-xl hover:bg-[#f7f5f2] transition-colors" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
