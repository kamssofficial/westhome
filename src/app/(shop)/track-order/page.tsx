"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PackageSearch, Loader2, CheckCircle, Clock, Truck, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { formatPrice, cn } from "@/lib/utils";

interface TrackedItem { productName: string; variantName: string | null; quantity: number; totalPrice: number; image: string | null; }
interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  placedAt: string;
  estimatedDelivery?: string | null;
  trackingNumber?: string | null;
  customerName: string;
  items: TrackedItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  statusHistory: { status: string; note?: string | null; createdAt: string }[];
}

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  OUT_FOR_DELIVERY: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  REFUNDED: "bg-red-50 text-red-700 border-red-200",
  PAYMENT_FAILED: "bg-red-50 text-red-700 border-red-200",
  ON_HOLD: "bg-amber-50 text-amber-700 border-amber-200",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookup = async () => {
    if (loading) return;
    const num = orderNumber.trim().toUpperCase();
    const digits = phone.replace(/\D/g, "");
    if (!num || digits.length < 10) {
      toast.error("Enter your order number and the phone number you ordered with.");
      return;
    }
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(num)}&phone=${encodeURIComponent(digits)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.order) {
        setOrder(null);
        setNotFound(true);
        return;
      }
      setOrder(data.order);
    } catch {
      toast.error("Could not look up your order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-foreground/[.055] rounded-full text-sm text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/60";

  return (
    <div className="animate-fade-in container-shop py-10 md:py-14 max-w-2xl">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <PackageSearch size={26} className="text-secondary" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-primary mb-2">Track your order</h1>
        <p className="text-sm text-secondary">Enter the order number from your confirmation along with the phone number you ordered with.</p>
      </div>

      <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-5 shadow-sm mb-8 space-y-3">
        <input
          className={inputCls}
          placeholder="Order number (e.g. WH2600123)"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          autoComplete="off"
        />
        <input
          className={inputCls}
          placeholder="Phone number used at checkout"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
        <button
          type="button"
          onClick={lookup}
          disabled={loading}
          className="w-full py-3.5 bg-primary text-white rounded-full text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "Looking up…" : "Track Order"}
        </button>
      </div>

      {notFound && (
        <div className="bg-amber-50 border border-amber-200 rounded-[1.35rem] p-5 text-center mb-8">
          <p className="text-sm text-amber-800 mb-2">No order found for those details.</p>
          <p className="text-xs text-amber-700">Double-check the order number and phone number. Still stuck? <Link href="/contact" className="underline font-medium">Contact us</Link> and we&apos;ll help.</p>
        </div>
      )}

      {order && (
        <div className="space-y-4">
          <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-secondary">Order</p>
                <p className="text-lg font-bold text-primary">{order.orderNumber}</p>
                <p className="text-xs text-secondary mt-0.5">Placed {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", STATUS_STYLES[order.status] || "bg-surface-muted text-secondary border-border")}>
                {statusLabel(order.status)}
              </span>
            </div>
            {order.trackingNumber && (
              <p className="text-xs text-secondary">Tracking: <span className="font-medium text-primary">{order.trackingNumber}</span></p>
            )}
            <div className="border-t border-border mt-3 pt-3 space-y-1 text-xs text-secondary">
              <p>Payment: {order.paymentStatus === "COMPLETED" ? <span className="text-success font-medium">Paid</span> : <span className="font-medium text-primary">{statusLabel(order.paymentStatus)}</span>}</p>
              {order.estimatedDelivery && <p className="flex items-center gap-1"><Clock size={12} /> Estimated delivery {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
            </div>
          </div>

          <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Items</h2>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-surface-muted">
                    {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="48px" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{item.productName}</p>
                    {item.variantName && <p className="text-[11px] text-secondary">{item.variantName}</p>}
                    <p className="text-xs text-secondary">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">{formatPrice(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-secondary">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between"><span className="text-secondary">Discount</span><span className="text-success">−{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-secondary">Delivery</span><span>{order.deliveryCharge === 0 ? "Free" : formatPrice(order.deliveryCharge)}</span></div>
              <div className="flex justify-between pt-1 border-t border-border"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(order.total)}</span></div>
            </div>
          </div>

          {order.statusHistory.length > 0 && (
            <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-5 shadow-sm">
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Status Updates</h2>
              <ol className="space-y-3">
                {order.statusHistory.map((h, idx) => (
                  <li key={idx} className="flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      {h.status === "DELIVERED" ? <CheckCircle size={16} className="text-success" /> : h.status === "SHIPPED" || h.status === "OUT_FOR_DELIVERY" ? <Truck size={16} className="text-accent" /> : h.status === "CANCELLED" || h.status === "REFUNDED" ? <XCircle size={16} className="text-error" /> : <Clock size={16} className="text-secondary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">{statusLabel(h.status)}</p>
                      {h.note && <p className="text-xs text-secondary">{h.note}</p>}
                      <p className="text-[11px] text-text-muted">{new Date(h.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="text-xs text-secondary text-center pt-2">Questions about this order? <Link href="/contact" className="text-accent underline">Contact us</Link> with your order number.</p>
        </div>
      )}
    </div>
  );
}
