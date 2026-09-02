"use client";

export default function TermsOfServicePage() {
  return (
    <div className="animate-fade-in px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-primary mb-2">Terms of Service</h1>
      <p className="text-xs text-secondary mb-6">Last updated: August 2026</p>

      <div className="space-y-6 text-sm text-secondary leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-primary mb-2">1. Acceptance of Terms</h2>
          <p>By accessing and using the WESTHOME website, you agree to be bound by these Terms of Service. If you do not agree, please do not use our website.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">2. Products and Orders</h2>
          <p>All products are subject to availability. We reserve the right to discontinue any product at any time. Prices are subject to change without notice. We make every effort to display product colors and details accurately, but actual colors may vary due to screen settings.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">3. Payment</h2>
          <p>We accept payments through Razorpay, including UPI, credit/debit cards, and net banking. All payments are processed securely.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">4. Intellectual Property</h2>
          <p>All content on this website, including text, images, logos, and design, is the property of WESTHOME by BM Distributors and is protected by copyright laws.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">5. Limitation of Liability</h2>
          <p>WESTHOME shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">6. Governing Law</h2>
          <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Kasaragod, Kerala.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">7. Contact</h2>
          <p>For questions about these Terms, contact us at <a href="mailto:info@westhomebybmd.com" className="text-accent hover:underline">info@westhomebybmd.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
