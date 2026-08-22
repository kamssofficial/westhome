"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Headphones,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import Button from "@/components/ui/Button";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import type { Category, Product } from "@/types";

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "1",
    name: "Wall Decor",
    slug: "wall-decor",
    image: "/images/categories/wall-decor.svg",
    isActive: true,
    position: 1,
    subcategories: [],
  },
  {
    id: "2",
    name: "Laundry",
    slug: "laundry",
    image: "/images/categories/laundry.svg",
    isActive: true,
    position: 2,
    subcategories: [],
  },
  {
    id: "3",
    name: "Comforters",
    slug: "comforters",
    image: "/images/categories/comforters.svg",
    isActive: true,
    position: 3,
    subcategories: [],
  },
  {
    id: "4",
    name: "Lamps",
    slug: "lamps",
    image: "/images/categories/lamps.svg",
    isActive: true,
    position: 4,
    subcategories: [],
  },
  {
    id: "5",
    name: "Carpets",
    slug: "carpets",
    image: "/images/categories/carpets.svg",
    isActive: true,
    position: 5,
    subcategories: [],
  },
  {
    id: "6",
    name: "Clocks",
    slug: "clocks",
    image: "/images/categories/clocks.svg",
    isActive: true,
    position: 6,
    subcategories: [],
  },
  {
    id: "7",
    name: "Accessories",
    slug: "accessories",
    image: "/images/categories/accessories.svg",
    isActive: true,
    position: 7,
    subcategories: [],
  },
];

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "demo-1",
    name: "Quiet Geometry Wall Clock",
    slug: "quiet-geometry-wall-clock",
    regularPrice: 2499,
    salePrice: 1999,
    stockQuantity: 8,
    lowStockThreshold: 2,
    allowBackorder: false,
    trackInventory: true,
    allowCustomSize: false,
    purchaseMethod: "BOTH",
    status: "ACTIVE",
    isActive: true,
    isFeatured: true,
    isBestseller: true,
    isNewArrival: false,
    images: [
      {
        id: "demo-image-1",
        url: "/images/categories/clocks.svg",
        alt: "Quiet Geometry Wall Clock",
        position: 0,
        isPrimary: true,
      },
    ],
    variants: [],
    category: FALLBACK_CATEGORIES[5],
    tags: ["clock", "modern"],
  },
  {
    id: "demo-2",
    name: "Soft Horizon Comforter",
    slug: "soft-horizon-comforter",
    regularPrice: 3899,
    salePrice: 3299,
    stockQuantity: 12,
    lowStockThreshold: 3,
    allowBackorder: false,
    trackInventory: true,
    allowCustomSize: false,
    purchaseMethod: "BUY_ONLINE",
    status: "ACTIVE",
    isActive: true,
    isFeatured: true,
    isBestseller: false,
    isNewArrival: true,
    images: [
      {
        id: "demo-image-2",
        url: "/images/categories/comforters.svg",
        alt: "Soft Horizon Comforter",
        position: 0,
        isPrimary: true,
      },
    ],
    variants: [],
    category: FALLBACK_CATEGORIES[2],
    tags: ["comforter", "soft"],
  },
  {
    id: "demo-3",
    name: "Amber Evening Lamp",
    slug: "amber-evening-lamp",
    regularPrice: 2199,
    stockQuantity: 10,
    lowStockThreshold: 2,
    allowBackorder: false,
    trackInventory: true,
    allowCustomSize: false,
    purchaseMethod: "BUY_ONLINE",
    status: "ACTIVE",
    isActive: true,
    isFeatured: true,
    isBestseller: false,
    isNewArrival: true,
    images: [
      {
        id: "demo-image-3",
        url: "/images/categories/lamps.svg",
        alt: "Amber Evening Lamp",
        position: 0,
        isPrimary: true,
      },
    ],
    variants: [],
    category: FALLBACK_CATEGORIES[3],
    tags: ["lamp", "light"],
  },
  {
    id: "demo-4",
    name: "Linework Wall Panel",
    slug: "linework-wall-panel",
    regularPrice: 2999,
    salePrice: 2499,
    stockQuantity: 5,
    lowStockThreshold: 2,
    allowBackorder: false,
    trackInventory: true,
    allowCustomSize: false,
    purchaseMethod: "WHATSAPP",
    status: "ACTIVE",
    isActive: true,
    isFeatured: false,
    isBestseller: true,
    isNewArrival: false,
    images: [
      {
        id: "demo-image-4",
        url: "/images/categories/wall-decor.svg",
        alt: "Linework Wall Panel",
        position: 0,
        isPrimary: true,
      },
    ],
    variants: [],
    category: FALLBACK_CATEGORIES[0],
    tags: ["wall", "decor"],
  },
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [featuredProducts, setFeaturedProducts] =
    useState<Product[]>(FALLBACK_PRODUCTS);
  const [newArrivals, setNewArrivals] = useState<Product[]>(
    FALLBACK_PRODUCTS.slice(1)
  );
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
          const data = await catRes.value.json();
          if (data.categories?.length) setCategories(data.categories);
        }
        if (featRes.status === "fulfilled" && featRes.value.ok) {
          const data = await featRes.value.json();
          if (data.products?.length) setFeaturedProducts(data.products);
        }
        if (newRes.status === "fulfilled" && newRes.value.ok) {
          const data = await newRes.value.json();
          if (data.products?.length) setNewArrivals(data.products);
        }
      } catch (error) {
        console.error("Homepage fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="">
      {/* HERO */}
      <section className="container-shop relative mt-5 overflow-hidden rounded-[2rem] bg-[#1f2521] text-white shadow-[0_20px_70px_rgba(31,33,31,.18)] md:mt-7">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/images/banners/hero.png)" }} />
        
        <div className="absolute -right-4 top-10 h-44 w-44 rounded-full bg-[#d5966e]/20 blur-3xl" />
        
        <div className="relative grid items-stretch lg:min-h-[690px] lg:grid-cols-[.88fr_1.12fr]">
          <div className="order-2 relative z-10 flex flex-col justify-center px-7 py-12 sm:px-12 md:px-16 md:py-16 lg:order-1 lg:py-24">
            <div className="mb-7 flex items-center gap-3 text-[#e0a681]">
              <span className="h-px w-8 bg-current" />
              <p className="font-label text-[9px]">
                Premium home, thoughtfully chosen
              </p>
            </div>
            <h1 className="max-w-xl font-display text-[3.4rem] leading-[.92] tracking-[-.045em] sm:text-6xl md:text-7xl">
              Make space for{" "}
              <span className="text-[#e0a681]">living.</span>
            </h1>
            <p className="mt-7 max-w-md text-sm leading-7 text-white/65 md:text-lg md:leading-8">
              Objects with a point of view. Soft textures, warm light, and
              everyday details that make a house feel like yours.
            </p>
            <div className="mt-11 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop">
                <Button variant="accent" size="lg">
                  Explore the collection <ArrowRight size={16} />
                </Button>
              </Link>
              
            </div>
            <div className="mt-14 flex items-center gap-6 text-xs text-white/50">
              <span className="flex items-center gap-2">
                <Check size={14} className="text-[#e0a681]" /> Curated in
                India
              </span>
              <span className="flex items-center gap-2">
                <Check size={14} className="text-[#e0a681]" /> Delivered with
                care
              </span>
            </div>
          </div>
          <div className="order-1 relative min-h-[250px] overflow-hidden lg:order-2 lg:min-h-full">
            <div className="hero-art absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1f2521]/30 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#1f2521]/20 lg:via-transparent lg:to-transparent" />
            
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="overflow-hidden border-b border-foreground/[.08] bg-surface py-4">
        <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap text-[10px] font-bold uppercase tracking-[.18em] text-text-muted">
          <span>Thoughtful details</span>
          <span className="text-accent">✦</span>
          <span>Made for everyday living</span>
          <span className="text-accent">✦</span>
          <span>Premium home & lifestyle</span>
          <span className="text-accent">✦</span>
          <span>Thoughtful details</span>
          <span className="text-accent">✦</span>
          <span>Made for everyday living</span>
          <span className="text-accent">✦</span>
          <span>Premium home & lifestyle</span>
        </div>
      </div>

      {/* CATEGORIES */}
      <section className="container-shop py-20 md:py-28">
        <div className="mb-8 flex items-end justify-between md:mb-12">
          <div>
            <p className="font-label mb-3 text-[9px] text-accent">
              Browse by mood
            </p>
            <h2 className="font-display text-4xl md:text-5xl">
              Find your feeling.
            </h2>
          </div>
          <Link
            href="/shop"
            className="group hidden items-center gap-2 text-sm font-semibold text-text-secondary hover:text-foreground sm:flex"
          >
            View all{" "}
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
        <div className="scrollbar-hide -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2 md:grid md:grid-cols-7 md:gap-4 md:overflow-visible">
          {categories.map((category, index) => (
            <Link
              href={`/collections/${category.slug}`}
              key={category.id}
              className="group min-w-[145px] snap-start md:min-w-0"
            >
              <div className="relative aspect-[.82] overflow-hidden rounded-[1.35rem] bg-surface-muted">
                <Image
                  src={
                    category.image ||
                    "/images/products/placeholder-product.svg"
                  }
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                
                <span className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">
                  {category.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="bg-surface-muted/65 py-20 md:py-28">
        <div className="container-shop">
          <div className="mb-8 flex items-end justify-between md:mb-12">
            <div>
              <p className="font-label mb-3 text-[9px] text-accent">
                The edit
              </p>
              <h2 className="font-display text-4xl md:text-5xl">
                Selected for you.
              </h2>
            </div>
            <Link
              href="/shop?sort=featured"
              className="group hidden items-center gap-2 text-sm font-semibold text-text-secondary hover:text-foreground sm:flex"
            >
              View all{" "}
              <ArrowUpRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
          {loading ? (
            <ProductGridSkeleton count={4} className="lg:grid-cols-4" />
          ) : (
            <div className="stagger-in grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
              {featuredProducts.slice(0, 4).map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < 2}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PROMOTIONAL BANNER */}
      <section className="container-shop py-20 md:py-28">
        <div className="grid overflow-hidden rounded-[2rem] bg-[#d9c9b8] md:grid-cols-2">
          <div className="relative min-h-[320px] overflow-hidden md:min-h-[520px]">
            <Image
              src="/images/banners/promo-comforters.svg"
              alt="Soft comforters collection"
              fill
              className="object-cover transition-transform duration-1000 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#5e493b]/10 to-transparent" />
          </div>
          <div className="flex flex-col justify-center px-7 py-12 md:px-14 lg:px-20">
            <p className="font-label mb-4 text-[9px] text-[#80523a]">
              The comfort edit
            </p>
            <h2 className="font-display max-w-md text-4xl leading-[.95] text-[#322923] md:text-6xl">
              A softer way to end the day.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[#5d5049]">
              Layer your space with breathable textures and considered comfort.
              Made to feel good, every night.
            </p>
            <Link href="/collections/comforters" className="mt-8 self-start">
              <Button variant="primary" size="md">
                Shop the comfort edit <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="container-shop pb-20 md:pb-28">
        <div className="mb-8 flex items-end justify-between md:mb-12">
          <div>
            <p className="font-label mb-3 text-[9px] text-accent">
              Just arrived
            </p>
            <h2 className="font-display text-4xl md:text-5xl">
              New in the home.
            </h2>
          </div>
          <Link
            href="/shop?sort=newest"
            className="group hidden items-center gap-2 text-sm font-semibold text-text-secondary hover:text-foreground sm:flex"
          >
            See everything{" "}
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
        {loading ? (
          <ProductGridSkeleton count={3} />
        ) : (
          <div className="stagger-in grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {newArrivals.slice(0, 3).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index === 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* TRUST / PROMISES */}
      <section className="bg-[#1f2521] py-20 text-white md:py-28">
        <div className="container-shop">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="font-label mb-4 text-[9px] text-[#e0a681]">
                Why Westhome
              </p>
              <h2 className="font-display max-w-md text-4xl leading-[.95] md:text-6xl">
                Good design should feel easy.
              </h2>
              <p className="mt-6 max-w-sm text-sm leading-7 text-white/55">
                We keep the experience considered from the first scroll to the
                moment your order arrives.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4 md:gap-8">
              <div>
                <Truck size={21} className="mb-5 text-[#e0a681]" />
                <h3 className="text-sm font-semibold">Fast delivery</h3>
                <p className="mt-2 text-xs leading-5 text-white/50">
                  Reliable delivery across India.
                </p>
              </div>
              <div>
                <ShieldCheck size={21} className="mb-5 text-[#e0a681]" />
                <h3 className="text-sm font-semibold">Quality assured</h3>
                <p className="mt-2 text-xs leading-5 text-white/50">
                  Pieces chosen to last.
                </p>
              </div>
              <div>
                <RotateCcw size={21} className="mb-5 text-[#e0a681]" />
                <h3 className="text-sm font-semibold">Easy returns</h3>
                <p className="mt-2 text-xs leading-5 text-white/50">
                  A simple, human process.
                </p>
              </div>
              <div>
                <Headphones size={21} className="mb-5 text-[#e0a681]" />
                <h3 className="text-sm font-semibold">Real support</h3>
                <p className="mt-2 text-xs leading-5 text-white/50">
                  We are here when you need us.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="container-shop py-20 md:py-28">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#dbe2da] px-7 py-16 md:px-16 md:py-20">
          
          <div className="relative z-10 max-w-2xl">
            <Star
              size={19}
              className="mb-6 fill-accent text-accent"
            />
            <h2 className="font-display text-4xl leading-[.98] md:text-6xl">
              Need help choosing?
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-text-secondary">
              Tell us what you are looking for, your room dimensions, or simply
              send a photo. We will help you find the right fit.
            </p>
            <a
              href="https://wa.me/919895071144?text=Hi!%20I%20need%20help%20choosing%20a%20WESTHOME%20product."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 active:scale-[.97]"
            >
              <MessageCircle size={17} /> Chat with us on WhatsApp{" "}
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
