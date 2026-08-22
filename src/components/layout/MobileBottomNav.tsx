"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, Home, Search, ShoppingBag, UserRound } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Shop", href: "/shop", icon: Grid2X2 },
  { label: "Search", href: "/search", icon: Search },
  { label: "Bag", href: "/cart", icon: ShoppingBag },
  { label: "Account", href: "/account", icon: UserRound },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((state) => state.getItemCount());

  return (
    <nav
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md touch-manipulation items-center justify-around rounded-[1.35rem] border border-white/70 bg-white/80 px-2 py-2 shadow-[0_12px_40px_rgba(31,33,31,.16)] backdrop-blur-xl md:hidden"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-[transform,color,background-color] duration-300 active:scale-95",
              active
                ? "bg-foreground text-white"
                : "text-text-muted hover:bg-foreground/[.06] hover:text-foreground"
            )}
          >
            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
            <span>{label}</span>
            {href === "/cart" && itemCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
