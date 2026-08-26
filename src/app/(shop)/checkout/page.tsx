"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Smartphone, Shield, MapPin, QrCode } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { UPI_ID, UPI_PAYEE_NAME, generateUpiIntent, isMobileDevice } from "@/lib/utils";
import { formatPrice, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const STEPS = ["Address", "Payment", "Confirm"];

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI Payment", icon: <Smartphone size={18} />, badge: "UPI" },
  ];


interface Address {
  id: string; name: string; phone: string;
  addressLine1: string; addressLine2?: string;
  city: string; state: string; pinCode: string;
}

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
    const [deliveryOption, setDeliveryOption] = useState("standard");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; id: string } | null>(null);
  const [showQrFallback, setShowQrFallback] = useState(false);
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
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        if (d.settings) {
          // Prefer deliveryConfig (nested) over flat keys for consistency
          const dc = d.settings.deliveryConfig;
          if (dc) {
            setFreeThreshold(Number(dc.freeDeliveryThreshold) || 2000);
            setDeliveryChargeRate(Number(dc.defaultDeliveryCharge) || 149);
          } else {
            if (d.settings.freeDeliveryThreshold) setFreeThreshold(Number(d.settings.freeDeliveryThreshold));
            if (d.settings.defaultDeliveryCharge) setDeliveryChargeRate(Number(d.settings.defaultDeliveryCharge));
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((data) => {
        const addrs = data.addresses || [];
        setAddresses(addrs);
        if (addrs.length > 0) setSelectedAddress(addrs[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => {});
  }, []);

  
  const handlePlaceOrder = async () => {
    if (placingOrder) return; // Prevent double-click
    setPlacingOrder(true);
    try {
      const addr = addresses.find((a) => a.id === selectedAddress);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: addr?.name || "",
          customerEmail: userEmail,
          customerPhone: addr?.phone || "",
          addressLine1: addr?.addressLine1 || "",
          addressLine2: addr?.addressLine2 || "",
          city: addr?.city || "",
          state: addr?.state || "",
          pinCode: addr?.pinCode || "",
          country: "India",
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            productName: item.name,
            variantName: item.variantName || null,
            quantity: item.quantity,
            unitPrice: item.price,
            salePrice: item.salePrice || null,
            totalPrice: (item.salePrice || item.price) * item.quantity,
            image: item.image || null,
          })),
          subtotal,
          discount: 0,
          deliveryCharge,
          tax: 0,
          total,
          paymentMethod: "upi",
          deliveryMethod: deliveryOption === "express" ? "express" : "delivery",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrderResult({ orderNumber: data.order.orderNumber, id: data.order.id });
        clearCart();
        
        // Redirect to UPI app if UPI payment selected
        if (isMobileDevice()) {
          const upiUrl = generateUpiIntent(UPI_ID, total, "Order " + data.order.orderNumber, UPI_PAYEE_NAME);
          window.location.href = upiUrl;
        } else {
          setStep(2);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to place order. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!mounted) {
    return (
      <div className="animate-fade-in">
        <div className="container-shop pt-3 pb-2 flex items-center gap-3">
          <Link href="/cart" className="p-1 hover:bg-surface-muted rounded-lg transition-colors"><ArrowLeft size={20} /></Link>
          <div className="flex-1 text-center"><p className="text-sm font-semibold text-primary">Checkout</p></div>
          <div className="w-7" />
        </div>
        <div className="container-shop py-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-surface-muted rounded-[1.35rem]" />
            <div className="h-20 bg-surface-muted rounded-[1.35rem]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="container-shop pt-3 pb-2 flex items-center gap-3">
        <Link href="/cart" className="p-1 hover:bg-surface-muted rounded-lg transition-colors"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-semibold text-primary">Checkout</h1>
      </div>
      <div className="container-shop pb-32 lg:pb-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", i <= step ? "bg-primary text-white" : "bg-surface-muted text-text-muted")}>{i + 1}</div>
                <span className={cn("text-xs font-medium", i <= step ? "text-primary" : "text-text-muted")}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("flex-1 h-px mx-3", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="container-shop">
          <h2 className="text-sm font-semibold text-primary mb-3">Delivery Address</h2>
          {loadingAddresses ? (
            <div className="space-y-3 mb-4"><div className="skeleton h-20 rounded-[1.35rem]" /></div>
          ) : addresses.length > 0 ? (
            <div className="space-y-3 mb-4">
              {addresses.map((addr) => (
                <button key={addr.id} onClick={() => setSelectedAddress(addr.id)} className={cn("w-full bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm text-left border-2 transition-colors", selectedAddress === addr.id ? "border-primary" : "border-transparent")}>
                  <div className="flex items-start gap-3">
                    <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0", selectedAddress === addr.id ? "border-primary" : "border-border")}>
                      {selectedAddress === addr.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">{addr.name}</p>
                      <p className="text-xs text-secondary mt-0.5">{addr.addressLine1}{addr.addressLine2 ? ", " + addr.addressLine2 : ""}</p>
                      <p className="text-xs text-secondary">{addr.city}, {addr.state} - {addr.pinCode}</p>
                      <p className="text-xs text-secondary mt-0.5">{addr.phone}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-6 shadow-sm mb-4 text-center">
              <MapPin size={24} className="text-secondary mx-auto mb-2" />
              <p className="text-sm text-secondary mb-3">No saved addresses. Add a delivery address to continue.</p>
              <Link href="/account/addresses" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-[1.35rem] text-xs font-medium">Add Address</Link>
            </div>
          )}
          <h2 className="text-sm font-semibold text-primary mb-3">Delivery Options</h2>
          <div className="space-y-2 mb-6">
            {/* Free Delivery Banner */}
            {deliveryOption === "standard" && (
              deliveryCharge === 0 ? (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                  🎉 You qualify for FREE delivery!
                </div>
              ) : (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  Add {formatPrice(amountNeeded)} more to get FREE delivery.
                </div>
              )
            )}

            {[{ id: "standard", label: "Standard Delivery", desc: "3-5 Business Days", free: true }, { id: "express", label: "Express Delivery", desc: "1-2 Business Days", free: false }].map((opt) => (
              <button key={opt.id} onClick={() => setDeliveryOption(opt.id)} className={cn("w-full flex items-center justify-between p-3 rounded-[1.35rem] border transition-colors", deliveryOption === opt.id ? "border-primary bg-surface-muted" : "border-border bg-white")}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", deliveryOption === opt.id ? "border-primary" : "border-border")}>{deliveryOption === opt.id && <div className="w-2 h-2 rounded-full bg-primary" />}</div>
                  <div className="text-left"><p className="text-sm font-medium text-primary">{opt.label}</p><p className="text-xs text-secondary">{opt.desc}</p></div>
                </div>
                <span className="text-sm font-semibold text-primary">{(opt.free && subtotal > freeThreshold) ? "Free" : opt.free ? formatPrice(deliveryChargeRate) : "₹299"}</span>
              </button>
            ))}
          </div>
          <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-primary mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-secondary">Subtotal ({items.length} items)</span><span className="font-medium">{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-secondary">Delivery</span><span className="font-medium">{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</span></div>
              <div className="border-t border-border pt-2 flex justify-between"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(total)}</span></div>
            </div>
          </div>
          <div className="sticky bottom-[120px] lg:static lg:mt-0 bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-border z-[60]">
            <button onClick={() => setStep(1)} disabled={!selectedAddress} className="w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-40">Continue to Payment <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="container-shop">
          <h2 className="text-sm font-semibold text-primary mb-3">Payment</h2>
          <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-5 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone size={18} className="text-[#5F259F]" />
              <h3 className="text-sm font-semibold text-primary">UPI Payment</h3>
            </div>
            <p className="text-xs text-secondary mb-3">Pay securely using any UPI app (Google Pay, PhonePe, Paytm, etc.)</p>
            <div className="bg-surface-muted rounded-[1.35rem] p-4 text-center">
              <p className="text-lg font-bold text-primary mb-1">{formatPrice(total)}</p>
              <p className="text-xs text-secondary">Amount to be paid via UPI</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary mb-6"><Shield size={14} /><span>Your payment is safe and secure.</span></div>
          <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mb-6"><div className="flex justify-between text-sm"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(total)}</span></div></div>
          <div className="sticky bottom-[120px] lg:static lg:mt-0 bg-white/95 backdrop-blur-sm py-3 -mx-4 px-4 border-t border-border z-[60]">
            <button onClick={handlePlaceOrder} disabled={placingOrder} className="w-full py-3.5 bg-[#5F259F] text-white rounded-full text-sm font-semibold hover:bg-[#4A1D7F] transition-colors disabled:opacity-50">
              {placingOrder ? "Placing Order..." : "Pay with UPI — " + formatPrice(total)}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="container-shop py-12 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
          <h2 className="text-xl font-semibold text-primary mb-2">Order Placed!</h2>
          <p className="text-sm text-secondary mb-4">Complete your UPI payment to confirm the order.</p>
          <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm inline-block mb-4">
            <p className="text-xs text-secondary mb-1">Order Number</p>
            <p className="text-lg font-bold text-primary">{orderResult?.orderNumber || "—"}</p>
          </div>
          <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-5 shadow-sm mb-4 max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3"><QrCode size={18} className="text-[#5F259F]" /><p className="text-sm font-semibold text-primary">Scan to Pay</p></div>
            <div className="bg-white rounded-xl p-3 mb-3"><img src="/upi-qr.png" alt="UPI QR Code" className="w-48 h-48 mx-auto object-contain" /></div>
            <p className="text-xs text-secondary mb-2">UPI ID: <span className="font-mono font-semibold text-primary">{UPI_ID}</span></p>
            <p className="text-xs font-semibold text-primary">Amount: {formatPrice(total)}</p>
            <p className="text-xs text-secondary mt-2">Scan with any UPI app to pay</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-[1.35rem] p-4 mb-4 max-w-sm mx-auto">
            <p className="text-xs font-semibold text-amber-700 mb-1">Payment Pending Verification</p>
            <p className="text-xs text-amber-600">Your order will be confirmed once we verify the UPI payment.</p>
          </div>
          <p className="text-xs text-secondary mb-8">Track your order status in My Orders.</p>
          <Link href="/shop" className="block w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold text-center hover:bg-primary-hover transition-colors">Continue Shopping</Link>
          <Link href="/account/orders" className="block w-full py-3 text-sm font-medium text-secondary text-center mt-2 hover:text-primary transition-colors">View My Orders</Link>
        </div>
      )}
    </div>
  );
}