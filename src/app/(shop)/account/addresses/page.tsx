"use client";

import { useState, useEffect } from "react";
import { MapPin, Plus, Trash2, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import toast from "react-hot-toast";

interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isDefault: boolean;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Bihar", "Delhi", "Goa", "Gujarat", "Haryana",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Punjab",
  "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal",
];

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", addressLine1: "", addressLine2: "",
    city: "", state: "", pinCode: "", country: "India",
  });

  useEffect(() => {
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((data) => setAddresses(data.addresses || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Address added");
        setShowForm(false);
        setForm({ name: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", pinCode: "", country: "India" });
        const data = await fetch("/api/addresses").then((r) => r.json());
        setAddresses(data.addresses || []);
      }
    } catch { toast.error("Failed to add address"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      setAddresses(addresses.filter((a) => a.id !== id));
      toast.success("Address deleted");
    } catch { toast.error("Failed to delete"); }
  };

  if (loading) return <div className="container-shop py-8"><div className="animate-pulse h-40 bg-surface-muted rounded-xl" /></div>;

  if (addresses.length === 0 && !showForm) {
    return (
      <div className="container-shop py-4 md:py-8">
        <h1 className="text-xl font-serif mb-6">My Addresses</h1>
        <EmptyState icon="product" title="No saved addresses" description="Add a delivery address to make checkout faster." />
        <div className="flex justify-center mt-2">
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add Address
          </Button>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="container-shop py-4 md:py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif">My Addresses</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> {showForm ? "Cancel" : "Add New"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-border-light p-4 md:p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Full Name *</label><input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Phone *</label><input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></div>
          </div>
          <div><label className="text-xs font-medium text-text-secondary mb-1 block">Address *</label><input type="text" required value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} className={inputClass} placeholder="House/Building, Street" /></div>
          <div><label className="text-xs font-medium text-text-secondary mb-1 block">Apt/Suite</label><input type="text" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} className={inputClass} /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2"><label className="text-xs font-medium text-text-secondary mb-1 block">City *</label><input type="text" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">State *</label><select required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass}><option value="">Select</option>{INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">PIN *</label><input type="text" required value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} className={inputClass} maxLength={6} /></div>
          </div>
          <Button type="submit" size="sm">Save Address</Button>
        </form>
      )}

      <div className="space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id} className="bg-white rounded-xl border border-border-light p-4 flex items-start gap-3">
            <MapPin size={18} className="text-accent mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{addr.name}</p>
                {addr.isDefault && <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded font-medium">Default</span>}
              </div>
              <p className="text-xs text-text-muted mt-0.5">{addr.phone}</p>
              <p className="text-sm text-text-secondary mt-1">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, {addr.city}, {addr.state} - {addr.pinCode}</p>
            </div>
            <button onClick={() => handleDelete(addr.id)} className="p-1.5 text-text-muted hover:text-error rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
