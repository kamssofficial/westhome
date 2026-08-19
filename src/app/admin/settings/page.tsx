"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    storeName: "WESTHOME",
    contactPhone: "",
    contactEmail: "",
    whatsappNumber: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
    currency: "INR",
    freeDeliveryThreshold: "999",
    defaultDeliveryCharge: "49",
    estimatedDeliveryDays: "5",
    storePickup: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Settings saved!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      {/* Store Info */}
      <div className="bg-white rounded-xl border border-border-light p-5">
        <h2 className="font-semibold mb-4">Store Information</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Store Name</label>
            <input type="text" value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Contact Phone</label>
              <input type="tel" value={settings.contactPhone} onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })} className={inputClass} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">WhatsApp Number</label>
              <input type="tel" value={settings.whatsappNumber} onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })} className={inputClass} placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Email</label>
            <input type="email" value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Address</label>
            <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">City</label>
              <input type="text" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">State</label>
              <input type="text" value={settings.state} onChange={(e) => setSettings({ ...settings, state: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">PIN Code</label>
              <input type="text" value={settings.pinCode} onChange={(e) => setSettings({ ...settings, pinCode: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Currency</label>
              <input type="text" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery */}
      <div className="bg-white rounded-xl border border-border-light p-5">
        <h2 className="font-semibold mb-4">Delivery Configuration</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Free Delivery Threshold (₹)</label>
              <input type="number" value={settings.freeDeliveryThreshold} onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Default Delivery Charge (₹)</label>
              <input type="number" value={settings.defaultDeliveryCharge} onChange={(e) => setSettings({ ...settings, defaultDeliveryCharge: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Est. Delivery Days</label>
              <input type="number" value={settings.estimatedDeliveryDays} onChange={(e) => setSettings({ ...settings, estimatedDeliveryDays: e.target.value })} className={inputClass} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={settings.storePickup} onChange={(e) => setSettings({ ...settings, storePickup: e.target.checked })} className="accent-accent" />
            Enable Store Pickup
          </label>
        </div>
      </div>

      <Button onClick={handleSave} loading={loading} size="lg">Save Settings</Button>
    </div>
  );
}
