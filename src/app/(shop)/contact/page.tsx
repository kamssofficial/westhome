"use client";

import Link from "next/link";
import { useSettings } from "@/components/ui/SettingsContext";
import { ArrowLeft, Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";

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
              <div>
                <p className="text-sm font-medium text-primary">Store Address</p>
                <p className="text-sm text-secondary mt-0.5 leading-relaxed">
                  City Gate Building, near Press Club Junction,<br />
                  Karandakkad, Kasaragod,<br />
                  Kerala, India — 671121
                </p>
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

      {/* Map Placeholder */}
      <div className="container-shop pb-8">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="relative h-48 bg-surface-muted flex items-center justify-center">
            <div className="text-center">
              <MapPin size={32} className="mx-auto text-secondary mb-2" />
              <p className="text-sm font-medium text-primary">Karandakkad, Kasaragod</p>
              <p className="text-xs text-secondary mt-0.5">Kerala, India — 671121</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
