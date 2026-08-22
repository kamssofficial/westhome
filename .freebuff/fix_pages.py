
import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  Wrote {path} ({len(content)} bytes)")

print("Fixing all pages to remove fake data...")

# ============================================================
# SHOP PAGE - remove FALLBACK_CATEGORIES
# ============================================================
write_file("src/app/(shop)/shop/page.tsx", """"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Paintbrush, Shirt, BedDouble, Lamp, Flower2, Clock, Grid3X3 } from "lucide-react";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import type { Category } from "@/types";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "wall-decor": <Paintbrush size={22} className="text-secondary" />,
  "laundry": <Shirt size={22} className="text-secondary" />,
  "comforters": <BedDouble size={22} className="text-secondary" />,
  "lamps": <Lamp size={22} className="text-secondary" />,
  "carpets": <Grid3X3 size={22} className="text-secondary" />,
  "accessories": <Flower2 size={22} className="text-secondary" />,
  "clocks": <Clock size={22} className="text-secondary" />,
};

export default function ShopPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-semibold text-primary">Our Collections</h1>
        <p className="text-sm text-secondary mt-1">Explore our curated range of premium home essentials.</p>
      </div>

      {loading ? (
        <div className="px-4 py-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="skeleton h-24 rounded-xl" />))}
        </div>
      ) : categories.length > 0 ? (
        <div className="px-4 py-2 space-y-3">
          {categories.map((cat) => (
            <Link key={cat.id} href={"/collections/" + cat.slug} className="flex items-center bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-card transition-all group">
              <div className="relative w-28 h-24 flex-shrink-0 bg-surface-muted overflow-hidden">
                {cat.image ? (<Image src={cat.image} alt={cat.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="112px" />) : (<div className="w-full h-full flex items-center justify-center text-text-muted text-xs">{cat.name}</div>)}
              </div>
              <div className="flex-1 flex items-center gap-3 px-4">
                <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0">
                  {CATEGORY_ICONS[cat.slug] || <Flower2 size={22} className="text-secondary" />}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-primary">{cat.name}</h3>
                  <p className="text-sm text-secondary">{cat.productCount || 0} Items</p>
                </div>
              </div>
              <div className="pr-4"><ArrowRight size={20} className="text-text-muted group-hover:text-primary transition-colors" /></div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-4 py-12 text-center"><p className="text-sm text-secondary">No collections available yet.</p></div>
      )}

      <div className="px-4 py-6">
        <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center"><Flower2 size={20} className="text-secondary" /></div>
            <div>
              <p className="text-sm font-medium text-primary">Can&apos;t find what you&apos;re looking for?</p>
              <p className="text-xs text-secondary">Browse all our products and discover more.</p>
            </div>
          </div>
          <Link href="/shop/all" className="flex-shrink-0 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-hover transition-colors flex items-center gap-1">Shop All Products <ArrowRight size={12} /></Link>
        </div>
      </div>
    </div>
  );
}
""")

print("Done!")
