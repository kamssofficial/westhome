"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingBag, Menu, X, User, ChevronDown } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Wall Decor", href: "/collections/wall-decor" },
  { label: "Comforters", href: "/collections/comforters" },
  { label: "Lamps", href: "/collections/lamps" },
  { label: "Carpets", href: "/collections/carpets" },
  { label: "Accessories", href: "/collections/accessories" },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const itemCount = useCartStore((s) => s.getItemCount());

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      {/* Desktop Header */}
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          "bg-white/95 backdrop-blur-md",
          isScrolled ? "shadow-sm" : ""
        )}
      >
        {/* Top bar - Desktop only */}
        <div className="hidden lg:block border-b border-border-light">
          <div className="container-shop flex items-center justify-between h-8 text-xs text-text-secondary">
            <span>Premium Home & Lifestyle Products</span>
            <div className="flex items-center gap-4">
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
              <span>•</span>
              <span>Track Order</span>
            </div>
          </div>
        </div>

        {/* Main header */}
        <div className="container-shop">
          <div className="flex items-center justify-between h-14 md:h-16 lg:h-20">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 hover:bg-surface-muted rounded-lg transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/images/logo/westhome-logo.png"
                alt="WESTHOME by BM Distributors"
                width={180}
                height={50}
                className="h-8 md:h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-text-secondary hover:text-foreground transition-colors rounded-lg hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Search toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 hover:bg-surface-muted rounded-lg transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              {/* Account */}
              <Link
                href="/account"
                className="p-2 hover:bg-surface-muted rounded-lg transition-colors hidden md:flex"
                aria-label="Account"
              >
                <User size={20} />
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="p-2 hover:bg-surface-muted rounded-lg transition-colors relative"
                aria-label={`Cart with ${itemCount} items`}
              >
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Search bar - expandable */}
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
                className="w-full pl-10 pr-4 py-2.5 bg-surface-muted rounded-lg border-0 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                autoFocus={searchOpen}
              />
            </form>
          </div>
        </div>
      </header>

      {/* Mobile slide menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-opacity duration-300",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={cn(
            "absolute top-0 left-0 w-72 h-full bg-white overflow-y-auto transition-transform duration-300",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-4 border-b border-border-light">
            <Image
              src="/images/logo/westhome-logo.png"
              alt="WESTHOME"
              width={140}
              height={40}
              className="h-7 w-auto"
            />
          </div>
          <nav className="p-4">
            <div className="space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-border-light space-y-1">
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors"
              >
                My Account
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors"
              >
                About Us
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted rounded-lg transition-colors"
              >
                Contact
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
