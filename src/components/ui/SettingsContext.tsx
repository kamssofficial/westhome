"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface StoreSettings {
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  storeName: string;
}

// One definition of the fallback storefront identity. Everything else derives
// from it, so a contact-detail change is a single edit instead of four.
const DEFAULT_SETTINGS: StoreSettings = {
  contactPhone: "+91 95445 72445",
  whatsappNumber: "+91 95445 72445",
  contactEmail: "info@westhome.in",
  storeName: "WEST HOME",
};

const SettingsContext = createContext<StoreSettings>(DEFAULT_SETTINGS);

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data.settings) return;
        const saved = data.settings;
        setSettings({
          contactPhone: saved.contactPhone || DEFAULT_SETTINGS.contactPhone,
          whatsappNumber: saved.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
          contactEmail: saved.contactEmail || DEFAULT_SETTINGS.contactEmail,
          storeName: saved.storeName || DEFAULT_SETTINGS.storeName,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
