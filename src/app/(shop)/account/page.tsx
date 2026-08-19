"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Package, Heart, MapPin, Settings, LogOut, ChevronRight, ShoppingBag } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

const ACCOUNT_SECTIONS = [
  { label: "Orders", href: "/account/orders", icon: Package, description: "View and track your orders" },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart, description: "Your saved products" },
  { label: "Addresses", href: "/account/addresses", icon: MapPin, description: "Manage delivery addresses" },
  { label: "Settings", href: "/account/settings", icon: Settings, description: "Account preferences" },
];

export default function AccountPage() {
  const wishlistCount = useWishlistStore((s) => s.getItemCount());
  const cartCount = useCartStore((s) => s.getItemCount());

  return (
    <div className="container-shop py-4 md:py-8 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-serif text-foreground mb-6">My Account</h1>

      {/* Guest prompt */}
      <div className="bg-white border border-border-light rounded-xl p-4 md:p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-text-muted" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold">Welcome to WESTHOME</h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Sign in to access your orders, wishlist, and saved addresses.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Link href="/login" className="flex-1">
            <button className="w-full px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
              Sign In
            </button>
          </Link>
          <Link href="/register" className="flex-1">
            <button className="w-full px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-surface-muted transition-colors">
              Create Account
            </button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/cart" className="bg-white border border-border-light rounded-xl p-4 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} className="text-accent" />
            <div>
              <p className="text-lg font-semibold">{cartCount}</p>
              <p className="text-xs text-text-muted">Cart Items</p>
            </div>
          </div>
        </Link>
        <Link href="/account/wishlist" className="bg-white border border-border-light rounded-xl p-4 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <Heart size={20} className="text-accent" />
            <div>
              <p className="text-lg font-semibold">{wishlistCount}</p>
              <p className="text-xs text-text-muted">Wishlist</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Account sections */}
      <div className="space-y-2">
        {ACCOUNT_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center gap-3 p-4 bg-white border border-border-light rounded-xl hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center">
              <section.icon size={18} className="text-text-secondary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{section.label}</p>
              <p className="text-xs text-text-muted">{section.description}</p>
            </div>
            <ChevronRight size={16} className="text-text-muted group-hover:text-foreground transition-colors" />
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button
        className="flex items-center gap-3 p-4 mt-6 w-full text-left text-error hover:bg-error/5 rounded-xl transition-colors"
      >
        <LogOut size={18} />
        <span className="text-sm font-medium">Sign Out</span>
      </button>
    </div>
  );
}
