"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Edit, Trash2, Users, Shield, X, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
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
  }, [search, roleFilter]);

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

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none appearance-none bg-white"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Staff List */}
      <div className="bg-surface rounded-[1.35rem] border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Staff Member</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Phone</th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Joined</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 mx-auto" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : staff.length > 0 ? (
                staff.map((member) => (
                  <tr key={member.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {member.name?.slice(0, 2).toUpperCase() || "??"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">{member.name}</p>
                          <p className="text-xs text-text-muted truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", ROLE_COLORS[member.role] || "bg-gray-100 text-gray-700")}>
                        {member.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-secondary text-xs">
                      {member.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        member.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-muted text-xs">
                      {new Date(member.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 hover:bg-surface-muted rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} className="text-text-muted" />
                        </button>
                        {member.isActive ? (
                          <button
                            onClick={() => handleDeactivate(member)}
                            className="p-1.5 hover:bg-error/10 rounded-lg transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 size={14} className="text-error" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(member)}
                            className="p-1.5 hover:bg-success/10 rounded-lg transition-colors"
                            title="Reactivate"
                          >
                            <Shield size={14} className="text-success" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                    <Users size={32} className="mx-auto mb-2 text-text-muted" />
                    <p>No staff members found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="bg-surface rounded-[1.35rem] border border-border p-5">
        <h2 className="font-semibold text-sm mb-3">Role Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ROLES.map((role) => (
            <div key={role.value} className="p-3 bg-surface-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", ROLE_COLORS[role.value])}>
                  {role.label}
                </span>
              </div>
              <p className="text-xs text-text-muted">{role.description}</p>
            </div>
          ))}
        </div>
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
                <Button type="submit" size="lg" className="flex-1">
                  {editingStaff ? "Save Changes" : "Add Staff Member"}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
