"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Truck, Save, CheckCircle, CreditCard, XCircle, Clock, User, MapPin, FileText, ChevronDown, Eye, ShoppingCart, Phone, Mail, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface OrderItem {
  id: string; productName: string; variantName: string | null; sku: string | null;
  quantity: number; unitPrice: number; totalPrice: number; image: string | null;
}

interface StatusHistory { status: string; note: string | null; createdAt: string; }

interface OrderDetail {
  id: string; orderNumber: string; status: string; paymentStatus: string;
  customerName: string; customerEmail: string; customerPhone: string;
  addressLine1: string; addressLine2: string | null; city: string; state: string; pinCode: string;
  subtotal: number; discount: number; deliveryCharge: number; tax: number; total: number;
  paymentMethod: string | null; deliveryMethod: string;
  trackingNumber: string | null; adminNotes: string | null;
  items: OrderItem[]; createdAt: string; deliveredAt: string | null;
  statusHistory: StatusHistory[];
}

interface CustomerOrder {
  id: string; orderNumber: string; status: string; total: number; createdAt: string;
}

const ALL_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "ON_HOLD"];

const STATUS_FLOW: Record<string, { next: string; label: string; icon: any }[]> = {
  NEW: [
    { next: "CONFIRMED", label: "Confirm Order", icon: CheckCircle },
  ],
  CONFIRMED: [
    { next: "PROCESSING", label: "Start Processing", icon: Package },
    { next: "CANCELLED", label: "Cancel", icon: XCircle },
  ],
  PROCESSING: [
    { next: "SHIPPED", label: "Ship Order", icon: Truck },
    { next: "CANCELLED", label: "Cancel", icon: XCircle },
  ],
  SHIPPED: [
    { next: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: Truck },
    { next: "DELIVERED", label: "Mark Delivered", icon: CheckCircle },
  ],
  OUT_FOR_DELIVERY: [
    { next: "DELIVERED", label: "Mark Delivered", icon: CheckCircle },
  ],
};


