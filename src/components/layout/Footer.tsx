import Link from "next/link";
import WestHomeLogo from "@/components/ui/WestHomeLogo";
import { Mail, MapPin, Phone, ArrowUpRight, MessageCircle } from "lucide-react";

const SHOP_LINKS = [
  { label: "Wall Decor", href: "/collections/wall-decor" },
  { label: "Laundry", href: "/collections/laundry" },
  { label: "Comforters", href: "/collections/comforters" },
  { label: "Lamps", href: "/collections/lamps" },
  { label: "Carpets", href: "/collections/carpets" },
  { label: "Clocks", href: "/collections/clocks" },
  { label: "Accessories", href: "/collections/accessories" },
];
const COMPANY_LINKS = [
  { label: "About us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Store location", href: "/contact#location" },
];
const POLICY_LINKS = [
  { label: "Privacy", href: "/policies/privacy" },
  { label: "Terms", href: "/policies/terms" },
  { label: "Shipping", href: "/policies/shipping" },
];

export default function Footer({ className }: { className?: string }) {
  return (
    <footer className={`bg-foreground text-white ${className || ""}`}>
      <div className="container-shop py-16 md:py-24">
        <div className="mb-16 flex flex-col gap-8 border-b border-white/10 pb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-label mb-4 text-[9px] text-[#e0a681]">
              Make room for living
            </p>
            <h2 className="font-display max-w-xl text-4xl leading-[.98] text-white md:text-6xl">
              The details make the home.
            </h2>
          </div>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10 md:self-end"
          >
            Explore the collection{" "}
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-10">
          <div>
            <div className="mb-5">
              <WestHomeLogo
                variant="inverse"
                size="md"
                plain
                className="h-9 w-auto"
              />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/65">
              Premium home décor and lifestyle pieces, curated to make everyday
              spaces feel more like you.
            </p>
            <div className="mt-7 space-y-3 text-sm text-white/65">
              <a
                href="tel:+919895071144"
                className="flex items-center gap-2 hover:text-white"
              >
                <Phone size={14} /> +91 99999 99999
              </a>
              <a
                href="mailto:info@westhomebybmd.com"
                className="flex items-center gap-2 hover:text-white"
              >
                <Mail size={14} /> info@westhomebybmd.com
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-label mb-5 text-[9px] text-white/40">Shop</h3>
            <ul className="space-y-3">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/65 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-label mb-5 text-[9px] text-white/40">
              Company
            </h3>
            <ul className="space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/65 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="font-label mb-5 mt-9 text-[9px] text-white/40">
              Policies
            </h3>
            <ul className="space-y-3">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/65 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-label mb-5 text-[9px] text-white/40">
              Visit or message
            </h3>
            <a
              href="https://wa.me/919895071144"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-4 text-sm font-semibold transition-colors hover:bg-white/15"
            >
              <span className="flex items-center gap-3">
                <MessageCircle size={18} className="text-[#64d88a]" /> Chat on
                WhatsApp
              </span>
              <ArrowUpRight
                size={16}
                className="text-white/50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
            <div className="mt-5 flex items-start gap-2 text-sm text-white/55">
              <MapPin size={15} className="mt-0.5 shrink-0" /> Store Location,
              India
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-shop flex flex-col gap-2 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} WESTHOME by BM Distributors. All rights
            reserved.
          </p>
          <div className="flex gap-5">
            <Link href="/policies/privacy" className="hover:text-white/70">
              Privacy
            </Link>
            <Link href="/policies/terms" className="hover:text-white/70">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
