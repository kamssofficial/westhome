"use client";

import Link from "next/link";
import { useSettings } from "@/components/ui/SettingsContext";
import { STORE_LOCATIONS } from "@/lib/storeLocations";
import { ArrowLeft, ArrowUpRight, Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";

export default function ContactPage() {
  const { contactPhone, contactEmail, whatsappNumber } = useSettings();
  return (
    <div className="animate-fade-in">
      <div className="container-shop pt-3 pb-2 flex items-center gap-3">
        <Link href="/" className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-primary">Contact Us</h1>
      </div>

      {/* Store Info Card */}
      <div className="container-shop py-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center">
              <span className="text-white text-lg font-semibold">W</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-primary">West Home by BM Distributors</h2>
              <p className="text-xs text-secondary">Premium Home Décor</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Address */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-secondary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">Store Addresses</p>
                {STORE_LOCATIONS.map((store) => (
                  <div key={store.id} className="mt-2 text-sm text-secondary leading-relaxed">
                    <p className="font-medium text-primary">{store.label}</p>
                    {store.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    <a
                      href={store.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      Get directions <ArrowUpRight size={12} />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0">
                <Phone size={16} className="text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Phone</p>
                <a href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`} className="text-sm text-accent hover:underline">
                  {contactPhone}
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0">
                <Mail size={16} className="text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Email</p>
                <a href={`mailto:${contactEmail}`} className="text-sm text-accent hover:underline">
                  {contactEmail}
                </a>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={16} className="text-[#25D366]" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">WhatsApp</p>
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  Chat with us on WhatsApp
                </a>
              </div>
            </div>

            {/* Hours */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Business Hours</p>
                <p className="text-sm text-secondary mt-0.5">
                  Monday – Saturday: 10:00 AM – 8:00 PM<br />
                  Sunday: 11:00 AM – 6:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="container-shop pb-4">
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 bg-[#25D366] text-white rounded-2xl text-sm font-semibold hover:bg-[#20BD5C] transition-colors"
          >
            <MessageCircle size={18} />
            WhatsApp Us
          </a>
          <a
            href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`}
            className="flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            <Phone size={18} />
            Call Now
          </a>
        </div>
      </div>

      {/* Store locations — each tile opens the showroom in Google Maps */}
      <div className="container-shop pb-8">
        <div className="grid gap-3 sm:grid-cols-2">
          {STORE_LOCATIONS.map((store) => (
            <a
              key={store.id}
              href={store.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="relative h-32 bg-surface-muted flex items-center justify-center">
                <MapPin size={28} className="text-secondary transition-colors group-hover:text-accent" />
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-primary">{store.label}</p>
                <p className="text-xs text-secondary mt-0.5">Open in Google Maps</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
