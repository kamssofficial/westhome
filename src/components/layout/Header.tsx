"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import WestHomeLogo from "@/components/ui/WestHomeLogo";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
];

const COLLECTIONS = [
  { label: "Laundry Baskets", href: "/collections/laundry-baskets" },
  { label: "Frames", href: "/collections/frames" },
  { label: "Soap Dispensers", href: "/collections/soap-dispensers" },
];

const SECONDARY_LINKS = [
  { label: "My Account", href: "/account" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const getItemCount = useCartStore((s) => s.getItemCount);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setMobileMenuOpen(false);
      setSearchOpen(false);
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const cartCount = mounted ? getItemCount() : 0;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-shadow duration-300 scroll-edge-bottom",
          isScrolled ? "shadow-sm" : ""
        )}
        style={{
          backgroundColor: "rgba(247, 243, 234, 0.72)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)" as any,
        }}
      >
        <div className="container-shop">
          <div className="flex items-center justify-between h-14 md:h-16 lg:h-[72px]">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 hover:bg-surface-muted active:scale-95 rounded-xl transition-all duration-150"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Logo — centered on mobile */}
            <Link href="/" className="flex-shrink-0 absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
              <WestHomeLogo size="md" />
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              ))}
              <div className="relative group">
                <Link
                  href="/shop"
                  className="px-3 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-muted inline-flex items-center gap-1"
                >
                  Collections <ChevronRight size={12} className="rotate-90" />
                </Link>
                <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-dropdown border border-border-light py-1 min-w-[180px]">
                    {COLLECTIONS.map((col) => (
                      <Link
                        key={col.href}
                        href={col.href}
                        className="block px-4 py-2.5 text-sm text-secondary hover:text-primary hover:bg-surface-muted transition-colors"
                      >
                        {col.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 hover:bg-surface-muted active:scale-95 rounded-xl transition-all duration-150"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
              <Link
                href="/cart"
                className="p-2 hover:bg-surface-muted active:scale-95 rounded-xl transition-all duration-150 relative"
                aria-label="Cart"
              >
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 border-t border-border-light",
            searchOpen ? "max-h-20" : "max-h-0 border-t-0"
          )}
        >
          <div className="container-shop py-3">
            <form onSubmit={handleSearch} className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-muted rounded-xl border-0 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                autoFocus={searchOpen}
              />
            </form>
          </div>
        </div>
      </header>

      {/* ============ MOBILE DRAWER ============ */}
      {/* Overlay */}
      <div
        className={cn(            "fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] transition-opacity duration-[250ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] lg:hidden",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 z-[61] h-full w-[82%] max-w-[320px] overflow-y-auto transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", backgroundColor: "rgba(247, 243, 234, 0.85)", backdropFilter: "blur(24px) saturate(200%)", WebkitBackdropFilter: "blur(24px) saturate(200%)" }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 scroll-edge-bottom">
          <WestHomeLogo size="sm" />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 -mr-2 hover:bg-surface-muted active:scale-95 rounded-xl transition-all duration-150"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Primary navigation */}
        <nav className="px-4 pt-4 pb-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleNavClick}
              className="flex items-center justify-between py-3 text-[15px] font-medium text-primary hover:text-accent transition-colors rounded-lg"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Collections group */}
        <div className="px-4 pb-2">
          <p className="py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            Collections
          </p>
          <div className="space-y-0">
            {COLLECTIONS.map((col) => (
              <Link
                key={col.href}
                href={col.href}
                onClick={handleNavClick}
                className="flex items-center justify-between py-2.5 pl-3 text-[14px] text-secondary hover:text-primary transition-colors rounded-lg"
              >
                {col.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-border-light" />

        {/* Secondary navigation */}
        <nav className="px-4 pt-3 pb-6">
          {SECONDARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleNavClick}
              className="flex items-center justify-between py-2.5 text-[14px] text-secondary hover:text-primary transition-colors rounded-lg"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
