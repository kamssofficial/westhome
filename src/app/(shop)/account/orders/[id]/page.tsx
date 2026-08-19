"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";

interface OrderItem {
  id: string;
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
  items: OrderItem[];
  createdAt: string;
  statusHistory: { status: string; note: string | null; createdAt: string }[];
}

const STATUS_STEPS = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => setOrder(data.order))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

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
      <div className="bg-white rounded-xl border border-border-light p-4 md:p-5 mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-border-light p-4 md:p-5">
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
          <div className="bg-white rounded-xl border border-border-light p-4 md:p-5">
            <h2 className="text-sm font-semibold mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-text-secondary">Delivery</span><span>{order.deliveryCharge > 0 ? formatPrice(order.deliveryCharge) : "FREE"}</span></div>
              <div className="border-t border-border-light pt-2 flex justify-between font-semibold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border-light p-4 md:p-5">
            <h2 className="text-sm font-semibold mb-3">Shipping Address</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {order.customerName}<br />
              {order.addressLine1}<br />
              {order.addressLine2 && <>{order.addressLine2}<br /></>}
              {order.city}, {order.state} - {order.pinCode}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-border-light p-4 md:p-5">
            <h2 className="text-sm font-semibold mb-3">Payment</h2>
            <div className="space-y-1 text-sm text-text-secondary">
              <p>Method: {order.paymentMethod || "Razorpay"}</p>
              <p>Status: <span className={cn(order.paymentStatus === "COMPLETED" ? "text-success" : "text-warning")}>{order.paymentStatus}</span></p>
            </div>
          </div>

          {order.trackingNumber && (
            <div className="bg-white rounded-xl border border-border-light p-4 md:p-5">
              <h2 className="text-sm font-semibold mb-3">Tracking</h2>
              <p className="text-sm text-text-secondary">Tracking #: {order.trackingNumber}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
