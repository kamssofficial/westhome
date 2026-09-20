"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff,
  Shield, Check, AlertCircle, Loader2, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PERMISSIONS = [
  { id: "dashboard", label: "Dashboard", group: "General" },
  { id: "view_orders", label: "View Orders", group: "Orders" },
  { id: "manage_orders", label: "Manage Orders", group: "Orders" },
  { id: "view_products", label: "View Products", group: "Products" },
  { id: "add_products", label: "Add Products", group: "Products" },
  { id: "edit_products", label: "Edit Products", group: "Products" },
  { id: "manage_inventory", label: "Manage Inventory", group: "Products" },
  { id: "view_customers", label: "View Customers", group: "Customers" },
  { id: "manage_categories", label: "Manage Categories", group: "Catalogue" },
  { id: "manage_homepage", label: "Manage Homepage", group: "Content" },
  { id: "manage_delivery", label: "Manage Delivery Settings", group: "Settings" },
];

const ROLE_OPTIONS = [
  { value: "MANAGER", label: "Manager", desc: "Manage products, orders, and content" },
  { value: "PRODUCT_MANAGER", label: "Product Manager", desc: "Manage products and inventory" },
  { value: "ORDER_MANAGER", label: "Order Manager", desc: "Manage orders and deliveries" },
  { value: "CONTENT_MANAGER", label: "Content Manager", desc: "Manage homepage, content, and promotions" },
];

const ROLE_COLORS: Record<string, string> = {
  MANAGER: "bg-blue-50 text-blue-700 border border-blue-200",
  PRODUCT_MANAGER: "bg-amber-50 text-amber-700 border border-amber-200",
  ORDER_MANAGER: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  CONTENT_MANAGER: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  role?: string;
  submit?: string;
}

