"use client";
import { useSettings } from "@/components/ui/SettingsContext";

export default function ReturnPolicyPage() {
  const { contactEmail, whatsappNumber } = useSettings();
  return (
    <div className="animate-fade-in px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-primary mb-2">Returns &amp; Refunds Policy</h1>
      <p className="text-xs text-secondary mb-6">Last updated: August 2026</p>

      <div className="space-y-6 text-sm text-secondary leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-primary mb-2">We are here to help</h2>
          <p>
            At WestHome, we stand behind the quality of every product we offer.
            If you have any concerns about your order, please reach out to our
            support team and we will do our best to assist you.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">Returns &amp; Refunds</h2>
          <p className="mb-3">
            We are a small independent home-décor retailer and do not run a general
            change-of-mind return window. Our returns policy covers items that arrive
            damaged, defective, or different from what you ordered.
          </p>
          <h2 className="text-base font-semibold text-primary mb-2">Damaged or Defective Items</h2>
          <p>
            If your item arrives damaged or defective, contact us within 48 hours of
            delivery with photographs of the damage. We will arrange a replacement or a
            full refund. Claims raised more than 48 hours after delivery may not be
            accepted.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">How to Reach Us</h2>
          <p>
            For any order-related concerns, please contact us via:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              Email: <a href="mailto:info@westhome.in" className="text-accent hover:underline">info@westhome.in</a>
            </li>
            <li>
              WhatsApp: <a href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">WhatsApp us</a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
