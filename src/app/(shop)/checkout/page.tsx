"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock, CreditCard, Truck, Store } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useCartStore } from "@/store/cart";
import { formatPrice, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, discount, couponCode } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"address" | "payment">("address");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    country: "India",
    deliveryMethod: "delivery" as "delivery" | "pickup",
    paymentMethod: "razorpay",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = getSubtotal();
  const delivery = form.deliveryMethod === "pickup" ? 0 : (subtotal >= 999 ? 0 : 49);
  const total = subtotal - discount + delivery;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    else if (!/^[+]?[0-9]{10,12}$/.test(form.phone.replace(/\s/g, "")))
      errs.phone = "Invalid phone number";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email";
    if (form.deliveryMethod === "delivery") {
      if (!form.addressLine1.trim()) errs.addressLine1 = "Address is required";
      if (!form.city.trim()) errs.city = "City is required";
      if (!form.state.trim()) errs.state = "State is required";
      if (!form.pinCode.trim()) errs.pinCode = "PIN code is required";
      else if (!/^[1-9][0-9]{5}$/.test(form.pinCode)) errs.pinCode = "Invalid PIN code";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToPayment = () => {
    if (validate()) {
      setStep("payment");
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // First create the order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            variantName: item.variantName,
            quantity: item.quantity,
            image: item.image,
            customSize: item.customSize,
          })),
          address: {
            name: form.name,
            phone: form.phone,
            email: form.email,
            addressLine1: form.addressLine1,
            addressLine2: form.addressLine2,
            city: form.city,
            state: form.state,
            pinCode: form.pinCode,
            country: form.country,
          },
          deliveryMethod: form.deliveryMethod,
          couponCode,
          paymentMethod: form.paymentMethod,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || "Failed to create order");
      }

      const orderData = await orderRes.json();
      const orderId = orderData.order.id;

      // Initiate Razorpay payment
      const paymentRes = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: total,
        }),
      });

      if (!paymentRes.ok) {
        throw new Error("Failed to initiate payment");
      }

      const paymentData = await paymentRes.json();

      // Load Razorpay script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        const options = {
          key: paymentData.keyId,
          amount: paymentData.amount,
          currency: "INR",
          name: "WESTHOME by BM Distributors",
          description: `Order ${orderData.order.orderNumber}`,
          order_id: paymentData.razorpayOrderId,
          handler: async (response: any) => {
            // Verify payment
            try {
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId,
                }),
              });

              if (verifyRes.ok) {
                useCartStore.getState().clearCart();
                router.push(`/account/orders/${orderId}?success=true`);
              } else {
                toast.error("Payment verification failed. Please contact support.");
                router.push(`/account/orders/${orderId}?payment_error=true`);
              }
            } catch {
              toast.error("Payment verification failed. Please contact support.");
              router.push(`/account/orders/${orderId}?payment_error=true`);
            }
          },
          prefill: {
            name: form.name,
            email: form.email,
            contact: form.phone,
          },
          theme: {
            color: "#C9A96E",
          },
          modal: {
            ondismiss: () => {
              toast.error("Payment was cancelled");
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", () => {
          toast.error("Payment failed. Please try again.");
          router.push(`/account/orders/${orderId}?payment_error=true`);
        });
        rzp.open();
      };
      document.body.appendChild(script);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-shop py-8 md:py-16">
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          description="Add some products before checking out."
          action={{ label: "Browse Shop", href: "/shop" }}
        />
      </div>
    );
  }

  const inputClass = (field: string) =>
    cn(
      "w-full px-3 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors",
      errors[field] ? "border-error" : "border-border"
    );

  return (
    <div className="container-shop py-4 md:py-8 animate-fade-in">
      {/* Back to cart */}
      <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-4 md:mb-6">
        <ArrowLeft size={16} />
        Back to Cart
      </Link>

      <h1 className="text-xl md:text-2xl font-serif text-foreground mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-4 text-sm">
            <span className={cn("font-medium", step === "address" ? "text-foreground" : "text-success")}>
              1. Address
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className={cn("font-medium", step === "payment" ? "text-foreground" : "text-text-muted")}>
              2. Payment
            </span>
          </div>

          {step === "address" && (
            <div className="space-y-5">
              {/* Contact info */}
              <div className="bg-white border border-border-light rounded-xl p-4 md:p-5">
                <h2 className="text-base font-semibold mb-4">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputClass("name")}
                      placeholder="Your full name"
                    />
                    {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputClass("phone")}
                      placeholder="+91 XXXXX XXXXX"
                    />
                    {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-text-secondary mb-1 block">
                      Email (for order updates)
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputClass("email")}
                      placeholder="your@email.com"
                    />
                    {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
                  </div>
                </div>
              </div>

              {/* Delivery method */}
              <div className="bg-white border border-border-light rounded-xl p-4 md:p-5">
                <h2 className="text-base font-semibold mb-4">Delivery Method</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setForm({ ...form, deliveryMethod: "delivery" })}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      form.deliveryMethod === "delivery"
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30"
                    )}
                  >
                    <Truck size={20} className={form.deliveryMethod === "delivery" ? "text-accent" : "text-text-muted"} />
                    <div>
                      <p className="text-sm font-medium">Delivery</p>
                      <p className="text-xs text-text-muted">
                        {subtotal >= 999 ? "Free delivery" : "₹49 delivery charge"}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setForm({ ...form, deliveryMethod: "pickup" })}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      form.deliveryMethod === "pickup"
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30"
                    )}
                  >
                    <Store size={20} className={form.deliveryMethod === "pickup" ? "text-accent" : "text-text-muted"} />
                    <div>
                      <p className="text-sm font-medium">Store Pickup</p>
                      <p className="text-xs text-text-muted">Free</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Address */}
              {form.deliveryMethod === "delivery" && (
                <div className="bg-white border border-border-light rounded-xl p-4 md:p-5">
                  <h2 className="text-base font-semibold mb-4">Delivery Address</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Address *</label>
                      <input
                        type="text"
                        value={form.addressLine1}
                        onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                        className={inputClass("addressLine1")}
                        placeholder="House/Building name, Street"
                      />
                      {errors.addressLine1 && <p className="text-xs text-error mt-1">{errors.addressLine1}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Apartment, Suite (optional)</label>
                      <input
                        type="text"
                        value={form.addressLine2}
                        onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                        placeholder="Apt, Suite, Floor"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-text-secondary mb-1 block">City *</label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          className={inputClass("city")}
                          placeholder="City"
                        />
                        {errors.city && <p className="text-xs text-error mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary mb-1 block">PIN Code *</label>
                        <input
                          type="text"
                          value={form.pinCode}
                          onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                          className={inputClass("pinCode")}
                          placeholder="6 digits"
                          maxLength={6}
                        />
                        {errors.pinCode && <p className="text-xs text-error mt-1">{errors.pinCode}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">State *</label>
                      <select
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className={inputClass("state")}
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {errors.state && <p className="text-xs text-error mt-1">{errors.state}</p>}
                    </div>
                  </div>
                </div>
              )}

              <Button fullWidth size="lg" onClick={handleProceedToPayment}>
                Continue to Payment
              </Button>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-5">
              {/* Order summary card */}
              <div className="bg-white border border-border-light rounded-xl p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">Shipping to</h2>
                  <button
                    onClick={() => setStep("address")}
                    className="text-xs text-accent hover:underline"
                  >
                    Change
                  </button>
                </div>
                <div className="text-sm text-text-secondary">
                  <p className="font-medium text-foreground">{form.name}</p>
                  {form.deliveryMethod === "delivery" ? (
                    <p>{form.addressLine1}{form.addressLine2 ? `, ${form.addressLine2}` : ""}, {form.city}, {form.state} - {form.pinCode}</p>
                  ) : (
                    <p>Store Pickup at WESTHOME store</p>
                  )}
                  <p>{form.phone}</p>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white border border-border-light rounded-xl p-4 md:p-5">
                <h2 className="text-base font-semibold mb-4">Payment Method</h2>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-foreground/5 cursor-pointer">
                    <CreditCard size={20} className="text-accent" />
                    <div>
                      <p className="text-sm font-medium">Razorpay</p>
                      <p className="text-xs text-text-muted">UPI, Cards, Net Banking, Wallets</p>
                    </div>
                  </label>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-text-muted">
                  <Lock size={12} />
                  <span>Payments are secure and encrypted</span>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                variant="accent"
                loading={loading}
                onClick={handlePlaceOrder}
              >
                <Lock size={16} />
                Pay {formatPrice(total)}
              </Button>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-border-light rounded-xl p-4 md:p-5 sticky top-20">
            <h2 className="text-base font-semibold mb-4">Order Summary</h2>

            {/* Items */}
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-muted flex-shrink-0">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-1">{item.name}</p>
                    {item.variantName && <p className="text-[10px] text-text-muted">{item.variantName}</p>}
                    <p className="text-xs">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-xs font-medium">{formatPrice((item.salePrice || item.price) * item.quantity)}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border-light pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Delivery</span>
                <span>{delivery === 0 ? "FREE" : formatPrice(delivery)}</span>
              </div>
              <div className="border-t border-border-light pt-2 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
