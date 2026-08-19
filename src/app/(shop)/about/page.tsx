"use client";

import Link from "next/link";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="bg-surface-muted/50 border-b border-border-light">
        <div className="container-shop py-10 md:py-16 text-center">
          <p className="text-accent text-xs font-medium uppercase tracking-[0.2em] mb-3">About Us</p>
          <h1 className="text-2xl md:text-4xl font-serif text-foreground mb-4">
            WESTHOME by BM Distributors
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-lg mx-auto leading-relaxed">
            Your trusted destination for premium home décor and lifestyle products.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="container-shop py-10 md:py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h2 className="text-xl font-serif mb-4">Our Story</h2>
            <p className="text-text-secondary leading-relaxed">
              WESTHOME is a premium home lifestyle brand by BM Distributors,
              offering carefully curated products to elevate your living spaces.
              From elegant wall decor to luxurious comforters, we bring quality
              and style to your home.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-serif mb-4">Our Mission</h2>
            <p className="text-text-secondary leading-relaxed">
              To provide premium home products at accessible prices, backed by
              excellent customer service and reliable delivery.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-serif mb-4">Why Choose WESTHOME</h2>
            <ul className="space-y-2 text-text-secondary">
              <li>• Premium quality products</li>
              <li>• Curated collections for every room</li>
              <li>• Competitive pricing</li>
              <li>• Fast and reliable delivery</li>
              <li>• Dedicated customer support</li>
              <li>• Easy returns and exchanges</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
