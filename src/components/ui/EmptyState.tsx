"use client";

import { ShoppingBag, Heart, Search, Package, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import Button from "./Button";

interface EmptyStateProps {
  icon?: "cart" | "wishlist" | "search" | "product" | "review" | "order";
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

const icons = {
  cart: ShoppingBag,
  wishlist: Heart,
  search: Search,
  product: Package,
  review: Star,
  order: Package,
};

export default function EmptyState({
  icon = "product",
  title,
  description,
  action,
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mb-4">
        <Icon size={28} className="text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6">{description}</p>
      {action && (
        <Link href={action.href}>
          <Button variant="primary" size="md">
            {action.label}
            <ArrowRight size={16} />
          </Button>
        </Link>
      )}
    </div>
  );
}