export default function AddStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "MANAGER",
    permissions: [] as string[],
    isActive: true,
  });

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    // Clear field error on change
    if (errors[key as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const togglePermission = (permId: string) => {
    set("permissions",
      form.permissions.includes(permId)
        ? form.permissions.filter(p => p !== permId)
        : [...form.permissions, permId]
    );
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    if (form.phone && !/^\+?[\d\s()-]{7,15}$/.test(form.phone)) e.phone = "Enter a valid phone number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim() || null,
          role: form.role,
          permissions: form.permissions,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/admin/staff"), 1500);
      } else {
        if (data.error?.includes("already")) {
          setErrors({ email: "This email address is already registered." });
        } else {
          setErrors({ submit: data.error || "Failed to create staff member." });
        }
      }
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const groupedPerms = PERMISSIONS.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {} as Record<string, typeof PERMISSIONS>);

  const inputCls = cn(
    "w-full px-3 py-2.5 bg-white border rounded-xl text-sm text-[#1a1917] transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30",
    "placeholder:text-[#b0aba6]"
  );

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-[#1a1917] mb-2">Staff Account Created</h2>
          <p className="text-sm text-[#6b6560]">Redirecting to staff list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/staff" className="p-2 hover:bg-black/[.04] rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-[#6b6560]" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[#1a1917]">Add New Staff</h1>
          <p className="text-sm text-[#6b6560]">Create a new staff account</p>
        </div>
      </div>

      {errors.submit && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={16} /> {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STAFF INFORMATION */}
        <div className="bg-white rounded-2xl border border-black/[.06] p-5">
          <h2 className="text-[11px] font-semibold text-[#1a1917] uppercase tracking-[.12em] mb-4">Staff Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Full Name *</label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="John Smith" className={cn(inputCls, errors.name && "border-red-400")} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Email Address *</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="john@westhome.in" className={cn(inputCls, errors.email && "border-red-400")} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                placeholder="+91 XXXXX XXXXX" className={cn(inputCls, errors.phone && "border-red-400")} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Profile Photo</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#f0ede8] flex items-center justify-center flex-shrink-0">
                  <Camera size={18} className="text-[#b0aba6]" />
                </div>
                <span className="text-xs text-[#b0aba6]">Optional — upload later</span>
              </div>
            </div>
          </div>
        </div>

        {/* LOGIN & SECURITY */}
        <div className="bg-white rounded-2xl border border-black/[.06] p-5">
          <h2 className="text-[11px] font-semibold text-[#1a1917] uppercase tracking-[.12em] mb-4">Login & Security</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Password *</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.password}
                  onChange={e => set("password", e.target.value)} placeholder="Min. 8 characters"
                  className={cn(inputCls, "pr-10", errors.password && "border-red-400")} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0aba6] hover:text-[#6b6560]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Confirm Password *</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={form.confirmPassword}
                  onChange={e => set("confirmPassword", e.target.value)} placeholder="Re-enter password"
                  className={cn(inputCls, "pr-10", errors.confirmPassword && "border-red-400")} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0aba6] hover:text-[#6b6560]">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>
        </div>

        {/* ROLE & PERMISSIONS */}
        <div className="bg-white rounded-2xl border border-black/[.06] p-5">
          <h2 className="text-[11px] font-semibold text-[#1a1917] uppercase tracking-[.12em] mb-4">Role & Permissions</h2>
          <div className="mb-4">
            <label className="text-xs font-medium text-[#6b6560] mb-2 block">Staff Role *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(r => (
                <button key={r.value} type="button" onClick={() => set("role", r.value)}
                  className={cn("p-3 rounded-xl text-left transition-all border",
                    form.role === r.value
                      ? "border-[#1a1917] bg-[#1a1917] text-white shadow-sm"
                      : "border-black/[.08] bg-white text-[#6b6560] hover:border-black/[.15]"
                  )}>
                  <span className="text-sm font-medium block">{r.label}</span>
                  <span className={cn("text-[10px] mt-0.5 block",
                    form.role === r.value ? "text-white/60" : "text-[#b0aba6]"
                  )}>{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#6b6560] mb-2 block">Permissions</label>
            <div className="space-y-4">
              {Object.entries(groupedPerms).map(([group, perms]) => (
                <div key={group}>
                  <p className="text-[10px] font-semibold text-[#b0aba6] uppercase tracking-[.1em] mb-2">{group}</p>
                  <div className="space-y-1.5">
                    {perms.map(perm => {
                      const checked = form.permissions.includes(perm.id);
                      return (
                        <button key={perm.id} type="button" onClick={() => togglePermission(perm.id)}
                          className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all w-full text-left",
                            checked ? "bg-[#1a1917]/5 text-[#1a1917]" : "text-[#6b6560] hover:bg-black/[.02]"
                          )}>
                          <div className={cn("w-4.5 h-4.5 rounded flex items-center justify-center border transition-colors flex-shrink-0",
                            checked ? "bg-[#1a1917] border-[#1a1917]" : "border-black/[.15] bg-white"
                          )}>
                            {checked && <Check size={10} className="text-white" />}
                          </div>
                          {perm.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ACCOUNT STATUS */}
        <div className="bg-white rounded-2xl border border-black/[.06] p-5">
          <h2 className="text-[11px] font-semibold text-[#1a1917] uppercase tracking-[.12em] mb-4">Account Status</h2>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => set("isActive", true)}
              className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                form.isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "border-black/[.08] text-[#6b6560] hover:border-black/[.15]"
              )}>
              <div className={cn("w-3 h-3 rounded-full", form.isActive ? "bg-emerald-500" : "bg-[#b0aba6]")} />
              Active
            </button>
            <button type="button" onClick={() => set("isActive", false)}
              className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                !form.isActive
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "border-black/[.08] text-[#6b6560] hover:border-black/[.15]"
              )}>
              <div className={cn("w-3 h-3 rounded-full", !form.isActive ? "bg-red-500" : "bg-[#b0aba6]")} />
              Inactive
            </button>
          </div>
          <p className="text-[10px] text-[#b0aba6] mt-2">
            {form.isActive
              ? "New staff will be able to log in immediately."
              : "Inactive accounts cannot log in."}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3 justify-end">
          <Link href="/admin/staff"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#6b6560] hover:bg-black/[.04] transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-[#1a1917] text-white rounded-xl text-sm font-semibold hover:bg-[#2d2926] transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Creating..." : "Create Staff"}
          </button>
        </div>
      </form>
    </div>
  );
}
