"use client";

export default function ReturnPolicyPage() {
  return (
    <div className="animate-fade-in px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-primary mb-2">Return &amp; Exchange Policy</h1>
      <p className="text-xs text-secondary mb-6">Last updated: August 2026</p>

      <div className="space-y-6 text-sm text-secondary leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-primary mb-2">1. Return Window</h2>
          <p>You may request a return within 7 days of receiving your order. Items must be unused, in original packaging, and with all tags intact.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">2. Eligible Items</h2>
          <p>Most items are eligible for return. Items that are personalized, custom-sized, or on final sale may not be eligible. Contact us if you are unsure.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">3. How to Initiate a Return</h2>
          <p>Contact us via email or WhatsApp with your order number and reason for return. Our team will guide you through the return process within 24-48 hours.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">4. Refund Process</h2>
          <p>Once we receive and inspect the returned item, your refund will be processed within 5-7 business days to the original payment method.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">5. Exchanges</h2>
          <p>We offer exchanges for products of equal or higher value. Price differences will be charged or refunded accordingly.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">6. Damaged or Defective Items</h2>
          <p>If you receive a damaged or defective item, contact us within 48 hours with photographic evidence. We will arrange a free pickup and replacement.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">7. Contact</h2>
          <p>For returns and exchanges, reach us at <a href="mailto:info@westhomebybmd.com" className="text-accent hover:underline">info@westhomebybmd.com</a> or <a href="https://wa.me/919895071144" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">WhatsApp us</a>.</p>
        </section>
      </div>
    </div>
  );
}
