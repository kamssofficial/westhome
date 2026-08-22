const fs = require('fs');

const storePage = `"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Clock, Phone } from "lucide-react";
import { useState, useEffect } from "react";

interface StoreLocation {
  name: string;
  brand: string;
  address: string;
  hours: string;
  image: string;
  phone?: string;
}

export default function ContactPage() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const settings = data.settings || {};
        const phone = settings.contactPhone || "";
        // Store locations come from settings or are empty
        const storeLocations: StoreLocation[] = [];
        setStores(storeLocations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <Link href="/" className="p-1 hover:bg-surface-muted rounded-lg transition-colors"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-semibold text-primary">Our Store Locations</h1>
      </div>

      <div className="px-4 space-y-4 py-4 pb-8">
        {loading ? (
          [1, 2, 3].map((i) => (<div key={i} className="skeleton h-64 rounded-xl" />))
        ) : stores.length > 0 ? (
          stores.map((store) => (
            <div key={store.name} className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="relative h-40 bg-surface-muted overflow-hidden">
                <Image src={store.image} alt={store.name} fill className="object-cover" sizes="100vw" />
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold text-primary">{store.name}</h3>
                <p className="text-xs text-secondary mt-0.5">{store.brand}</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-secondary mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-secondary">{store.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-secondary flex-shrink-0" />
                    <span className="text-xs text-secondary">{store.hours}</span>
                  </div>
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-secondary flex-shrink-0" />
                      <span className="text-xs text-secondary">{store.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-secondary">Store locations coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/(shop)/contact/page.tsx', storePage, 'utf-8');
console.log('Wrote store locations page (' + storePage.length + ' bytes)');
