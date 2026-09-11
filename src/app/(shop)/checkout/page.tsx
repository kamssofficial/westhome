"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronRight, Shield, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { trackEvent } from "@/components/ui/AnalyticsTracker";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { formatPrice, cn } from "@/lib/utils";
import GoogleReviewPrompt from "@/components/shop/GoogleReviewPrompt";

const STEPS = ["Address", "Review", "Payment"];
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayResponse { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; }
interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  prefill?: { name?: string; email?: string; contact?: string }; notes?: Record<string, string>; theme?: { color?: string };
  modal?: { ondismiss?: () => void }; handler: (response: RazorpayResponse) => void;
}
declare global {
  // eslint-disable-next-line no-var
  var Razorpay: new (options: RazorpayOptions) => { open: () => void; close: () => void } | undefined;
}
interface Address { id: string; name: string; phone: string; addressLine1: string; addressLine2?: string; city: string; state: string; pinCode: string; isDefault?: boolean; }
interface OrderRef { id: string; orderNumber: string; }

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`) as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true }); existing.addEventListener("error", () => resolve(false), { once: true }); return; }
    const script = document.createElement("script"); script.src = RAZORPAY_SCRIPT; script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay)); script.onerror = () => resolve(false); document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentAcknowledged, setPaymentAcknowledged] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderRef | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [freeThreshold, setFreeThreshold] = useState(2000);
  const [deliveryChargeRate, setDeliveryChargeRate] = useState(149);


  const items = useCartStore((s) => s.items);
  const couponCode = useCartStore((s) => s.couponCode);
  const discount = useCartStore((s) => s.discount);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = mounted ? getSubtotal() : 0;
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const deliveryCharge = deliveryOption === "express" ? 299 : (subtotal > freeThreshold ? 0 : deliveryChargeRate);
  const amountNeeded = Math.max(0, freeThreshold - subtotal + 1);
  const total = Math.max(0, subtotal - safeDiscount + deliveryCharge);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    // Check for existing pending order to avoid duplicates on retry
    // SECURITY: Only reuse if the order items match the current cart
    fetch("/api/orders?status=NEW&limit=1")
      .then((r) => r.json())
      .then((data) => {
        const pending = data.orders?.[0];
        if (pending?.id && pending?.orderNumber && pending?.items) {
          // Compare order items with current cart items by productId+variantId+quantity
          const orderItemKeys = new Set<string>(
            (pending.items as any[]).map((i: any) => `${i.productId}:${i.variantId || ""}:${i.quantity}`)
          );
          const cartItemKeys = new Set<string>(
            items.map((i) => `${i.productId}:${i.variantId || ""}:${i.quantity}`)
          );
          const matches =
            orderItemKeys.size === cartItemKeys.size &&
            [...orderItemKeys].every((k) => cartItemKeys.has(k));
          if (matches) {
            setOrderResult({ id: pending.id, orderNumber: pending.orderNumber });
          }
        }
      })
      .catch(() => {});
  }, [items]);
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings) { if (d.settings.freeDeliveryThreshold) setFreeThreshold(Number(d.settings.freeDeliveryThreshold)); if (d.settings.defaultDeliveryCharge) setDeliveryChargeRate(Number(d.settings.defaultDeliveryCharge)); }
    }).catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/addresses").then((r) => r.json()).then((data) => {
      const addrs = data.addresses || []; setAddresses(addrs);
      const preferred = addrs.find((a: Address) => a.isDefault) || addrs[0]; if (preferred) setSelectedAddress(preferred.id);
    }).catch(() => {}).finally(() => setLoadingAddresses(false));
    fetch("/api/auth/session").then((r) => r.json()).then((data) => { if (data?.user?.email) setUserEmail(data.user.email); }).catch(() => {});
  }, []);

  // ── Express checkout (?express=1 from the Buy Now button) ──
  // Skip the Address/Review steps when a saved address already exists:
  // pre-select it and land directly on the Payment step. Without an address
  // (or when arriving normally from /cart), the page opens on Address as before.
  const searchParams = useSearchParams();
  const expressRequested = useRef(false);
  const [expressActive, setExpressActive] = useState(false);
  useEffect(() => {
    if (!mounted || !loadingAddresses || expressRequested.current) return;
    const raw = searchParams.get("express");
    if (raw !== "1" && raw !== "true") return;
    expressRequested.current = true;
    if (items.length === 0) return; // empty cart falls back to the empty-cart guard below
    if (selectedAddress) {
      trackEvent("CHECKOUT_STARTED", { metadata: { flow: "express_buy_now" } });
      setStep(2);
      setExpressActive(true);
    } else {
      // No saved address: stay on the Address step and tell the user why.
      toast("Add a delivery address to complete your order.");
    }
  }, [mounted, loadingAddresses, items.length, selectedAddress, searchParams]);



  const createOrder = async (): Promise<OrderRef> => {
    const addr = addresses.find((a) => a.id === selectedAddress);
    if (!addr) throw new Error("Select a delivery address before continuing.");
    if (items.length === 0) throw new Error("Your cart is empty.");
    const res = await fetch("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: addr.name, customerEmail: userEmail, customerPhone: addr.phone,
        addressLine1: addr.addressLine1, addressLine2: addr.addressLine2 || "", city: addr.city, state: addr.state, pinCode: addr.pinCode, country: "India",
        items: items.map((item) => ({ productId: item.productId, variantId: item.variantId || null, productName: item.name, variantName: item.variantName || null, quantity: item.quantity, image: item.image || null, customSize: item.customSize || null })),
        subtotal, discount: safeDiscount, couponCode: couponCode || null, deliveryCharge, tax: 0, total,
        paymentMethod: "RAZORPAY", deliveryMethod: deliveryOption === "express" ? "express" : "delivery",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.order?.id && data?.order?.orderNumber) {
      return data.order as OrderRef;
    }
    throw new Error(data?.error || "Failed to create your order.");
  };

  const openRazorpay = async (order: OrderRef) => {
    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) throw new Error("Payment gateway could not be loaded. Check your connection and try again.");
    const createPayment = await fetch("/api/payment/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, amount: total }) });
    const paymentData = await createPayment.json().catch(() => ({}));
    if (!createPayment.ok || !paymentData?.razorpayOrderId || !paymentData?.keyId) throw new Error(paymentData?.error || "Unable to start secure payment.");
    const address = addresses.find((a) => a.id === selectedAddress);
    const checkout = new window.Razorpay({
      key: paymentData.keyId, amount: paymentData.amount, currency: paymentData.currency || "INR", name: "Westhome", description: `Order ${order.orderNumber}`, order_id: paymentData.razorpayOrderId,
      prefill: { name: address?.name, email: userEmail, contact: address?.phone }, notes: { orderNumber: order.orderNumber }, theme: { color: "#111111" },
      modal: { ondismiss: () => toast("Payment window closed. Your order is saved; you can retry payment.") },
      handler: async (response) => {
        setVerifyingPayment(true);
        try {
          const verify = await fetch("/api/payment/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }) });
          const verifyData = await verify.json().catch(() => ({}));
          if (!verify.ok || !verifyData?.verified) throw new Error(verifyData?.error || "Payment verification failed.");
          setPaymentAcknowledged(true); setOrderResult(order); clearCart(); setStep(3); toast.success("Payment successful");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Payment verification failed. Please contact support."); }
        finally { setVerifyingPayment(false); }
      },
    });
    checkout.open();
  };

  const handlePay = async () => {
    if (placingOrder || verifyingPayment || items.length === 0) return;
    setPlacingOrder(true);
    try {
      const order = orderResult || await createOrder();
      setOrderResult(order); // Preserve the pending order so closing Razorpay never creates a duplicate order.
      await openRazorpay(order);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to start payment."); }
    finally { setPlacingOrder(false); }
  };

  if (!mounted) return <div className="container-shop py-16"><div className="animate-pulse space-y-4"><div className="h-32 bg-surface-muted rounded-[1.35rem]" /><div className="h-20 bg-surface-muted rounded-[1.35rem]" /></div></div>;
  if (items.length === 0 && step !== 3) return <div className="container-shop py-20 text-center"><h1 className="text-xl font-semibold text-primary mb-2">Your cart is empty</h1><p className="text-sm text-secondary mb-6">Add something to your cart before checking out.</p><Link href="/shop" className="inline-flex px-6 py-3 bg-primary text-white rounded-full text-sm font-semibold">Browse Products</Link></div>;

  return <div className="animate-fade-in">
    <div className="container-shop pt-3 pb-2 flex items-center gap-3"><Link href="/cart" aria-label="Back to cart" className="p-2 hover:bg-surface-muted rounded-lg"><ArrowLeft size={20} /></Link><h1 className="text-xl font-semibold text-primary">Checkout</h1></div>
    <div className="container-shop pb-8"><div className="flex items-center justify-between max-w-2xl mx-auto">{STEPS.map((label, i) => <div key={label} className="flex items-center flex-1"><div className="flex items-center gap-2"><div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", i <= step ? "bg-primary text-white" : "bg-surface-muted text-text-muted")}>{i + 1}</div><span className={cn("hidden sm:inline text-xs font-medium", i <= step ? "text-primary" : "text-text-muted")}>{label}</span></div>{i < STEPS.length - 1 && <div className={cn("flex-1 h-px mx-2 sm:mx-3", i < step ? "bg-primary" : "bg-border")} />}</div>)}</div></div>

    {step === 0 && <div className="container-shop">
      <h2 className="text-sm font-semibold text-primary mb-3">Delivery Address</h2>
      {loadingAddresses ? <div className="space-y-3 mb-6"><div className="skeleton h-24 rounded-[1.35rem]" /><div className="skeleton h-24 rounded-[1.35rem]" /></div> : addresses.length > 0 ? <div className="space-y-3 mb-5">{addresses.map((addr) => <button type="button" key={addr.id} onClick={() => setSelectedAddress(addr.id)} className={cn("w-full bg-surface rounded-[1.35rem] p-4 shadow-sm text-left border-2 transition-colors", selectedAddress === addr.id ? "border-primary" : "border-foreground/[.08]")}><div className="flex items-start gap-3"><div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0", selectedAddress === addr.id ? "border-primary" : "border-border")}>{selectedAddress === addr.id && <div className="w-2 h-2 rounded-full bg-primary" />}</div><div className="min-w-0"><p className="text-sm font-medium text-primary">{addr.name}</p><p className="text-xs text-secondary mt-0.5 break-words">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ""}</p><p className="text-xs text-secondary">{addr.city}, {addr.state} - {addr.pinCode}</p><p className="text-xs text-secondary mt-0.5">{addr.phone}</p></div></div></button>)}</div> : <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-6 shadow-sm mb-5 text-center"><MapPin size={24} className="text-secondary mx-auto mb-2" /><p className="text-sm text-secondary mb-3">No saved addresses. Add one to continue.</p><Link href="/account/addresses" className="inline-flex px-4 py-2.5 bg-primary text-white rounded-full text-xs font-medium">Add Address</Link></div>}
      <h2 className="text-sm font-semibold text-primary mb-3">Delivery Options</h2>
      <div className="space-y-2 mb-6">{deliveryOption === "standard" && (deliveryCharge === 0 ? <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">🎉 You qualify for FREE delivery!</div> : <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">Add {formatPrice(amountNeeded)} more to get FREE delivery. <Link href="/policies/shipping" className="underline text-xs">Details</Link></div>)}{[{ id: "standard", label: "Standard Delivery", desc: "3-5 Business Days", price: subtotal > freeThreshold ? "Free" : formatPrice(deliveryChargeRate) }, { id: "express", label: "Express Delivery", desc: "1-2 Business Days", price: "₹299" }].map((opt) => <button type="button" key={opt.id} onClick={() => setDeliveryOption(opt.id)} className={cn("w-full flex items-center justify-between p-3 rounded-[1.35rem] border transition-colors", deliveryOption === opt.id ? "border-primary bg-surface-muted" : "border-border bg-white")}><div className="flex items-center gap-3"><div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", deliveryOption === opt.id ? "border-primary" : "border-border")}>{deliveryOption === opt.id && <div className="w-2 h-2 rounded-full bg-primary" />}</div><div className="text-left"><p className="text-sm font-medium text-primary">{opt.label}</p><p className="text-xs text-secondary">{opt.desc}</p></div></div><span className="text-sm font-semibold text-primary">{opt.price}</span></button>)}</div>
      <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-6"><h3 className="text-sm font-semibold text-primary mb-3">Order Summary</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-secondary">Subtotal ({itemCount} items)</span><span className="font-medium">{formatPrice(subtotal)}</span></div>{safeDiscount > 0 && <div className="flex justify-between"><span className="text-secondary">Discount{couponCode ? ` (${couponCode})` : ""}</span><span className="font-medium text-success">−{formatPrice(safeDiscount)}</span></div>}<div className="flex justify-between"><span className="text-secondary">Delivery</span><span className="font-medium">{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</span></div><div className="border-t border-border pt-2 flex justify-between"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(total)}</span></div></div></div>
      <div className="h-20 lg:hidden" />
      <div className="sticky bottom-[120px] lg:static bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-border z-[60]"><button type="button" onClick={() => setStep(1)} disabled={!selectedAddress} className="w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">Review Order <ChevronRight size={16} /></button></div>
    </div>}

    {step === 1 && <div className="container-shop">
      <h2 className="text-sm font-semibold text-primary mb-4">Review Your Order</h2>
      <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-4"><h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Items ({itemCount})</h3><div className="space-y-3">{items.map((item) => <div key={item.id} className="flex gap-3"><div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-surface-muted">{item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-primary truncate">{item.name}</p>{item.variantName && <p className="text-[11px] text-secondary">{item.variantName}</p>}<div className="flex justify-between mt-1"><span className="text-xs text-secondary">Qty: {item.quantity}</span><span className="text-sm font-semibold text-primary">{formatPrice((item.salePrice != null && item.salePrice > 0 ? item.salePrice : item.price) * item.quantity)}</span></div></div></div>)}</div></div>
      <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-4"><div className="flex items-center justify-between mb-2"><h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Delivery Address</h3><button type="button" onClick={() => setStep(0)} className="text-xs text-accent font-medium">Change</button></div>{(() => { const addr = addresses.find((a) => a.id === selectedAddress); return addr ? <div><p className="text-sm font-medium text-primary">{addr.name}</p><p className="text-xs text-secondary mt-0.5">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ""}</p><p className="text-xs text-secondary">{addr.city}, {addr.state} - {addr.pinCode}</p><p className="text-xs text-secondary mt-0.5">{addr.phone}</p></div> : <p className="text-sm text-secondary">No address selected</p>; })()}</div>
      <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-4"><h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Delivery</h3><p className="text-sm text-primary">{deliveryOption === "express" ? "Express Delivery (1-2 days)" : "Standard Delivery (3-5 days)"}</p><p className="text-xs text-secondary mt-0.5">{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</p></div>
      <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-6"><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-secondary">Subtotal</span><span className="font-medium">{formatPrice(subtotal)}</span></div>{safeDiscount > 0 && <div className="flex justify-between"><span className="text-secondary">Discount</span><span className="font-medium text-success">−{formatPrice(safeDiscount)}</span></div>}<div className="flex justify-between"><span className="text-secondary">Delivery</span><span className="font-medium">{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</span></div><div className="border-t border-border pt-2 flex justify-between"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(total)}</span></div></div><p className="text-[10px] text-text-muted mt-3">By continuing, you agree to our <Link href="/policies/terms" className="underline">Terms</Link> and <Link href="/policies/shipping" className="underline">Shipping Policy</Link>.</p></div>
      <div className="h-20 lg:hidden" />
      <div className="sticky bottom-[120px] lg:static bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-border z-[60]"><button type="button" onClick={() => setStep(2)} className="w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold flex items-center justify-center gap-2">Proceed to Payment <ChevronRight size={16} /></button></div>
    </div>}

    {step === 2 && (
    <div className="container-shop">
      <h2 className="text-sm font-semibold text-primary mb-3">Payment Method</h2>
      <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-5 shadow-sm mb-5"><div className="flex items-center gap-2 mb-3"><Shield size={18} className="text-accent" /><h3 className="text-sm font-semibold text-primary">Pay securely with Razorpay</h3></div><p className="text-xs text-secondary mb-4">UPI, cards, net banking and supported wallets are available in the secure Razorpay checkout.</p><div className="rounded-[1.35rem] bg-surface-muted p-4"><div className="flex justify-between text-sm"><span className="text-secondary">Amount to pay</span><span className="font-bold text-primary">{formatPrice(total)}</span></div></div></div>

      <div className="flex items-center gap-2 text-xs text-secondary mb-6"><Shield size={14} /><span>Payment is verified securely on our server before the order is confirmed.</span></div>
      <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-6"><div className="flex justify-between text-sm"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(total)}</span></div></div>
      <div className="h-20 lg:hidden" />
      <div className="sticky bottom-[120px] lg:static bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-border z-[60]"><button type="button" onClick={handlePay} disabled={placingOrder || verifyingPayment} className="w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">{(placingOrder || verifyingPayment) && <Loader2 size={16} className="animate-spin" />}{verifyingPayment ? "Verifying Payment..." : placingOrder ? "Opening Secure Checkout..." : `Place Order — ${formatPrice(total)} (Payment Pending)`}</button>{orderResult && <p className="text-[10px] text-text-muted text-center mt-2">Order {orderResult.orderNumber} is saved. You can retry payment safely if the payment window is closed.</p>}</div>
    </div>)}

    {step === 3 && (
    <div className="container-shop py-12 text-center"><div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={34} className="text-success" /></div><h2 className="text-xl font-semibold text-primary mb-2">Thank You!</h2><p className="text-sm text-secondary mb-4">Your order has been confirmed.</p><div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm inline-block mb-4"><p className="text-xs text-secondary mb-1">Order Number</p><p className="text-lg font-bold text-primary">{orderResult?.orderNumber || "—"}</p></div><p className="text-xs text-secondary mb-8">You can track your order status in My Orders.</p><div className="max-w-md mx-auto mb-8"><GoogleReviewPrompt /></div><Link href="/shop" className="block w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold text-center">Continue Shopping</Link><Link href="/account/orders" className="block w-full py-3 text-sm font-medium text-secondary text-center mt-2">View My Orders</Link></div>)}
  </div>;
}
