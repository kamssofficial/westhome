"use client";
import { useSettings } from "@/components/ui/SettingsContext";

export default function ReturnPolicyPage() {
  const { contactEmail, whatsappNumber } = useSettings();
  return (
    <div className="animate-fade-in px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-primary mb-2">Contact &amp; Support</h1>
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
          <h2 className="text-base font-semibold text-primary mb-2">Damaged or Defective Items</h2>
          <p>
            If you receive a damaged or defective item, please contact us within
            48 hours with photographic evidence. We will work with you to resolve
            the issue.
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
