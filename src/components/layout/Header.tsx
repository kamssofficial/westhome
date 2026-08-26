"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WestHomeLogo from "@/components/ui/WestHomeLogo";
import { Search, ShoppingBag, Menu, X, User, ArrowUpRight, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

const BASE_NAV = [
  { label: "Home", href: "/" },
];

interface NavCat { label: string; href: string; slug: string; }

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const itemCount = useCartStore((state) => state.getItemCount());
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [navCategories, setNavCategories] = useState<NavCat[]>([]);
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then(r => r.json())
      .then(d => {
        if (d.categories) setNavCategories(d.categories.map((c: any) => ({ label: c.name, href: "/collections/" + c.slug, slug: c.slug })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

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
              <Link
                href="/about"
                className={cn(
                  "relative rounded-full px-3 py-2 text-[12px] font-semibold tracking-[-.01em] transition-colors hover:text-foreground",
                  isActive("/about")
                    ? "text-foreground"
                    : "text-text-secondary"
                )}
              >
                About Us
                {isActive("/about") && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-px bg-accent" />
                )}
              </Link>
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
                aria-label={`Cart with ${itemCount} items`}
              >
                <ShoppingBag size={19} strokeWidth={1.8} />
                {itemCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
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

      {/* Mobile Menu Overlay */}
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
            "material absolute bottom-0 left-0 top-0 flex w-[min(85vw,20rem)] flex-col rounded-r-[1.6rem] transition-transform duration-500 ease-[cubic-bezier(.23,.88,.26,.92)]",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-[110%]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <WestHomeLogo
              variant="default"
              size="md"
              plain
              className="h-7 w-auto"
            />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/[.06] active:scale-95"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-6 overscroll-contain">
            <p className="font-label mb-3 mt-4 text-[9px] text-accent">
              Explore WESTHOME
            </p>
            <nav className="space-y-0.5" aria-label="Mobile navigation">
              {/* Home */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors",
                  isActive("/")
                    ? "bg-foreground text-white"
                    : "text-foreground hover:bg-foreground/[.06]"
                )}
              >
                Home
              </Link>

              {/* Collections - Collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() => setCollectionsOpen(!collectionsOpen)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-foreground/[.06]"
                >
                  <span>Collections</span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "transition-transform duration-200",
                      collectionsOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    collectionsOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="ml-3 border-l border-foreground/[.08] pl-3 space-y-0.5 pb-1">
                    {navCategories.map((cat) => (
                      <Link
                        key={cat.href}
                        href={cat.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors",
                          isActive(cat.href)
                            ? "bg-foreground text-white font-semibold"
                            : "text-text-secondary hover:bg-foreground/[.06] hover:text-foreground"
                        )}
                      >
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* About Us */}
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors",
                  isActive("/about")
                    ? "bg-foreground text-white"
                    : "text-foreground hover:bg-foreground/[.06]"
                )}
              >
                About Us
              </Link>
            </nav>
          </div>

          {/* Footer - My Account */}
          <div className="border-t border-foreground/[.08] px-5 py-4">
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-foreground/[.06] hover:text-foreground"
            >
              <User size={18} />
              My Account
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
