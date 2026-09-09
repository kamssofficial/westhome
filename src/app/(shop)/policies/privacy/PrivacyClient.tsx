"use client";
import { useSettings } from "@/components/ui/SettingsContext";

export default function PrivacyPolicyPage() {
  const { contactPhone, contactEmail } = useSettings();
  return (
    <div className="animate-fade-in px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-primary mb-2">Privacy Policy</h1>
      <p className="text-xs text-secondary mb-6">Last updated: August 2026</p>

      <div className="space-y-6 text-sm text-secondary leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-primary mb-2">1. Information We Collect</h2>
          <p>We collect information you provide directly, including your name, email address, phone number, shipping address, and payment information when you place an order or create an account.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">2. How We Use Your Information</h2>
          <p>We use your information to process orders, communicate with you about your orders, improve our products and services, and send promotional communications (with your consent).</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">3. Information Sharing</h2>
          <p>We do not sell your personal information. We may share your information with trusted service providers who assist us in operating our business, such as payment processors and shipping carriers.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">4. Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">5. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal information. You may also opt out of marketing communications at any time by contacting us.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">6. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at <a href={`mailto:${contactEmail}`} className="text-accent hover:underline">{contactEmail}</a> or call us at <a href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`} className="text-accent hover:underline">{contactPhone}</a>.</p>
        </section>
      </div>
    </div>
  );
}