export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchOrder(); }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setCustomerOrders(data.customerOrders || []);
        setNewStatus(data.order.status);
        setTrackingNumber(data.order.trackingNumber || "");
        setAdminNotes(data.order.adminNotes || "");
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleQuickAction = async (action: string, note?: string, extra?: any) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note, ...extra }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Order ${action === "confirm_payment" ? "payment confirmed" : data.status?.toLowerCase() + "d" || "updated"}`);
        fetchOrder();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed");
      }
    } catch { toast.error("Failed to update order"); }
    finally { setUpdating(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Order deleted");
        window.location.href = "/admin/orders";
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
      }
    } catch { toast.error("Failed to delete order"); }
    finally { setDeleting(false); }
  };

  const handleFullUpdate = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: statusNote, trackingNumber, adminNotes }),
      });
      if (res.ok) {
        toast.success("Order updated");
        fetchOrder();
        setStatusNote("");
      } else { toast.error("Failed to update"); }
    } catch { toast.error("Failed to update"); }
    finally { setUpdating(false); }
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-[1.35rem]" />
    </div>
  );
  if (!order) return <div className="py-20 text-center"><h1 className="text-xl font-display font-semibold">Order not found</h1></div>;

  const flowActions = STATUS_FLOW[order.status] || [];

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground">
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-semibold">Order {order.orderNumber}</h1>
          <p className="text-sm text-text-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(order.status))}>
            {order.status.replace(/_/g, " ")}
          </span>
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium",
            order.paymentStatus === "COMPLETED" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          )}>
            {order.paymentStatus === "COMPLETED" ? "Paid" : "Unpaid"}
          </span>
        </div>
      </div>

      {/* Quick Action Bar */}
      {flowActions.length > 0 && (
        <div className="bg-surface rounded-[1.35rem] border border-border p-4">
          <p className="text-xs font-medium text-text-muted mb-3">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {flowActions.map((action) => (
              <Button
                key={action.next}
                size="sm"
                variant={action.next === "CANCELLED" ? "outline" : "primary"}
                onClick={() => handleQuickAction(
                  action.next === "CONFIRMED" ? "confirm" : action.next === "DELIVERED" ? "deliver" : action.next === "CANCELLED" ? "cancel" : action.next === "SHIPPED" ? "ship" : "confirm",
                  action.next === "CANCELLED" ? "Cancelled by staff" : undefined,
                  action.next === "SHIPPED" ? { trackingNumber } : undefined
                )}
                loading={updating}
              >
                <action.icon size={14} /> {action.label}
              </Button>
            ))}
            {order.paymentStatus !== "COMPLETED" && (
              <Button size="sm" variant="outline" onClick={() => handleQuickAction("confirm_payment", paymentNote)} loading={updating}>
                <CreditCard size={14} /> Confirm Payment
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-surface rounded-[1.35rem] border border-border p-5">
            <h2 className="font-semibold text-sm mb-3">Customer</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-text-muted" />
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-text-muted" />
                <span className="text-text-secondary truncate">{order.customerEmail}</span>
              </div>
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-text-muted" />
                  <span className="text-text-secondary">{order.customerPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-surface rounded-[1.35rem] border border-border p-5">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <MapPin size={14} /> Shipping Address
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {order.addressLine1}<br />
              {order.addressLine2 && <>{order.addressLine2}<br /></>}
              {order.city}, {order.state} - {order.pinCode}
            </p>
          </div>

          {/* Payment */}
          <div className="bg-surface rounded-[1.35rem] border border-border p-5">
            <h2 className="font-semibold text-sm mb-3">Payment</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Method</span><span>{order.paymentMethod || "Razorpay"}</span></div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Status</span>
                <span className={cn(order.paymentStatus === "COMPLETED" ? "text-success font-medium" : "text-warning font-medium")}>
                  {order.paymentStatus === "COMPLETED" ? "Paid" : "Pending"}
                </span>
              </div>
              {order.paymentStatus !== "COMPLETED" && (
                <div className="pt-2">
                  <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Payment note (optional)" className="w-full px-3 py-1.5 bg-white border border-border rounded-full text-xs" />
                </div>
              )}
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-surface rounded-[1.35rem] border border-border p-5">
            <h2 className="font-semibold text-sm mb-3">Status Management</h2>
            <div className="space-y-3">
              {showAllStatuses ? (
                <>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-3 py-2 bg-white border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                  <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" className="w-full px-3 py-2 bg-white border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Admin notes" className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm min-h-[60px] resize-none" rows={2} />
                  <Button onClick={handleFullUpdate} loading={updating} fullWidth size="sm">
                    <Save size={14} /> Save Changes
                  </Button>
                </>
              ) : null}
              <button onClick={() => setShowAllStatuses(!showAllStatuses)} className="text-xs text-accent hover:underline">
                {showAllStatuses ? "Hide manual controls" : "Manual status control"}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Items */}
          <div className="bg-surface rounded-[1.35rem] border border-border p-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <ShoppingCart size={14} /> Items ({order.items.length})
            </h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-surface rounded-[1.35rem] border border-border">
                  <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={16} className="text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    {item.variantName && <p className="text-xs text-text-muted">{item.variantName}</p>}
                    {item.sku && <p className="text-xs text-[#b0aba6] font-mono">SKU: {item.sku}</p>}
                    <p className="text-xs text-text-muted">Qty: {item.quantity} x {formatPrice(item.unitPrice)}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(item.totalPrice)}</p>
                </div>
              ))}
            </div>

            {/* Order Totals */}
            <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
              {order.deliveryCharge > 0 && <div className="flex justify-between"><span className="text-text-secondary">Delivery</span><span>{formatPrice(order.deliveryCharge)}</span></div>}
              {order.tax > 0 && <div className="flex justify-between"><span className="text-text-secondary">Tax</span><span>{formatPrice(order.tax)}</span></div>}
              <div className="border-t border-border pt-2 flex justify-between font-semibold text-base"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </div>

          {/* Status History */}
          <div className="bg-surface rounded-[1.35rem] border border-border p-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Clock size={14} /> Status History
            </h2>
            <div className="space-y-3">
              {order.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0", i === 0 ? "bg-success" : "bg-border")} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getStatusColor(h.status))}>
                        {h.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-text-muted">{formatDate(h.createdAt)}</span>
                    </div>
                    {h.note && <p className="text-xs text-text-secondary mt-1">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer's Other Orders */}
          {customerOrders.length > 0 && (
            <div className="bg-surface rounded-[1.35rem] border border-border p-5">
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Eye size={14} /> Customer's Other Orders ({customerOrders.length})
              </h2>
              <div className="space-y-2">
                {customerOrders.map((co) => (
                  <Link key={co.id} href={`/admin/orders/${co.id}`}
                    className="flex items-center justify-between p-3 bg-surface rounded-[1.35rem] border border-border hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{co.orderNumber}</p>
                      <p className="text-xs text-text-muted">{formatDate(co.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getStatusColor(co.status))}>
                        {co.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm font-medium">{formatPrice(co.total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
