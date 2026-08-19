"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Truck, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";
import toast from "react-hot-toast";

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
  adminNotes: string | null;
  items: OrderItem[];
  createdAt: string;
  statusHistory: { status: string; note: string | null; createdAt: string }[];
}

const ALL_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "ON_HOLD"];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.order) {
          setOrder(data.order);
          setNewStatus(data.order.status);
          setTrackingNumber(data.order.trackingNumber || "");
          setAdminNotes(data.order.adminNotes || "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: statusNote, trackingNumber, adminNotes }),
      });
      if (res.ok) {
        toast.success("Order updated");
        const data = await fetch(`/api/orders/${id}`).then((r) => r.json());
        if (data.order) setOrder(data.order);
        setStatusNote("");
      } else {
        toast.error("Failed to update order");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="container-shop py-8"><div className="animate-pulse h-64 bg-surface-muted rounded-xl" /></div>;
  if (!order) return <div className="container-shop py-20 text-center"><h1 className="text-xl font-semibold">Order not found</h1></div>;

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground">
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Order {order.orderNumber}</h1>
          <p className="text-sm text-text-muted">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(order.status))}>
            {order.status.replace(/_/g, " ")}
          </span>
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium",
            order.paymentStatus === "COMPLETED" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          )}>
            {order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status management */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-border-light p-5">
            <h2 className="font-semibold text-sm mb-4">Update Status</h2>
            <div className="space-y-3">
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
              <input type="text" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Note (optional)" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Admin notes" className="w-full px-3 py-2 border border-border rounded-lg text-sm min-h-[80px]" rows={3} />
              <Button onClick={handleUpdateStatus} loading={updating} fullWidth size="sm">
                <Save size={14} /> Update Order
              </Button>
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-xl border border-border-light p-5">
            <h2 className="font-semibold text-sm mb-3">Customer</h2>
            <div className="space-y-1 text-sm text-text-secondary">
              <p className="font-medium text-foreground">{order.customerName}</p>
              <p>{order.customerEmail}</p>
              <p>{order.customerPhone}</p>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl border border-border-light p-5">
            <h2 className="font-semibold text-sm mb-3">Shipping Address</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {order.addressLine1}<br />
              {order.addressLine2 && <>{order.addressLine2}<br /></>}
              {order.city}, {order.state} - {order.pinCode}
            </p>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-border-light p-5">
            <h2 className="font-semibold text-sm mb-3">Payment</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Method</span><span>{order.paymentMethod || "Razorpay"}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Status</span><span className={cn(order.paymentStatus === "COMPLETED" ? "text-success" : "text-warning")}>{order.paymentStatus}</span></div>
            </div>
          </div>
        </div>

        {/* Items and history */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-border-light p-5">
            <h2 className="font-semibold text-sm mb-4">Items</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-muted/50 rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
                    <Package size={16} className="text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    {item.variantName && <p className="text-xs text-text-muted">{item.variantName}</p>}
                    <p className="text-xs text-text-muted">Qty: {item.quantity} × {formatPrice(item.unitPrice)}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(item.totalPrice)}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-border-light space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-text-secondary">Delivery</span><span>{order.deliveryCharge > 0 ? formatPrice(order.deliveryCharge) : "FREE"}</span></div>
              <div className="border-t border-border-light pt-2 flex justify-between font-semibold text-base"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </div>

          {/* Status history */}
          <div className="bg-white rounded-xl border border-border-light p-5">
            <h2 className="font-semibold text-sm mb-4">Status History</h2>
            <div className="space-y-3">
              {order.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", i === 0 ? "bg-success" : "bg-surface-muted")} />
                  <div>
                    <p className="text-sm font-medium">{h.status.replace(/_/g, " ")}</p>
                    {h.note && <p className="text-xs text-text-muted">{h.note}</p>}
                    <p className="text-xs text-text-muted">{formatDate(h.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
