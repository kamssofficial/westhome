"use client";

import { use } from "react";

const POLICY_CONTENT: Record<string, { title: string; content: string }> = {
  privacy: {
    title: "Privacy Policy",
    content: `This Privacy Policy describes how WEST HOME by BM Distributors collects, uses, and protects your personal information when you use our website and services.

Information We Collect:
- Name, email, phone number
- Shipping and billing addresses
- Payment information (processed securely)
- Order history and preferences
- Website usage data

How We Use Your Information:
- To process and fulfill your orders
- To communicate about your orders
- To improve our services
- To send marketing communications (with your consent)

Data Protection:
We implement appropriate security measures to protect your personal information. Payment data is processed securely through our payment partner.

Contact Us:
For privacy-related inquiries, please contact us at info@westhome.in.`,
  },
  terms: {
    title: "Terms of Service",
    content: `Welcome to WEST HOME by BM Distributors. By using our website, you agree to these terms.

Products and Pricing:
- All prices are in Indian Rupees (INR)
- Prices are subject to change without notice
- Product images are for illustration purposes

Orders:
- All orders are subject to product availability
- We reserve the right to cancel orders
- Payment must be received before order processing

Liability:
- We are not liable for indirect damages
- Our liability is limited to the purchase price

Contact:
For questions about these terms, please contact us at info@westhome.in.`,
  },
  shipping: {
    title: "Shipping Policy",
    content: `Shipping Information:

Delivery Areas:
We deliver across India. Delivery times may vary by location.

Delivery Time:
- Standard delivery: 5-7 business days
- Express delivery may be available for select areas

Shipping Charges:
- Free delivery on orders above ₹999
- Standard delivery charge of ₹49 for orders below ₹999

Store Pickup:
Store pickup may be available at our location.

Contact:
For shipping inquiries, please WhatsApp us or email info@westhome.in.`,
  },
  returns: {
    title: "Contact & Support",
    content: `We are here to help:

At West Home, we stand behind the quality of every product we offer.
If you have any concerns about your order, please reach out to our
support team and we will do our best to assist you.

Damaged or Defective Items:
If you receive a damaged or defective item, please contact us within
48 hours with photographic evidence. We will work with you to resolve
the issue.

How to Reach Us:
- Email: info@westhome.in
- WhatsApp: https://wa.me/919544572445`,
  },
  cancellation: {
    title: "Cancellation Policy",
    content: `Cancellation Policy:

Order Cancellation:
- You may cancel your order before it is shipped
- Contact us immediately if you wish to cancel

Cancellation Process:
1. Contact us via WhatsApp or email
2. Provide your order number
3. We will process the cancellation

Refund for Cancellations:
- Full refund for orders cancelled before shipping
- Refund processed within 5-7 business days

Contact:
For cancellation requests, please contact info@westhome.in`,
  },
};

export default function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const policy = POLICY_CONTENT[slug];

  if (!policy) {
    return (
      <div className="container-shop py-20 text-center">
        <h1 className="text-xl font-semibold">Page Not Found</h1>
        <p className="text-sm text-text-secondary mt-2">This page doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div className="container-shop py-10 md:py-16 max-w-3xl animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-serif text-foreground mb-8">{policy.title}</h1>
      <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed whitespace-pre-line">
        {policy.content}
      </div>
    </div>
  );
}
