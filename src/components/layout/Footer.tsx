"use client";

import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";

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
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Store Location", href: "/contact#location" },
];

const POLICY_LINKS = [
  { label: "Privacy Policy", href: "/policies/privacy" },
  { label: "Terms of Service", href: "/policies/terms" },
  { label: "Shipping Policy", href: "/policies/shipping" },
  { label: "Return Policy", href: "/policies/returns" },
  { label: "Cancellation Policy", href: "/policies/cancellation" },
];

export default function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("bg-primary text-white", className)}>
      {/* Main footer */}
      <div className="container-shop py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Image
              src="/images/logo/westhome-logo.png"
              alt="WESTHOME by BM Distributors"
              width={160}
              height={45}
              className="h-8 w-auto brightness-0 invert mb-4"
            />
            <p className="text-sm text-white/60 mb-6 max-w-xs">
              Premium home décor and lifestyle products curated for your
              comfort.
            </p>
            <div className="space-y-2 text-sm text-white/60">
              <a
                href="tel:+919999999999"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone size={14} />
                <span>+91 99999 99999</span>
              </a>
              <a
                href="mailto:info@westhomebybmd.com"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Mail size={14} />
                <span>info@westhomebybmd.com</span>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-white/80">
              Shop
            </h3>
            <ul className="space-y-2">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-white/80">
              Company
            </h3>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="font-semibold text-sm uppercase tracking-wider mt-6 mb-4 text-white/80">
              Policies
            </h3>
            <ul className="space-y-2">
              {POLICY_LINKS.slice(0, 3).map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp & Social */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-white/80">
              Connect With Us
            </h3>
            <a
              href="https://wa.me/919999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#20BD5C] transition-colors mb-6"
            >
              <MessageCircle size={18} />
              Chat on WhatsApp
            </a>
            <div className="space-y-2 text-sm text-white/60">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>Store Location, India</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-shop py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} WESTHOME by BM Distributors. All
            rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <Link href="/policies/privacy" className="hover:text-white/60 transition-colors">
              Privacy
            </Link>
            <Link href="/policies/terms" className="hover:text-white/60 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
