"use client";
import { useSettings } from "@/components/ui/SettingsContext";
import { STORE_LOCATIONS } from "@/lib/storeLocations";

import { ArrowUpRight, Shield, Sparkles, Users } from "lucide-react";

export default function AboutPage() {
  const { contactPhone } = useSettings();
  return (
    <div className="animate-fade-in">
      {/* Hero section */}
      <div className="relative h-56 bg-gradient-to-br from-stone-800 to-stone-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <h1 className="text-2xl font-semibold text-white">About West Home</h1>
        </div>
      </div>

      {/* Brand story */}
      <div className="container-shop py-6">
        <p className="text-sm text-secondary leading-relaxed">
          At West Home, we believe that your home deserves the best. Our collections are
          thoughtfully curated to bring style, comfort and quality into your everyday life.
        </p>
        <p className="text-sm text-secondary leading-relaxed mt-3">
          West Home by BM Distributors is a premium home décor and lifestyle retail brand
          offering physical products designed to improve the appearance, comfort, organization,
          and atmosphere of residential interiors.
        </p>
        <p className="text-sm text-secondary leading-relaxed mt-3">
          From laundry baskets to frames to soap dispensers — every piece
          is chosen with care to help you create the home of your dreams.
        </p>
      </div>

      {/* Store Locations */}
      <div className="container-shop pb-6">
        <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-3">Visit Our Stores</h3>
          <div className="space-y-4">
            {STORE_LOCATIONS.map((store) => (
              <div key={store.id} className="text-sm text-secondary">
                <p className="font-medium text-primary">{store.label}</p>
                {store.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <a
                  href={store.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  Get directions <ArrowUpRight size={12} />
                </a>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-foreground/[.08] pt-3 text-sm text-secondary">
            <a href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`} className="text-accent hover:underline">{contactPhone}</a>
          </div>
        </div>
      </div>

      {/* Brand values */}
      <div className="container-shop space-y-4 pb-8">
        {[
          {
            icon: <Sparkles size={20} className="text-primary" />,
            title: "Premium Quality",
            desc: "Every product is handpicked and quality-tested to meet our high standards.",
          },
          {
            icon: <Shield size={20} className="text-primary" />,
            title: "Stylish & Timeless Designs",
            desc: "Our collections blend contemporary style with classic elegance.",
          },
          {
            icon: <Users size={20} className="text-primary" />,
            title: "Trusted by Thousands",
            desc: "Thousands of happy customers across Kerala and Karnataka trust West Home.",
          },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3 bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">{item.title}</h3>
              <p className="text-xs text-secondary mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
