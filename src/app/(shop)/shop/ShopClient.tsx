"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import type { Category } from "@/types";
import { resolveCategoryImage } from "@/lib/categoryImages";
import { cachedFetchWithBackgroundRefresh } from "@/lib/clientCache";

// Check if cached data exists and is still valid
function hasCachedData(url: string): boolean {
  try {
    const raw = sessionStorage.getItem("wh-cache-" + url);
    if (!raw) return false;
    const entry = JSON.parse(raw);
    return entry.expires > Date.now();
  } catch {
    return false;
  }
}

export default function ShopPage() {
  const hasCache = hasCachedData("/api/categories");
  const [categories, setCategories] = useState<Category[]>(() => {
    return cachedFetchWithBackgroundRefresh<Category[]>("/api/categories", {
      ttl: 5 * 60_000,
      onUpdate: (data) => { if (data?.length) setCategories(data); },
    }) || [];
  });
  // No loading state needed

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories?.length) setCategories(data.categories);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="container-shop pt-10 pb-6 md:pt-16 md:pb-10">
        <p className="font-label mb-3 text-[9px] text-accent">Collections</p>
        <h1 className="font-display text-4xl md:text-6xl">Our collections.</h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-text-secondary">
          Explore our curated range of premium home essentials — each piece
          chosen to make your space feel more like you.
        </p>
      </section>

      {/* Category grid */}
      <section className="container-shop pb-20 md:pb-28">
        {categories.length > 0 ? (
          <div className="stagger-in grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {categories.map((cat, index) => (
              <Link
                key={cat.id}
                href={`/collections/${cat.slug}`}
                className="group block"
              >
                <div className="relative aspect-[.82] overflow-hidden rounded-[1.35rem] bg-surface-muted border border-foreground/[.08] transition-[transform,box-shadow,border-color] duration-500 ease-out group-hover:-translate-y-1 group-hover:border-foreground/[.16] group-hover:shadow-card-hover">
                  {resolveCategoryImage(cat.slug, cat.image) ? (
                    <Image
                      src={resolveCategoryImage(cat.slug, cat.image) as string}
                      alt={cat.name}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ) : cat.productCount === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-[#f7f5f2]">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#b0aba6]">Coming Soon</span>
                      <span className="text-sm font-medium text-text-muted">{cat.name}</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-sm font-medium bg-[#f7f5f2]">
                      {cat.name}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 text-[10px] font-bold text-white/80">
                    0{index + 1}
                  </span>
                  <span className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">
                    {cat.name}
                  </span>
                  <span className="absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur">
                    <ArrowUpRight size={14} />
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-semibold text-foreground">
                    {cat.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-text-muted text-sm">No collections available yet.</p>
          </div>
        )}
      </section>

      {/* Shop All CTA */}
      <section className="container-shop pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#1f2521] px-7 py-12 md:px-16 md:py-16 text-white">
          <div className="relative z-10">
            <p className="font-label mb-3 text-[9px] text-[#e0a681]">
              Browse everything
            </p>
            <h2 className="font-display text-3xl md:text-5xl leading-[.95]">
              Can&apos;t decide?
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-white/55">
              Browse all our products and discover something that speaks to
              you.
            </p>
            <Link
              href="/shop/all"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5 active:scale-[.97]"
            >
              Shop all products <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
