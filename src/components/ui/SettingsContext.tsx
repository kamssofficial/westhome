"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface StoreSettings {
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  storeName: string;
}

const SettingsContext = createContext<StoreSettings>({
  contactPhone: "+91 98950 71144",
  whatsappNumber: "+91 98950 71144",
  contactEmail: "info@westhomebybmd.com",
  storeName: "WESTHOME",
});

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>({
    contactPhone: "+91 98950 71144",
    whatsappNumber: "+91 98950 71144",
    contactEmail: "info@westhomebybmd.com",
    storeName: "WESTHOME",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings({
            contactPhone: data.settings.contactPhone || "+91 98950 71144",
            whatsappNumber: data.settings.whatsappNumber || "+91 98950 71144",
            contactEmail: data.settings.contactEmail || "info@westhomebybmd.com",
            storeName: data.settings.storeName || "WESTHOME",
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
