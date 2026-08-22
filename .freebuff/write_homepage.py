import os

content = """\"use client\";

import { useState, useEffect } from \"react\";
import Link from \"next/link\";
import Image from \"next/image\";
import { ArrowRight } from \"lucide-react\";
import { cn } from \"@/lib/utils\";
import type { Product, Category } from \"@/types\";

interface HeroBanner {
  id: string;
  image?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  content?: Record<string, any>;
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [heroSections, setHeroSections] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, newRes, homeRes] = await Promise.allSettled([
          fetch(\"/api/categories\"),
          fetch(\"/api/products?newArrivals=true&limit=8\"),
          fetch(\"/api/homepage\"),
        ]);
        if (catRes.status === \"fulfilled\" && catRes.value.ok) {
          const catData = await catRes.value.json();
          setCategories(catData.categories || []);
        }
        if (newRes.status === \"fulfilled\" && newRes.value.ok) {
          const newData = await newRes.value.json();
          setNewArrivals(newData.products || []);
        }
        if (homeRes.status === \"fulfilled\" && homeRes.value.ok) {
          const homeData = await homeRes.value.json();
          const heroes = (homeData.sections || []).filter(
            (s: any) => s.type === \"HERO\" && s.isActive
          );
          setHeroSections(heroes);
        }
      } catch (err) {
        console.error(\"Homepage fetch error:\", err);
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
    <div className=\"animate-fade-in\">
      <section className=\"px-4 pt-3 pb-2\">
        {hero ? (
          <div className=\"relative rounded-2xl overflow-hidden h-[420px] md:h-[480px] bg-primary\">
            {hero.image && (
              <Image src={hero.image} alt=\"\" fill className=\"absolute inset-0 w-full h-full object-cover\" priority />
            )}
            <div className=\"absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent\" />
            <div className=\"relative h-full flex flex-col justify-end p-6 pb-8\">
              {hero.subtitle && (
                <p className=\"text-[11px] font-semibold tracking-[0.15em] text-white/80 uppercase mb-1\">
                  {hero.subtitle}
                </p>
              )}
              <h1 className=\"font-display text-4xl md:text-5xl text-white leading-[1.05] mb-3\">
                {hero.title || \"West Home\"}
              </h1>
              {hero.description && (
                <p className=\"text-white/70 text-sm mb-5 leading-relaxed whitespace-pre-line\">
                  {hero.description}
                </p>
              )}
              <Link href={hero.buttonLink || \"/shop\"} className=\"inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary rounded-full text-sm font-medium hover:bg-white/90 transition-colors w-fit\">
                {hero.buttonText || \"Explore Collections\"} <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        ) : (
          <div className=\"relative rounded-2xl overflow-hidden h-[420px] md:h-[480px] bg-primary\">
            <Image src=\"/images/banners/hero.jpg\" alt=\"\" fill className=\"absolute inset-0 w-full h-full object-cover\" priority />
            <div className=\"absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent\" />
            <div className=\"relative h-full flex flex-col justify-end p-6 pb-8\">
              <p className=\"text-[11px] font-semibold tracking-[0.15em] text-white/80 uppercase mb-1\">CRAFTED FOR</p>
              <h1 className=\"font-display text-4xl md:text-5xl text-white leading-[1.05] mb-3\">Modern Living</h1>
              <p className=\"text-white/70 text-sm mb-5 leading-relaxed\">Timeless pieces. Thoughtful details.</p>
              <Link href=\"/shop\" className=\"inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary rounded-full text-sm font-medium hover:bg-white/90 transition-colors w-fit\">
                Explore Collections <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
        {heroSections.length > 1 && (
          <div className=\"flex items-center justify-center gap-2 mt-3\">
            {heroSections.map((_: any, i: number) => (
              <button key={i} onClick={() => setActiveSlide(i)} className={cn(\"rounded-full transition-all duration-300\", i === activeSlide ? \"w-5 h-1.5 bg-primary\" : \"w-1.5 h-1.5 bg-stone-300\")} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
        )}
      </section>

      <section className=\"px-4 py-6\">
        <div className=\"flex items-end justify-between mb-4\">
          <h2 className=\"text-lg font-semibold text-primary\">Shop by Category</h2>
          <Link href=\"/shop\" className=\"text-sm font-medium text-secondary flex items-center gap-1 hover:text-primary transition-colors\">View all <ArrowRight size={14} /></Link>
        </div>
        {loading ? (
          <div className=\"grid grid-cols-3 gap-2.5\">
            {[1, 2, 3].map((i) => (<div key={i} className=\"skeleton aspect-[4/5] rounded-xl\" />))}
          </div>
        ) : categories.length > 0 ? (
          <>
            <div className=\"grid grid-cols-3 gap-2.5 mb-2.5\">
              {categories.slice(0, 3).map((cat) => (
                <Link key={cat.id} href={`/collections/${cat.slug}`} className=\"group block\">
                  <div className=\"relative aspect-[4/5] rounded-xl overflow-hidden bg-surface-muted\">
                    {cat.image ? (<Image src={cat.image} alt={cat.name} fill className=\"object-cover group-hover:scale-105 transition-transform duration-500\" sizes=\"33vw\" />) : (<div className=\"w-full h-full flex items-center justify-center text-text-muted text-xs font-medium\">{cat.name}</div>)}
                  </div>
                  <p className=\"text-xs font-medium text-primary mt-1.5 text-center truncate\">{cat.name}</p>
                </Link>
              ))}
            </div>
            {categories.length > 3 && (
              <div className=\"grid grid-cols-4 gap-2\">
                {categories.slice(3, 7).map((cat) => (
                  <Link key={cat.id} href={`/collections/${cat.slug}`} className=\"group block\">
                    <div className=\"relative aspect-square rounded-xl overflow-hidden bg-surface-muted\">
                      {cat.image ? (<Image src={cat.image} alt={cat.name} fill className=\"object-cover group-hover:scale-105 transition-transform duration-500\" sizes=\"25vw\" />) : (<div className=\"w-full h-full flex items-center justify-center text-text-muted text-[10px] font-medium text-center px-1\">{cat.name}</div>)}
                    </div>
                    <p className=\"text-[11px] font-medium text-primary mt-1 text-center truncate\">{cat.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className=\"text-center py-8\"><p className=\"text-text-muted text-sm\">No categories available yet.</p></div>
        )}
      </section>

      <section className=\"px-4 py-6\">
        <div className=\"flex items-end justify-between mb-4\">
          <h2 className=\"text-lg font-semibold text-primary\">New Arrivals</h2>
          <Link href=\"/shop?sort=newest\" className=\"text-sm font-medium text-secon
