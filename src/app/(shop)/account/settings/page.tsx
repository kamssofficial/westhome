"use client";

import { useState } from "react";
import { User, Mail, Phone, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Profile updated");
      } else {
        toast.error("Failed to update profile");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="container-shop py-4 md:py-8 max-w-xl animate-fade-in">
      <h1 className="text-xl md:text-2xl font-serif mb-6">Account Settings</h1>

      <div className="bg-white rounded-xl border border-border-light p-4 md:p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} pl-10`} placeholder="Your name" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputClass} pl-10`} placeholder="your@email.com" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1 block">Phone</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputClass} pl-10`} placeholder="+91 XXXXX XXXXX" />
          </div>
        </div>
        <Button onClick={handleSave} loading={loading}>Save Changes</Button>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-border-light p-4 md:p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Lock size={14} /> Change Password
        </h2>
        <div className="space-y-3">
          <input type="password" className={inputClass} placeholder="Current password" />
          <input type="password" className={inputClass} placeholder="New password (min. 6 characters)" />
          <input type="password" className={inputClass} placeholder="Confirm new password" />
          <Button variant="outline" size="sm">Update Password</Button>
        </div>
      </div>
    </div>
  );
}
