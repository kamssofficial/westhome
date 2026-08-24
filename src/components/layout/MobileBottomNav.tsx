"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Info, Search, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "About Us", href: "/about", icon: Info },
  { label: "Search", href: "/search", icon: Search },
  { label: "Bag", href: "/cart", icon: ShoppingBag },
  { label: "Account", href: "/account", icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((state) => state.getItemCount());

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex items-stretch justify-around border-t border-black/[.06] bg-[#faf8f5]/90 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
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
              "relative flex min-w-0 flex-1 flex-col items-center gap-[3px] px-1 py-1 text-[9px] font-medium tracking-wide transition-colors duration-200",
              active
                ? "text-foreground"
                : "text-[#9a9590] hover:text-[#6b6560]"
            )}
          >
            <Icon
              size={19}
              strokeWidth={active ? 1.8 : 1.5}
              className={cn(
                "transition-all duration-200",
                active ? "text-foreground" : "text-[#b0aba6]"
              )}
              aria-hidden="true"
            />
            <span className="mt-[1px] uppercase tracking-[.08em]">{label}</span>
            {active && (
              <span className="absolute -top-0.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-foreground/80" />
            )}
            {href === "/cart" && itemCount > 0 && (
              <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 text-[8px] font-bold text-white">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
