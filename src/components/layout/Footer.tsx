"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import WestHomeLogo from "@/components/ui/WestHomeLogo";

const SHOP_LINKS = [
  { label: "Laundry Baskets", href: "/collections/laundry-baskets" },
  { label: "Frames", href: "/collections/frames" },
  { label: "Soap Dispensers", href: "/collections/soap-dispensers" },
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
];

export default function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("bg-primary text-white", className)}>
      <div className="container-shop py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <WestHomeLogo size="sm" variant="light" className="mb-3" />
            <p className="text-sm text-white/50 mb-6 max-w-xs leading-relaxed">
              Premium home décor and lifestyle products curated for your comfort.
            </p>
            <div className="space-y-2 text-sm text-white/50">
              <a href="tel:+919895071144" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={14} />
                <span>+91 98950 71144</span>
              </a>
              <a href="mailto:info@westhomebybmd.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={14} />
                <span>info@westhomebybmd.com</span>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-4 text-white/70">Shop</h3>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-4 text-white/70">Company</h3>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="font-semibold text-xs uppercase tracking-wider mt-6 mb-4 text-white/70">Policies</h3>
            <ul className="space-y-2.5">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp & Location */}
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-4 text-white/70">Connect With Us</h3>
            <a
              href="https://wa.me/919895071144"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm font-medium transition-colors mb-6"
            >
              <MessageCircle size={18} />
              WhatsApp Us
            </a>
            <div className="space-y-3 text-sm text-white/50">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>City Gate Building, near Press Club Junction, Karandakkad, Kasaragod, Kerala — 671121</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-shop py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} west home by BM Distributors. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <Link href="/policies/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <Link href="/policies/terms" className="hover:text-white/50 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
