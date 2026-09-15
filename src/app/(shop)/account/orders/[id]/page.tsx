"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, CheckCircle, Clock, XCircle, ExternalLink, RefreshCw, ShoppingBag } from "lucide-react";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import toast from "react-hot-toast";

interface OrderItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string | null;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pinCode: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  paymentStatus: string;
  paymentMethod: string | null;
  deliveryMethod: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingCarrier: string | null;
  items: OrderItem[];
  createdAt: string;
  statusHistory: { status: string; note: string | null; createdAt: string }[];
}

const STATUS_STEPS = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => setOrder(data.order))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleReorder = async () => {
    if (!order || order.items.length === 0) return;
    setReordering(true);
    try {
      const productIds = order.items.map((item) => item.productId);
      const res = await fetch("/api/products?lite=true&ids=" + productIds.join(","));
      const data = await res.json();
      const products = data.products || [];
      let addedCount = 0;
      let skippedCount = 0;
      for (const item of order.items) {
        const product = products.find((p: any) => p.id === item.productId);
        if (!product) continue;
        // Stock 0 is never re-orderable.
        if ((product.stockQuantity ?? 0) <= 0) { skippedCount++; continue; }
        const price = product.salePrice != null && product.salePrice > 0 ? product.salePrice : product.regularPrice;
        const image = product.images && product.images[0] ? product.images[0].url : item.image;
        addItem({
          id: item.productId + "-" + (item.variantId || "default") + "-" + Date.now(),
          productId: item.productId,
          variantId: item.variantId || undefined,
          name: product.name,
          variantName: item.variantName || undefined,
          price: Number(price),
          salePrice: product.salePrice ? Number(product.salePrice) : undefined,
          quantity: Math.min(item.quantity, product.stockQuantity),
          image: image || undefined,
          maxStock: product.stockQuantity,
        });
        addedCount++;
      }
      if (skippedCount > 0) toast.error(skippedCount + " item" + (skippedCount > 1 ? "s" : "") + " skipped — out of stock");
      if (addedCount > 0) {
        toast.success("Added " + addedCount + " item" + (addedCount > 1 ? "s" : "") + " to cart");
        router.push("/cart");
      } else if (skippedCount === 0) {
        toast.error("Could not add items - products may no longer be available");
      }
    } catch {
      toast.error("Failed to reorder. Please try again.");
    } finally {
      setReordering(false);
    }
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/orders/" + order!.id, {
        method: "DELETE",
      });
      if (res.ok) {
        setOrder((prev) => prev ? { ...prev, status: "CANCELLED" } : null);
        setShowCancelConfirm(false);
        toast.success("Order cancelled successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel order");
      }
    } catch {
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="container-shop py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-surface-muted rounded" />
          <div className="h-48 bg-surface-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-shop py-20 text-center">
        <h1 className="text-xl font-semibold mb-2">Order not found</h1>
        <Link href="/account/orders" className="text-accent hover:underline text-sm">Back to Orders</Link>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const canCancel = ["NEW", "CONFIRMED"].includes(order.status);

  return (
    <div className="container-shop py-4 md:py-8 animate-fade-in">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      {/* Order header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-serif">Order {order.orderNumber}</h1>
          <p className="text-sm text-text-muted mt-0.5">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(order.status))}>
            {order.status.replace(/_/g, " ")}
          </span>
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium",
            order.paymentStatus === "COMPLETED" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          )}>
            Payment: {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Status timeline */}
      <div className="bg-white rounded-xl border border-border p-4 md:p-5 mb-6">
        <h2 className="text-sm font-semibold mb-4">Order Status</h2>
        <div className="flex items-center justify-between overflow-x-auto scrollbar-hide pb-2">
          {STATUS_STEPS.map((step, i) => {
            const isCompleted = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            return (
              <div key={step} className="flex flex-col items-center flex-1 min-w-[60px]">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mb-1.5",
                  isCompleted ? "bg-success text-white" : "bg-surface-muted text-text-muted"
                )}>
                  {isCompleted ? <CheckCircle size={16} /> : <Clock size={16} />}
                </div>
                <span className={cn("text-[10px] text-center whitespace-nowrap",
                  isCurrent ? "font-semibold text-foreground" : isCompleted ? "text-success" : "text-text-muted"
                )}>
                  {step.replace(/_/g, " ")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {order.trackingNumber && (
        <div className="bg-white rounded-xl border border-border p-4 md:p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3">Tracking</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-text-secondary">
                {order.shippingCarrier && <span className="font-medium">{order.shippingCarrier} - </span>}
                {order.trackingNumber}
              </p>
            </div>
            {order.trackingUrl ? (
              <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors">
                Track <ExternalLink size={12} />
              </a>
            ) : (
              <button onClick={() => { navigator.clipboard.writeText(order.trackingNumber || ""); toast.success("Tracking number copied"); }} className="px-3 py-1.5 text-xs font-medium text-secondary border border-border rounded-lg hover:bg-surface-muted transition-colors">
                Copy
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-border p-4 md:p-5">
            <h2 className="text-sm font-semibold mb-4">Items</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 bg-surface-muted/50 rounded-lg">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-muted flex-shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.productName} width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={18} className="text-text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    {item.variantName && <p className="text-xs text-text-muted">{item.variantName}</p>}
                    <p className="text-xs text-text-muted">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">{formatPrice(item.totalPrice)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1 space-y-4">
          <button onClick={handleReorder} disabled={reordering} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition-colors">
            {reordering ? <RefreshCw size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
            {reordering ? "Adding to cart..." : "Reorder All Items"}
          </button>

          {canCancel && !showCancelConfirm && (
            <button onClick={() => setShowCancelConfirm(true)} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-error border border-error/30 hover:bg-error/5 rounded-xl transition-colors">
              <XCircle size={16} /> Cancel Order
            </button>
          )}
          {showCancelConfirm && (
            <div className="bg-error/5 border border-error/20 rounded-xl p-4">
              <p className="text-sm font-medium text-error mb-3">Are you sure you want to cancel this order?</p>
              <div className="flex gap-2">
                <button onClick={handleCancelOrder} disabled={cancelling} className="flex-1 py-2 text-xs font-medium text-white bg-error hover:bg-error/90 disabled:opacity-50 rounded-lg transition-colors">
                  {cancelling ? "Cancelling..." : "Yes, Cancel"}
                </button>
                <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2 text-xs font-medium text-secondary border border-border hover:bg-surface-muted rounded-lg transition-colors">
                  Keep Order
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-border p-4 md:p-5">
            <h2 className="text-sm font-semibold mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-text-secondary">Delivery</span><span>{order.deliveryCharge > 0 ? formatPrice(order.deliveryCharge) : "FREE"}</span></div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-4 md:p-5">
            <h2 className="text-sm font-semibold mb-3">Shipping Address</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {order.customerName}<br />
              {order.addressLine1}<br />
              {order.addressLine2 && <>{order.addressLine2}<br /></>}
              {order.city}, {order.state} - {order.pinCode}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-border p-4 md:p-5">
            <h2 className="text-sm font-semibold mb-3">Payment</h2>
            <div className="space-y-1 text-sm text-text-secondary">
              <p>Method: {order.paymentMethod || "Razorpay"}</p>
              <p>Status: <span className={cn(order.paymentStatus === "COMPLETED" ? "text-success" : "text-warning")}>{order.paymentStatus}</span></p>
            </div>
          </div>

          {order.statusHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-4 md:p-5">
              <h2 className="text-sm font-semibold mb-3">Order Timeline</h2>
              <div className="space-y-3">
                {order.statusHistory.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5", i === 0 ? "bg-success" : "bg-surface-muted")} />
                      {i < order.statusHistory.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-xs font-medium">{entry.status.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-text-muted">{formatDate(entry.createdAt)}</p>
                      {entry.note && <p className="text-xs text-text-secondary mt-0.5">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
