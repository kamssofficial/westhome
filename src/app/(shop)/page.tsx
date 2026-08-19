"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Truck, Shield, RotateCcw, HeadphonesIcon, MessageCircle } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import Button from "@/components/ui/Button";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import type { Product, Category } from "@/types";

// Fallback categories if API fails
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
      <section className="relative h-[70vh] md:h-[80vh] bg-primary overflow-hidden">
        {/* Background image */}
        <Image src="/images/banners/hero.svg" alt="" fill className="absolute inset-0 w-full h-full object-cover" priority />
        <div className="hero-gradient absolute inset-0" />
        
        {/* Hero content */}
        <div className="relative h-full flex items-center">
          <div className="container-shop">
            <div className="max-w-xl">
              <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-[0.2em] mb-3 md:mb-4">
                Premium Home & Lifestyle
              </p>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.1] mb-4 md:mb-6">
                Elevate Your
                <br />
                <span className="text-accent">Living Space</span>
              </h1>
              <p className="text-white/70 text-sm md:text-base mb-6 md:mb-8 max-w-md leading-relaxed">
                Discover handpicked home décor, comforters, lamps, and lifestyle
                accessories that transform your house into a home.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/shop">
                  <Button variant="accent" size="lg">
                    Explore Collection
                    <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link href="/collections/comforters">
                  <Button variant="ghost" size="lg" className="text-white border border-white/30 hover:bg-white/10">
                    Shop Comforters
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SHOP BY CATEGORY
          ============================================================ */}
      <section className="py-12 md:py-16">
        <div className="container-shop">
          <div className="flex items-end justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-serif text-foreground">
                Shop by Category
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Browse our curated collections
              </p>
            </div>
            <Link
              href="/shop"
              className="text-sm font-medium text-secondary hover:text-secondary-hover flex items-center gap-1 transition-colors"
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
                  <div className="aspect-square rounded-xl bg-surface-muted overflow-hidden mb-2 border border-border-light">
                    {cat.image ? (
                      <Image src={cat.image} alt={cat.name} width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
                        {cat.name.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-center text-foreground truncate">
                    {cat.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-4 lg:grid-cols-7 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/collections/${cat.slug}`}
                className="group"
              >
                <div className="aspect-square rounded-xl bg-surface-muted overflow-hidden mb-2 border border-border-light group-hover:border-accent/30 group-hover:shadow-md transition-all duration-300">
                  {cat.image ? (
                    <Image src={cat.image} alt={cat.name} width={200} height={200} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
                      {cat.name.slice(0, 2)}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-center text-foreground group-hover:text-secondary transition-colors">
                  {cat.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURED PRODUCTS
          ============================================================ */}
      <section className="py-12 md:py-16 bg-surface-muted/50">
        <div className="container-shop">
          <div className="flex items-end justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-serif text-foreground">
                Featured Products
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Our handpicked selection
              </p>
            </div>
            <Link
              href="/shop?sort=featured"
              className="text-sm font-medium text-secondary hover:text-secondary-hover flex items-center gap-1 transition-colors"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <ProductGridSkeleton count={4} />
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 stagger-in">
              {featuredProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-text-muted text-sm">
                Featured products coming soon. Visit the shop to explore our full collection.
              </p>
              <Link href="/shop" className="inline-block mt-4">
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
      <section className="py-12 md:py-16">
        <div className="container-shop">
          <div className="relative rounded-2xl overflow-hidden">
            <Image src="/images/banners/promo-comforters.svg" alt="Promotional banner" fill className="absolute inset-0 w-full h-full object-cover" />
            <div className="relative z-10 px-8 py-12 md:px-16 md:py-20 text-center">
              <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-[0.15em] mb-3">
                Limited Time
              </p>
              <h2 className="text-2xl md:text-4xl font-serif text-white mb-4">
                Premium Comforters Collection
              </h2>
              <p className="text-white/70 text-sm md:text-base mb-6 max-w-lg mx-auto">
                Experience luxury sleep with our curated comforter range.
                Quality materials, exceptional comfort.
              </p>
              <Link href="/collections/comforters">
                <Button variant="accent" size="lg">
                  Shop Now
                  <ArrowRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          LIFESTYLE COLLECTION
          ============================================================ */}
      <section className="py-12 md:py-16">
        <div className="container-shop">
          <div className="relative rounded-2xl overflow-hidden">
            <Image src="/images/banners/lifestyle-collection.svg" alt="Lifestyle collection" fill className="absolute inset-0 w-full h-full object-cover" />
            <div className="relative z-10 px-8 py-12 md:px-16 md:py-20 text-left max-w-xl">
              <p className="text-accent text-xs md:text-sm font-medium uppercase tracking-[0.15em] mb-3">
                Curated for You
              </p>
              <h2 className="text-2xl md:text-4xl font-serif text-white mb-4">
                Premium Lifestyle<br />Collection
              </h2>
              <p className="text-white/70 text-sm md:text-base mb-6 max-w-md">
                Transform every corner of your home with our handpicked lifestyle accessories.
                Timeless design, exceptional quality.
              </p>
              <Link href="/shop">
                <Button variant="accent" size="lg">
                  Explore Collection
                  <ArrowRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          NEW ARRIVALS
          ============================================================ */}
      <section className="py-12 md:py-16">
        <div className="container-shop">
          <div className="flex items-end justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-serif text-foreground">
                New Arrivals
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Fresh additions to our collection
              </p>
            </div>
            <Link
              href="/shop?sort=newest"
              className="text-sm font-medium text-secondary hover:text-secondary-hover flex items-center gap-1 transition-colors"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <ProductGridSkeleton count={4} />
          ) : newArrivals.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 stagger-in">
              {newArrivals.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
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
      <section className="py-12 md:py-16 bg-surface-muted/50">
        <div className="container-shop">
          <h2 className="text-xl md:text-2xl font-serif text-foreground text-center mb-8 md:mb-12">
            Why WESTHOME
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Truck size={22} className="text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Fast Delivery
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Quick and reliable delivery across India
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Shield size={22} className="text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Quality Assured
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Premium materials and craftsmanship
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <RotateCcw size={22} className="text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Easy Returns
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Hassle-free return policy
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <HeadphonesIcon size={22} className="text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
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
          WHATSAPP CTA
          ============================================================ */}
      <section className="py-12 md:py-16">
        <div className="container-shop">
          <div className="flex items-center gap-6 md:gap-10 p-6 md:p-10 rounded-2xl bg-[#25D366]/5 border border-[#25D366]/20">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#25D366] flex items-center justify-center">
                <MessageCircle size={28} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-serif text-foreground mb-1">
                Chat with Us
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Have questions? Need custom sizes? Reach out on WhatsApp for
                quick assistance.
              </p>
              <a
                href="https://wa.me/919999999999?text=Hi!%20I%20have%20a%20question%20about%20WESTHOME%20products."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#20BD5C] transition-colors"
              >
                <MessageCircle size={16} />
                Start Chat
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
