"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Truck, Shield, RotateCcw, HeadphonesIcon, MessageCircle } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import Button from "@/components/ui/Button";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import type { Product, Category } from "@/types";

const FALLBACK_CATEGORIES: Category[] = [
  { id: "1", name: "Wall Decor", slug: "wall-decor", image: "/images/categories/wall-decor.svg", isActive: true, position: 1, subcategories: [] },
  { id: "2", name: "Laundry", slug: "laundry", image: "/images/categories/laundry.svg", isActive: true, position: 2, subcategories: [] },
  { id: "3", name: "Comforters", slug: "comforters", image: "/images/categories/comforters.svg", isActive: true, position: 3, subcategories: [] },
  { id: "4", name: "Lamps", slug: "lamps", image: "/images/categories/lamps.svg", isActive: true, position: 4, subcategories: [] },
  { id: "5", name: "Carpets", slug: "carpets", image: "/images/categories/carpets.svg", isActive: true, position: 5, subcategories: [] },
  { id: "6", name: "Clocks", slug: "clocks", image: "/images/categories/clocks.svg", isActive: true, position: 6, subcategories: [] },
  { id: "7", name: "Accessories", slug: "accessories", image: "/images/categories/accessories.svg", isActive: true, position: 7, subcategories: [] },
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featRes, newRes] = await Promise.allSettled([
          fetch("/api/categories"),
          fetch("/api/products?featured=true&limit=4"),
          fetch("/api/products?newArrivals=true&limit=4"),
        ]);

        if (catRes.status === "fulfilled" && catRes.value.ok) {
          const catData = await catRes.value.json();
          if (catData.categories?.length) setCategories(catData.categories);
        }
        if (featRes.status === "fulfilled" && featRes.value.ok) {
          const featData = await featRes.value.json();
          setFeaturedProducts(featData.products || []);
        }
        if (newRes.status === "fulfilled" && newRes.value.ok) {
          const newData = await newRes.value.json();
          setNewArrivals(newData.products || []);
        }
      } catch (err) {
        console.error("Homepage fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="relative h-[85vh] md:h-[90vh] overflow-hidden">
        <Image src="/images/banners/hero.svg" alt="" fill className="absolute inset-0 w-full h-full object-cover" priority />
        <div className="hero-gradient absolute inset-0" />

        <div className="relative h-full flex items-center justify-center text-center">
          <div className="container-shop">
            <p className="font-label text-accent mb-4 md:mb-6">
              Premium Home & Lifestyle
            </p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-text-inverse leading-[1.05] mb-4 md:mb-6 max-w-3xl mx-auto">
              Elevate Your
              <br />
              Living Space
            </h1>
            <p className="text-text-inverse/60 text-sm md:text-base mb-8 md:mb-10 max-w-md mx-auto leading-relaxed">
              Handpicked home décor, comforters, lamps, and lifestyle
              accessories that transform your house into a home.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/shop">
                <Button variant="accent" size="lg">
                  Explore Collection
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/collections/comforters">
                <Button variant="ghost" size="lg" className="text-text-inverse border border-text-inverse/20 hover:bg-text-inverse/10">
                  Shop Comforters
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SHOP BY CATEGORY
          ============================================================ */}
      <section className="py-16 md:py-24">
        <div className="container-shop">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div>
              <p className="font-label text-accent mb-2">Collections</p>
              <h2 className="font-display text-2xl md:text-3xl text-foreground">
                Shop by Category
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-sm font-medium text-secondary hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden -mx-1 px-1">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/collections/${cat.slug}`}
                  className="flex-shrink-0 w-24"
                >
                  <div className="aspect-square bg-surface-muted overflow-hidden mb-2 border border-border">
                    {cat.image ? (
                      <Image src={cat.image} alt={cat.name} width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
                        {cat.name.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-center text-foreground truncate">
                    {cat.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop: clean grid */}
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-7 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/collections/${cat.slug}`}
                className="group text-center"
              >
                <div className="aspect-square bg-surface-muted overflow-hidden mb-3 border border-border group-hover:border-accent transition-colors duration-300">
                  {cat.image ? (
                    <Image src={cat.image} alt={cat.name} width={200} height={200} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
                      {cat.name.slice(0, 2)}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-foreground group-hover:text-accent transition-colors">
                  {cat.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURED PRODUCTS — Asymmetric layout
          ============================================================ */}
      <section className="py-16 md:py-24 bg-surface-muted/30">
        <div className="container-shop">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div>
              <p className="font-label text-accent mb-2">Curated</p>
              <h2 className="font-display text-2xl md:text-3xl text-foreground">
                Featured Products
              </h2>
            </div>
            <Link
              href="/shop?sort=featured"
              className="text-sm font-medium text-secondary hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <ProductGridSkeleton count={4} className="lg:grid-cols-3" />
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 stagger-in">
              {/* First product: large on left */}
              {featuredProducts[0] && (
                <div className="col-span-2 lg:col-span-1 lg:row-span-2">
                  <ProductCard product={featuredProducts[0]} priority />
                </div>
              )}
              {/* Remaining products: stacked on right */}
              {featuredProducts.slice(1, 4).map((product, i) => (
                <div key={product.id}>
                  <ProductCard product={product} priority={i < 2} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-text-muted text-sm mb-4">
                Featured products coming soon. Visit the shop to explore our full collection.
              </p>
              <Link href="/shop">
                <Button variant="primary" size="md">
                  Browse Shop
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          PROMOTIONAL BANNER
          ============================================================ */}
      <section className="py-16 md:py-24">
        <div className="container-shop">
          <div className="relative overflow-hidden bg-surface-muted border border-border">
            <Image src="/images/banners/promo-comforters.svg" alt="" fill className="absolute inset-0 w-full h-full object-cover opacity-40" />
            <div className="relative z-10 px-8 py-14 md:px-16 md:py-20 text-center">
              <p className="font-label text-accent mb-3">
                Limited Time
              </p>
              <h2 className="font-display text-2xl md:text-4xl text-foreground mb-4">
                Premium Comforters Collection
              </h2>
              <p className="text-text-secondary text-sm md:text-base mb-8 max-w-lg mx-auto">
                Experience luxury sleep with our curated comforter range.
                Quality materials, exceptional comfort.
              </p>
              <Link href="/collections/comforters">
                <Button variant="primary" size="lg">
                  Shop Now
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          LIFESTYLE COLLECTION
          ============================================================ */}
      <section className="py-16 md:py-24">
        <div className="container-shop">
          <div className="relative overflow-hidden bg-surface-muted border border-border">
            <Image src="/images/banners/lifestyle-collection.svg" alt="" fill className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="relative z-10 px-8 py-14 md:px-16 md:py-20 text-left max-w-xl">
              <p className="font-label text-accent mb-3">
                Curated for You
              </p>
              <h2 className="font-display text-2xl md:text-4xl text-foreground mb-4">
                Premium Lifestyle
                <br />
                Collection
              </h2>
              <p className="text-text-secondary text-sm md:text-base mb-8 max-w-md">
                Transform every corner of your home with our handpicked lifestyle accessories.
                Timeless design, exceptional quality.
              </p>
              <Link href="/shop">
                <Button variant="primary" size="lg">
                  Explore Collection
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          NEW ARRIVALS
          ============================================================ */}
      <section className="py-16 md:py-24 bg-surface-muted/30">
        <div className="container-shop">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div>
              <p className="font-label text-accent mb-2">Just In</p>
              <h2 className="font-display text-2xl md:text-3xl text-foreground">
                New Arrivals
              </h2>
            </div>
            <Link
              href="/shop?sort=newest"
              className="text-sm font-medium text-secondary hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <ProductGridSkeleton count={4} />
          ) : newArrivals.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 stagger-in">
              {newArrivals.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-text-muted text-sm">
                New arrivals coming soon. Check back regularly for the latest additions.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          WHY WESTHOME
          ============================================================ */}
      <section className="py-16 md:py-24">
        <div className="container-shop">
          <p className="font-label text-accent text-center mb-2">Our Promise</p>
          <h2 className="font-display text-2xl md:text-3xl text-foreground text-center mb-12 md:mb-16">
            Why WESTHOME
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div className="text-center">
              <div className="w-12 h-12 border border-border flex items-center justify-center mx-auto mb-4">
                <Truck size={20} className="text-accent" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Fast Delivery
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Quick and reliable delivery across India
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 border border-border flex items-center justify-center mx-auto mb-4">
                <Shield size={20} className="text-accent" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Quality Assured
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Premium materials and craftsmanship
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 border border-border flex items-center justify-center mx-auto mb-4">
                <RotateCcw size={20} className="text-accent" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Easy Returns
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Hassle-free return policy
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 border border-border flex items-center justify-center mx-auto mb-4">
                <HeadphonesIcon size={20} className="text-accent" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Support
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Dedicated customer support
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          WHATSAPP CTA — Minimal
          ============================================================ */}
      <section className="py-16 md:py-24 border-t border-border">
        <div className="container-shop">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center">
            <MessageCircle size={20} className="text-[#25D366]" />
            <p className="text-sm text-text-secondary text-center sm:text-left">
              Questions? Need custom sizes?{" "}
              <a
                href="https://wa.me/919895071144?text=Hi!%20I%20have%20a%20question%20about%20WESTHOME%20products."
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-medium underline underline-offset-4 decoration-border hover:decoration-accent transition-colors"
              >
                Chat with us on WhatsApp
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
