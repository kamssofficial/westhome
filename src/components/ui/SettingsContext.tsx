"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface StoreSettings {
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  storeName: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  contactPhone: "+91 9895071144",
  whatsappNumber: "+91 9895071144",
  contactEmail: "info@westhomebybmd.com",
  storeName: "WESTHOME",
};

const SettingsContext = createContext<StoreSettings>(DEFAULT_SETTINGS);

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings({
            contactPhone: data.settings.contactPhone || DEFAULT_SETTINGS.contactPhone,
            whatsappNumber: data.settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
            contactEmail: data.settings.contactEmail || DEFAULT_SETTINGS.contactEmail,
            storeName: data.settings.storeName || DEFAULT_SETTINGS.storeName,
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
