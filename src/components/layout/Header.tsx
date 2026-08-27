"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WestHomeLogo from "@/components/ui/WestHomeLogo";
import { Search, ShoppingBag, Menu, X, User, ArrowUpRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

const BASE_NAV = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
];

interface NavCat { label: string; href: string; }

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const itemCount = useCartStore((state) => state.getItemCount());
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [navCategories, setNavCategories] = useState<NavCat[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then(r => r.json())
      .then(d => {
        if (d.categories) setNavCategories(d.categories.filter((c: any) => (c.productCount || 0) > 0).map((c: any) => ({ label: c.name, href: "/collections/" + c.slug })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = searchQuery.trim();
    if (!value) return;
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3 md:px-5 md:pt-5">
        <div
          className={cn(
            "material mx-auto max-w-[1400px] rounded-[1.35rem] transition-[box-shadow,background-color] duration-500",
            isScrolled && "shadow-dropdown"
          )}
        >
          <div className="flex h-[4.25rem] items-center justify-between gap-4 px-4 md:h-[4.75rem] md:px-6">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[.06] active:scale-95 lg:hidden touch-target"
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>
            <Link href="/" className="shrink-0" aria-label="WESTHOME home">
              <span className="relative block h-8 w-[9rem] md:h-9 md:w-[10rem]">
                <WestHomeLogo
                  variant="default"
                  size="md"
                  plain
                  className="h-8 w-auto md:h-9"
                />
              </span>
            </Link>
            <nav
              className="hidden items-center gap-0.5 lg:flex"
              aria-label="Primary navigation"
            >
              {[...BASE_NAV, ...navCategories].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-full px-3 py-2 text-[12px] font-semibold tracking-[-.01em] transition-colors hover:text-foreground",
                    isActive(link.href)
                      ? "text-foreground"
                      : "text-text-secondary"
                  )}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-px bg-accent" />
                  )}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSearchOpen((value) => !value)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-foreground/[.06] active:scale-95 touch-target",
                  searchOpen && "bg-foreground/[.06]"
                )}
                aria-label="Search"
              >
                <Search size={19} strokeWidth={1.8} />
              </button>
              <Link
                href="/account"
                className="hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-foreground/[.06] active:scale-95 md:flex"
                aria-label="Account"
              >
                <User size={19} strokeWidth={1.8} />
              </Link>
              <Link
                href="/cart"
                className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-foreground/[.06] active:scale-95"
                aria-label={`Cart with ${mounted ? itemCount : 0} items`}
              >
                <ShoppingBag size={19} strokeWidth={1.8} />
                {mounted && itemCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                    {mounted ? (itemCount > 9 ? "9+" : itemCount) : ""}
                  </span>
                )}
              </Link>
            </div>
          </div>
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-[400ms]",
              searchOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <form
                onSubmit={handleSearch}
                className="border-t border-foreground/[.07] px-4 py-3 md:px-6"
              >
                <div className="flex items-center gap-3 rounded-full bg-foreground/[.055] px-4 focus-within:ring-2 focus-within:ring-accent/60">
                  <Search
                    size={16}
                    className="shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                  <label htmlFor="site-search" className="sr-only">
                    Search the collection
                  </label>
                  <input
                    id="site-search"
                    name="search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search the collection…"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
                  />
                  <button
                    type="submit"
                    className="rounded-full px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/10 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-[60] lg:hidden",
          mobileMenuOpen
            ? "pointer-events-auto"
            : "pointer-events-none"
        )}
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity duration-500",
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className={cn(
            "material absolute bottom-3 left-3 top-3 flex w-[min(86vw,22rem)] flex-col overscroll-contain rounded-[1.6rem] p-5 transition-transform duration-500 ease-[cubic-bezier(.23,.88,.26,.92)]",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-[110%]"
          )}
        >
          <div className="flex items-center justify-between">
            <WestHomeLogo
                variant="default"
                size="md"
                plain
                className="h-8 w-auto"
              />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/[.06] active:scale-95"
              aria-label="Close menu"
            >
              <X size={19} />
            </button>
          </div>
          <div className="mt-10 flex-1">
            <p className="font-label mb-4 text-[9px] text-accent">
              Explore WESTHOME
            </p>
            <nav className="space-y-1" aria-label="Mobile navigation">
              {[...BASE_NAV, ...navCategories].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition-colors",
                    isActive(link.href)
                      ? "bg-foreground text-white"
                      : "text-foreground hover:bg-foreground/[.06]"
                  )}
                >
                  {link.label}
                  {isActive(link.href) && <ArrowUpRight size={15} />}
                </Link>
              ))}
            </nav>
          </div>
          <div className="space-y-1 border-t border-foreground/[.08] pt-4">
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-foreground/[.06] hover:text-foreground"
            >
              My Account
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-foreground/[.06] hover:text-foreground"
            >
              About WESTHOME
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-foreground/[.06] hover:text-foreground"
            >
              Contact us
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
