"use client";

export default function ShippingPolicyPage() {
  return (
    <div className="animate-fade-in px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-primary mb-2">Shipping Policy</h1>
      <p className="text-xs text-secondary mb-6">Last updated: August 2026</p>

      <div className="space-y-6 text-sm text-secondary leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-primary mb-2">1. Shipping Areas</h2>
          <p>We currently ship across India. For international shipping inquiries, please contact us directly.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">2. Delivery Timeline</h2>
          <p>Orders are typically delivered within 3-7 business days depending on your location. Metro cities usually receive orders within 3-5 days. Remote areas may take up to 7-10 business days.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">3. Shipping Charges</h2>
          <p>Free shipping on orders above ₹999. A flat shipping fee of ₹49 applies to orders below ₹999. Cash on Delivery (COD) may carry additional charges.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">4. Order Tracking</h2>
          <p>Once your order is shipped, you will receive a tracking link via SMS and email. You can also track your order from your account dashboard.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">5. Store Pickup</h2>
          <p>Free store pickup is available at our Kasaragod showroom. Select &quot;Store Pickup&quot; at checkout. You will be notified when your order is ready for collection.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">6. Damaged Shipments</h2>
          <p>If your order arrives damaged, please contact us within 48 hours with photos of the damage. We will arrange a replacement or full refund.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-2">7. Contact</h2>
          <p>For shipping inquiries, reach us at <a href="mailto:info@westhomebybmd.com" className="text-accent hover:underline">info@westhomebybmd.com</a> or <a href="https://wa.me/919895071144" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">WhatsApp us</a>.</p>
        </section>
      </div>
    </div>
  );
}
