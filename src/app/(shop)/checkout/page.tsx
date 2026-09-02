"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronRight, CreditCard, Smartphone, Shield, MapPin, Copy, CheckCircle } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const STEPS = ["Address", "Review", "Payment"];
const UPI_ID = "bmdistributorsindia-1@okicici";
const UPI_NAME = "BM DISTRIBUTORS";

interface Address {
  id: string; name: string; phone: string;
  addressLine1: string; addressLine2?: string;
  city: string; state: string; pinCode: string;
}

interface OrderResponse { order: { id: string; orderNumber: string } }
interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string; description: string;
  order_id: string; prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance { open: () => void }
interface RazorpayConstructor { new (options: RazorpayOptions): RazorpayInstance }
declare global { interface Window { Razorpay?: RazorpayConstructor } }

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; id: string } | null>(null);
  const [upiCopied, setUpiCopied] = useState(false);
  const [paymentAcknowledged, setPaymentAcknowledged] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [freeThreshold, setFreeThreshold] = useState(2000);
  const [deliveryChargeRate, setDeliveryChargeRate] = useState(149);
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = mounted ? getSubtotal() : 0;
  const deliveryCharge = deliveryOption === "express" ? 299 : (subtotal > freeThreshold ? 0 : deliveryChargeRate);
  const amountNeeded = Math.max(0, freeThreshold - subtotal + 1);
  const total = subtotal + deliveryCharge;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings) {
        if (d.settings.freeDeliveryThreshold) setFreeThreshold(Number(d.settings.freeDeliveryThreshold));
        if (d.settings.defaultDeliveryCharge) setDeliveryChargeRate(Number(d.settings.defaultDeliveryCharge));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/addresses").then(r => r.json()).then((data) => {
      const addrs = data.addresses || [];
      setAddresses(addrs);
      if (addrs.length > 0) setSelectedAddress(addrs[0].id);
    }).catch(() => {}).finally(() => setLoadingAddresses(false));
    fetch("/api/auth/session").then(r => r.json()).then(data => {
      if (data?.user?.email) setUserEmail(data.user.email);
    }).catch(() => {});
  }, []);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setUpiCopied(true); toast.success("UPI ID copied!"); setTimeout(() => setUpiCopied(false), 3000);
    }).catch(() => toast.error("Failed to copy"));
  };

  const loadRazorpay = () => new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const createPendingOrder = async (): Promise<OrderResponse["order"] | null> => {
    const addr = addresses.find((a) => a.id === selectedAddress);
    if (!addr) { toast.error("Select a delivery address before paying."); return null; }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: addr.name,
        customerEmail: userEmail,
        customerPhone: addr.phone,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 || "",
        city: addr.city,
        state: addr.state,
        pinCode: addr.pinCode,
        country: "India",
        items: items.map((item) => ({
          productId: item.productId, variantId: item.variantId || null, productName: item.name,
          variantName: item.variantName || null, quantity: item.quantity, unitPrice: item.price,
          salePrice: item.salePrice || null, totalPrice: (item.salePrice || item.price) * item.quantity, image: item.image || null,
        })),
        subtotal, discount: 0, deliveryCharge, tax: 0, total,
        paymentMethod: "razorpay", deliveryMethod: deliveryOption === "express" ? "express" : "delivery",
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create order");
    }
    const data = await res.json() as OrderResponse;
    return data.order;
  };

  const startRazorpayPayment = async () => {
    if (placingOrder || !selectedAddress || items.length === 0) return;
    setPlacingOrder(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Razorpay checkout could not be loaded. Check your internet connection.");

      const order = await createPendingOrder();
      if (!order) return;

      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, orderId: order.id }),
      });
      const razorpayOrder = await orderRes.json();
      if (!orderRes.ok) throw new Error(razorpayOrder.error || "Unable to start Razorpay payment");

      if (!window.Razorpay) throw new Error("Razorpay is not available");
      const rzp = new window.Razorpay({
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Westhome",
        description: `Order ${order.orderNumber}`,
        order_id: razorpayOrder.id,
        prefill: {
          name: addresses.find(a => a.id === selectedAddress)?.name,
          email: userEmail,
          contact: addresses.find(a => a.id === selectedAddress)?.phone,
        },
        theme: { color: "#111111" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId: order.id,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified) throw new Error(verifyData.error || "Payment verification failed");
            setOrderResult({ orderNumber: order.orderNumber, id: order.id });
            clearCart();
            setStep(3);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Payment verification failed");
          } finally { setPlacingOrder(false); }
        },
        modal: { ondismiss: () => setPlacingOrder(false) },
      });
      rzp.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start payment");
      setPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (paymentMethod === "razorpay") return startRazorpayPayment();
    if (placingOrder || !selectedAddress || items.length === 0) return;
    if (!paymentAcknowledged) { toast.error("Confirm that you have transferred the UPI amount before placing the order."); return; }
    setPlacingOrder(true);
    try {
      const order = await createPendingOrder();
      if (!order) return;
      setOrderResult({ orderNumber: order.orderNumber, id: order.id });
      clearCart();
      setStep(3);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to place order"); }
    finally { setPlacingOrder(false); }
  };

  if (!mounted) return <div className="animate-fade-in"><div className="container-shop py-12 text-center"><div className="animate-pulse space-y-4"><div className="h-32 bg-surface-muted rounded-[1.35rem]" /><div className="h-20 bg-surface-muted rounded-[1.35rem]" /></div></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="container-shop pt-3 pb-2 flex items-center gap-3">
        <Link href="/cart" aria-label="Back to cart" className="p-1 hover:bg-surface-muted rounded-lg transition-colors"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-semibold text-primary">Checkout</h1>
      </div>
      <div className="container-shop pb-32 lg:pb-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => <div key={s} className="flex items-center flex-1"><div className="flex items-center gap-2"><div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", i <= step ? "bg-primary text-white" : "bg-surface-muted text-text-muted")}>{i + 1}</div><span className={cn("text-xs font-medium", i <= step ? "text-primary" : "text-text-muted")}>{s}</span></div>{i < STEPS.length - 1 && <div className={cn("flex-1 h-px mx-3", i < step ? "bg-primary" : "bg-border")} />}</div>)}
        </div>
      </div>

      {step === 0 && <div className="container-shop">
        <h2 className="text-sm font-semibold text-primary mb-3">Delivery Address</h2>
        {loadingAddresses ? <div className="space-y-3 mb-4"><div className="skeleton h-20 rounded-[1.35rem]" /></div> : addresses.length > 0 ? <div className="space-y-3 mb-4">{addresses.map(addr => <button type="button" key={addr.id} onClick={() => setSelectedAddress(addr.id)} className={cn("w-full bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm text-left border-2 transition-colors", selectedAddress === addr.id ? "border-primary" : "border-transparent")}><div className="flex items-start gap-3"><div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0", selectedAddress === addr.id ? "border-primary" : "border-border")}>{selectedAddress === addr.id && <div className="w-2 h-2 rounded-full bg-primary" />}</div><div><p className="text-sm font-medium text-primary">{addr.name}</p><p className="text-xs text-secondary mt-0.5">{addr.addressLine1}{addr.addressLine2 ? ", " + addr.addressLine2 : ""}</p><p className="text-xs text-secondary">{addr.city}, {addr.state} - {addr.pinCode}</p><p className="text-xs text-secondary mt-0.5">{addr.phone}</p></div></div></button>)}</div> : <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-6 shadow-sm mb-4 text-center"><MapPin size={24} className="text-secondary mx-auto mb-2" /><p className="text-sm text-secondary mb-3">No saved addresses. Add a delivery address to continue.</p><Link href="/account/addresses" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-[1.35rem] text-xs font-medium">Add Address</Link></div>}
        <h2 className="text-sm font-semibold text-primary mb-3">Delivery Options</h2>
        <div className="space-y-2 mb-6">
          {deliveryOption === "standard" && (deliveryCharge === 0 ? <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">🎉 You qualify for FREE delivery!</div> : <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">Add {formatPrice(amountNeeded)} more to get FREE delivery. <Link href="/policies/shipping" className="underline text-xs">Details</Link></div>)}
          {[{ id: "standard", label: "Standard Delivery", desc: "3-5 Business Days", free: true }, { id: "express", label: "Express Delivery", desc: "1-2 Business Days", free: false }].map(opt => <button type="button" key={opt.id} onClick={() => setDeliveryOption(opt.id)} className={cn("w-full flex items-center justify-between p-3 rounded-[1.35rem] border transition-colors", deliveryOption === opt.id ? "border-primary bg-surface-muted" : "border-border bg-white")}><div className="flex items-center gap-3"><div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", deliveryOption === opt.id ? "border-primary" : "border-border")}>{deliveryOption === opt.id && <div className="w-2 h-2 rounded-full bg-primary" />}</div><div className="text-left"><p className="text-sm font-medium text-primary">{opt.label}</p><p className="text-xs text-secondary">{opt.desc}</p></div></div><span className="text-sm font-semibold text-primary">{(opt.free && subtotal > freeThreshold) ? "Free" : opt.free ? formatPrice(deliveryChargeRate) : "₹299"}</span></button>)}
        </div>
        <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-6"><h3 className="text-sm font-semibold text-primary mb-3">Order Summary</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-secondary">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span><span className="font-medium">{formatPrice(subtotal)}</span></div><div className="flex justify-between"><span className="text-secondary">Delivery</span><span className="font-medium">{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</span></div><div className="border-t border-border pt-2 flex justify-between"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(total)}</span></div></div></div>
        <div className="sticky bottom-[120px] lg:static lg:mt-0 bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-border z-[60]"><button type="button" onClick={() => setStep(1)} disabled={!selectedAddress} className="w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-40">Review Order <ChevronRight size={16} /></button></div>
      </div>}

      {step === 1 && <div className="container-shop">
        <h2 className="text-sm font-semibold text-primary mb-4">Review Your Order</h2>
        <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-4"><h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Items ({items.reduce((s, i) => s + i.quantity, 0)})</h3><div className="space-y-3">{items.map(item => <div key={item.id} className="flex gap-3"><div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-surface-muted">{item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-primary truncate">{item.name}</p>{item.variantName && <p className="text-[11px] text-secondary">{item.variantName}</p>}<div className="flex justify-between mt-1"><span className="text-xs text-secondary">Qty: {item.quantity}</span><span className="text-sm font-semibold text-primary">{formatPrice((item.salePrice || item.price) * item.quantity)}</span></div></div></div>)}</div></div>
        <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-4"><div className="flex items-center justify-between mb-2"><h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Delivery Address</h3><button type="button" onClick={() => setStep(0)} className="text-xs text-accent font-medium">Change</button></div>{(() => { const addr = addresses.find(a => a.id === selectedAddress); return addr ? <div><p className="text-sm font-medium text-primary">{addr.name}</p><p className="text-xs text-secondary mt-0.5">{addr.addressLine1}{addr.addressLine2 ? ", " + addr.addressLine2 : ""}</p><p className="text-xs text-secondary">{addr.city}, {addr.state} - {addr.pinCode}</p><p className="text-xs text-secondary mt-0.5">{addr.phone}</p></div> : <p className="text-sm text-secondary">No address selected</p>; })()}</div>
        <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-4"><h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Delivery</h3><p className="text-sm text-primary">{deliveryOption === "express" ? "Express Delivery (1-2 days)" : "Standard Delivery (3-5 days)"}</p><p className="text-xs text-secondary mt-0.5">{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</p></div>
        <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-6"><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-secondary">Subtotal</span><span className="font-medium">{formatPrice(subtotal)}</span></div><div className="flex justify-between"><span className="text-secondary">Delivery</span><span className="font-medium">{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</span></div><div className="border-t border-border pt-2 flex justify-between"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(total)}</span></div></div><p className="text-[10px] text-text-muted mt-1">By placing this order, you agree to our <Link href="/policies/terms" className="underline">Terms</Link> and <Link href="/policies/shipping" className="underline">Shipping Policy</Link>.</p></div>
        <div className="sticky bottom-[120px] lg:static lg:mt-0 bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-border z-[60]"><button type="button" onClick={() => setStep(2)} className="w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2">Proceed to Payment <ChevronRight size={16} /></button></div>
      </div>}

      {step === 2 && <div className="container-shop">
        <h2 className="text-sm font-semibold text-primary mb-3">Payment Method</h2>
        <div className="space-y-2 mb-6">
          <button type="button" onClick={() => setPaymentMethod("razorpay")} className={cn("w-full flex items-center justify-between p-4 rounded-[1.35rem] border transition-colors", paymentMethod === "razorpay" ? "border-primary bg-surface-muted" : "border-border bg-white")}><div className="flex items-center gap-3"><div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", paymentMethod === "razorpay" ? "border-primary" : "border-border")}>{paymentMethod === "razorpay" && <div className="w-2 h-2 rounded-full bg-primary" />}</div><div className="flex items-center gap-2"><CreditCard size={18} /><div className="text-left"><span className="text-sm font-medium text-primary block">Razorpay</span><span className="text-[11px] text-secondary">UPI, Cards, Netbanking & Wallets</span></div></div></div><span className="text-[10px] font-bold text-white bg-primary px-2 py-1 rounded">SECURE</span></button>
          <button type="button" onClick={() => setPaymentMethod("upi")} className={cn("w-full flex items-center justify-between p-4 rounded-[1.35rem] border transition-colors", paymentMethod === "upi" ? "border-primary bg-surface-muted" : "border-border bg-white")}><div className="flex items-center gap-3"><div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", paymentMethod === "upi" ? "border-primary" : "border-border")}>{paymentMethod === "upi" && <div className="w-2 h-2 rounded-full bg-primary" />}</div><div><span className="text-sm font-medium text-primary block">Direct UPI Transfer</span><span className="text-[11px] text-secondary">Manual payment verification</span></div></div><Smartphone size={18} /></button>
        </div>

        {paymentMethod === "upi" ? <>
          <div className="bg-surface rounded-[1.35rem] border border-accent/20 p-5 shadow-sm mb-6"><div className="flex items-center gap-2 mb-3"><Smartphone size={18} className="text-accent" /><h3 className="text-sm font-semibold text-primary">UPI Payment</h3></div><p className="text-xs text-secondary mb-3">Send the exact amount to the UPI ID below using any UPI app.</p><div className="bg-surface-muted rounded-[1.35rem] p-4 flex items-center justify-between"><div><p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">UPI ID</p><p className="text-base font-semibold text-primary font-mono">{UPI_ID}</p></div><button type="button" aria-label="Copy UPI ID" onClick={handleCopyUPI} className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg border border-border text-xs font-medium">{upiCopied ? <><CheckCircle size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button></div><p className="text-xs text-secondary mt-3">After transferring, place the order. Payment remains pending until verified.</p></div>
          <label className="flex items-start gap-2 text-xs text-secondary mb-6"><input type="checkbox" checked={paymentAcknowledged} onChange={e => setPaymentAcknowledged(e.target.checked)} className="mt-0.5 accent-accent" /><span>I have transferred the exact amount to the UPI ID above.</span></label>
        </> : <div className="bg-primary/5 rounded-[1.35rem] border border-primary/10 p-5 mb-6"><div className="flex items-center gap-2 mb-2"><Shield size={18} /><h3 className="text-sm font-semibold text-primary">Secure Razorpay Checkout</h3></div><p className="text-xs text-secondary">Complete payment securely in the Razorpay window using UPI, cards, netbanking or supported wallets. Your order is confirmed only after server-side signature verification.</p></div>}
        <div className="flex items-center gap-2 text-xs text-secondary mb-6"><Shield size={14} /><span>Your payment is safe and secure.</span></div>
        <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-6"><div className="flex justify-between text-sm"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(total)}</span></div></div>
        <div className="sticky bottom-[120px] lg:static lg:mt-0 bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-border z-[60]"><button type="button" onClick={handlePlaceOrder} disabled={placingOrder || (paymentMethod === "upi" && !paymentAcknowledged)} className="w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50">{placingOrder ? (paymentMethod === "razorpay" ? "Opening secure checkout..." : "Placing Order...") : paymentMethod === "razorpay" ? `Pay ${formatPrice(total)} with Razorpay` : `Place Order — ${formatPrice(total)} (Payment Pending)`}</button></div>
      </div>}

      {step === 3 && <div className="container-shop py-12 text-center"><div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div><h2 className="text-xl font-semibold text-primary mb-2">Thank You!</h2><p className="text-sm text-secondary mb-4">Your order has been placed successfully.</p><div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm inline-block mb-4"><p className="text-xs text-secondary mb-1">Order Number</p><p className="text-lg font-bold text-primary">{orderResult?.orderNumber || "—"}</p></div><div className="bg-success/10 rounded-[1.35rem] p-4 mb-4 max-w-sm mx-auto"><p className="text-xs font-semibold text-primary mb-1">Payment confirmed via Razorpay</p><p className="text-xs text-secondary">Your payment has been verified successfully.</p></div><p className="text-xs text-secondary mb-8">You can track your order status in My Orders.</p><Link href="/shop" className="block w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold text-center">Continue Shopping</Link><Link href="/account/orders" className="block w-full py-3 text-sm font-medium text-secondary text-center mt-2">View My Orders</Link></div>}
    </div>
  );
}