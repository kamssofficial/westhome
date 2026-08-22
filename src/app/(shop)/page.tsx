"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { motion } from "motion/react";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import type { Product, Category } from "@/types";

interface HeroSection {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  buttonText?: string;
  buttonLink?: string;
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [heroSections, setHeroSections] = useState<HeroSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, newRes, featRes, homeRes] = await Promise.allSettled([
          fetch("/api/categories"),
          fetch("/api/products?newArrivals=true&limit=8"),
          fetch("/api/products?featured=true&limit=6"),
          fetch("/api/homepage"),
        ]);
        if (catRes.status === "fulfilled" && catRes.value.ok) {
          const catData = await catRes.value.json();
          setCategories(catData.categories || []);
        }
        if (newRes.status === "fulfilled" && newRes.value.ok) {
          const newData = await newRes.value.json();
          setNewArrivals(newData.products || []);
        }
        if (featRes.status === "fulfilled" && featRes.value.ok) {
          const featData = await featRes.value.json();
          setFeaturedProducts(featData.products || []);
        }
        if (homeRes.status === "fulfilled" && homeRes.value.ok) {
          const homeData = await homeRes.value.json();
          const heroes = (homeData.sections || []).filter((s: HeroSection) => s.type === "HERO");
          setHeroSections(heroes);
        }
      } catch (err) {
        console.error("Homepage fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (heroSections.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSections.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSections.length]);

  const hero = heroSections[activeSlide];

  return (
    <div className="animate-fade-in">
      {/* HERO — Editorial layout */}
      <section className="px-4 pt-3 pb-2">
        <div className="relative rounded-2xl overflow-hidden h-[420px] md:h-[480px] bg-primary">
          {hero?.image && (
            <Image src={hero.image} alt="" fill className="absolute inset-0 w-full h-full object-cover" priority />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="relative h-full flex flex-col justify-end p-6 pb-8">
            <p className="font-label text-[10px] tracking-[0.2em] text-white/60 uppercase mb-2">
              {hero?.subtitle || "Handcrafted Home"}
            </p>
            <TextEffect
              as="h1"
              preset="fade-in-blur"
              per="word"
              className="font-display text-[2.5rem] md:text-5xl lg:text-6xl text-white leading-[1.05] mb-3 max-w-md"
              speedReveal={0.8}
              speedSegment={1.2}
            >
              {hero?.title || "Where craft meets home"}
            </TextEffect>
            <TextEffect
              as="p"
              preset="fade"
              delay={0.3}
              className="text-white/60 text-sm mb-5 leading-relaxed max-w-sm"
            >
              {hero?.description || "Woven baskets, artisan frames, and handcrafted dispensers — each piece tells a story."}
            </TextEffect>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
              <Link href={hero?.buttonLink || "/shop"} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary rounded-full text-sm font-medium hover:bg-white/90 transition-colors w-fit">
                {hero?.buttonText || "Shop the collection"} <ArrowRight size={15} />
              </Link>
            </motion.div>
          </div>
        </div>
        {heroSections.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {heroSections.map((_: HeroSection, i: number) => (
              <button key={i} onClick={() => setActiveSlide(i)} className={cn("rounded-full transition-all duration-300", i === activeSlide ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-stone-300")} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
        )}
      </section>

      {/* SHOP BY CATEGORY */}
      <section className="px-4 py-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="font-label text-[10px] tracking-[0.2em] text-accent mb-1">Collections</p>
            <h2 className="text-lg font-display text-primary">Shop by category</h2>
          </div>
          <Link href="/shop" className="text-sm font-medium text-secondary flex items-center gap-1 hover:text-primary transition-colors">View all <ArrowRight size={14} /></Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3].map((i) => (<div key={i} className="skeleton aspect-[4/5] rounded-xl" />))}
          </div>
        ) : categories.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2.5 mb-2.5">
              {categories.slice(0, 3).map((cat) => (
                <Link key={cat.id} href={`/collections/${cat.slug}`} className="group block">
                  <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-surface-muted">
                    {cat.image ? (<Image src={cat.image} alt={cat.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />) : (<div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-medium">{cat.name}</div>)}
                  </div>
                  <p className="text-xs font-medium text-primary mt-1.5 text-center truncate">{cat.name}</p>
                </Link>
              ))}
            </div>
            {categories.length > 3 && (
              <div className="grid grid-cols-4 gap-2">
                {categories.slice(3, 7).map((cat) => (
                  <Link key={cat.id} href={`/collections/${cat.slug}`} className="group block">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-muted">
                      {cat.image ? (<Image src={cat.image} alt={cat.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="25vw" />) : (<div className="w-full h-full flex items-center justify-center text-text-muted text-[10px] font-medium text-center px-1">{cat.name}</div>)}
                    </div>
                    <p className="text-[11px] font-medium text-primary mt-1 text-center truncate">{cat.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8"><p className="text-text-muted text-sm">No categories available yet.</p></div>
        )}
      </section>

      {/* FEATURED PRODUCTS */}
      {featuredProducts.length > 0 && (
        <section className="px-4 py-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="font-label text-[10px] tracking-[0.2em] text-accent mb-1">Curated</p>
              <h2 className="text-lg font-display text-primary">Featured pieces</h2>
            </div>
            <Link href="/shop?sort=featured" className="text-sm font-medium text-secondary flex items-center gap-1 hover:text-primary transition-colors">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {featuredProducts.map((p) => (
              <Link key={p.id} href={"/products/" + p.slug} className="group block flex-shrink-0 w-[160px]">
                <div className="relative aspect-square bg-surface-muted rounded-xl overflow-hidden">
                  {p.images && p.images.length > 0 ? (
                    <Image src={p.images[0].url} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="160px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">No image</div>
                  )}
                </div>
                <p className="text-xs font-medium text-primary mt-2 truncate">{p.name}</p>
                <p className="text-sm font-bold text-primary">
                  {p.salePrice ? (
                    <><span className="text-error">{formatPrice(p.salePrice)}</span> <span className="text-text-muted line-through text-[10px]">{formatPrice(p.regularPrice)}</span></>
                  ) : (
                    formatPrice(p.regularPrice)
                  )}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
      <section className="px-4 py-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="font-label text-[10px] tracking-[0.2em] text-accent mb-1">Just arrived</p>
            <h2 className="text-lg font-display text-primary">New in</h2>
          </div>
          <Link href="/shop?sort=newest" className="text-sm font-medium text-secondary flex items-center gap-1 hover:text-primary transition-colors">View all <ArrowRight size={14} /></Link>
        </div>
        {newArrivals.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {newArrivals.slice(0, 6).map((p) => (
              <Link key={p.id} href={"/products/" + p.slug} className="group block flex-shrink-0 w-[160px]">
                <div className="relative aspect-square bg-surface-muted rounded-xl overflow-hidden">
                  {p.images && p.images.length > 0 ? (
                    <Image src={p.images[0].url} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="160px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">No image</div>
                  )}
                </div>
                <p className="text-xs font-medium text-primary mt-2 truncate">{p.name}</p>
                <p className="text-sm font-bold text-primary">
                  {p.salePrice ? (
                    <><span className="text-error">{formatPrice(p.salePrice)}</span> <span className="text-text-muted line-through text-[10px]">{formatPrice(p.regularPrice)}</span></>
                  ) : (
                    formatPrice(p.regularPrice)
                  )}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8"><p className="text-text-muted text-sm">No new arrivals yet.</p></div>
        )}
      </section>

      {/* BRAND STORY — Editorial layout */}
      <section className="px-4 py-8">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 pb-4">
            <TextEffect as="p" preset="fade" className="font-label text-[10px] tracking-[0.2em] text-accent mb-3">
              How we do things at WestHome
            </TextEffect>
            <TextEffect as="h2" preset="blur" per="word" className="font-display text-2xl md:text-3xl text-primary leading-tight mb-3">
              Every piece, considered.
            </TextEffect>
            <p className="text-sm text-secondary leading-relaxed max-w-sm">
              From handwoven baskets in Kerala to artisan soap dispensers — we source what we would live with ourselves.
            </p>
          </div>
          <div className="grid grid-cols-3 border-t border-border-light">
            {[
              { num: "01", title: "Woven by hand", desc: "Each basket crafted by artisans" },
              { num: "02", title: "Built to last", desc: "Materials that age beautifully" },
              { num: "03", title: "Delivered with care", desc: "From our store to your home" },
            ].map((item) => (
              <div key={item.num} className="p-4 border-r border-border-light last:border-r-0">
                <span className="font-display text-2xl text-accent/40 block mb-1">{item.num}</span>
                <p className="text-xs font-semibold text-primary leading-tight">{item.title}</p>
                <p className="text-[10px] text-secondary mt-1 leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORE INFO */}
      <section className="px-4 py-6 pb-24">
        <div className="bg-stone-900 rounded-2xl p-6 text-white">
          <TextEffect as="p" preset="fade" className="font-label text-[10px] tracking-[0.2em] text-stone-400 mb-3">
            Visit us
          </TextEffect>
          <TextEffect as="h2" preset="blur" per="word" className="font-display text-2xl mb-4">
            West Home by BM Distributors
          </TextEffect>
          <div className="text-sm text-stone-400 leading-relaxed mb-5">
            <p>City Gate Building, near Press Club Junction,</p>
            <p>Karandakkad, Kasaragod, Kerala — 671121</p>
          </div>
          <a
            href="https://wa.me/919895071144"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-stone-900 rounded-full text-xs font-medium hover:bg-stone-100 transition-colors"
          >
            Chat on WhatsApp <ArrowRight size={13} />
          </a>
        </div>
      </section>
    </div>
  );
}