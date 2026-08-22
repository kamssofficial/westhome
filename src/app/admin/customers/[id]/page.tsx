"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Edit2, Save, X, Mail, Phone, Package, ShoppingCart, Clock, User, Shield, CheckCircle, CreditCard, ChevronDown, Eye } from "lucide-react";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface CustomerOrder {
  id: string; orderNumber: string; status: string; paymentStatus: string;
  total: number; subtotal: number; discount: number; deliveryCharge: number; paymentMethod: string | null; createdAt: string; deliveredAt: string | null; customerName: string; customerEmail: string; customerPhone: string | null;
  items: { id: string; productName: string; variantName: string | null; quantity: number; unitPrice: number; totalPrice: number; image: string | null; }[];
  statusHistory: { status: string; note: string | null; createdAt: string; }[];
  addressLine1: string; addressLine2: string | null; city: string; state: string; pinCode: string;
  deliveryMethod: string; trackingNumber: string | null;
}
interface Address { id: string; name: string; phone: string; addressLine1: string; addressLine2: string | null; city: string; state: string; pinCode: string; country: string; isDefault: boolean; }
interface Customer { id: string; name: string; email: string; phone: string | null; role: string; isActive: boolean; createdAt: string; updatedAt: string; orders: CustomerOrder[]; addresses: Address[]; stats: { totalOrders: number; totalReviews: number; totalAddresses: number; totalSpent: number; deliveredOrders: number; avgOrderValue: number; }; }

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => { fetchCustomer(); }, [id]);
  const fetchCustomer = async () => {
    try { const res = await fetch("/api/admin/customers/" + id); if (res.ok) { const data = await res.json(); setCustomer(data.customer); setEditForm({ name: data.customer.name || "", email: data.customer.email, phone: data.customer.phone || "", isActive: data.customer.isActive }); } } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  const handleSave = async () => {
    setSaving(true);
    try { const res = await fetch("/api/admin/customers/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) }); if (res.ok) { toast.success("Customer updated"); setEditing(false); fetchCustomer(); } else { const err = await res.json(); toast.error(err.error || "Failed to update"); } } catch { toast.error("Failed to update customer"); } finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full rounded-xl" /><Skeleton className="h-48 w-full rounded-xl" /></div>;
  if (!customer) return <div className="py-20 text-center"><h1 className="text-xl font-semibold">Customer not found</h1></div>;
  const recentOrders = customer.orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to Customers</Link>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 border border-border"><User size={24} className="text-text-muted" /></div>
          <div><h1 className="text-xl font-semibold">{customer.name || "No Name"}</h1><p className="text-sm text-text-muted">{customer.email}</p></div>
        </div>
        <div className="flex gap-2">
          {!editing ? (<Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 size={14} /> Edit</Button>) : (
            <><Button variant="outline" size="sm" onClick={() => { setEditing(false); setEditForm({ name: customer.name || "", email: customer.email, phone: customer.phone || "", isActive: customer.isActive }); }}><X size={14} /> Cancel</Button><Button size="sm" onClick={handleSave} loading={saving}><Save size={14} /> Save</Button></>
          )}
        </div>
      </div>
      {editing && (
        <div className="bg-surface rounded-[1.35rem] border border-border p-5"><h2 className="font-semibold text-sm mb-4">Edit Customer Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Name</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" required /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Phone</label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="accent-accent" /> Active Account</label></div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{ label: "Total Orders", value: customer.stats.totalOrders, icon: ShoppingCart }, { label: "Total Spent", value: formatPrice(customer.stats.totalSpent), icon: CreditCard }, { label: "Avg Order", value: formatPrice(customer.stats.avgOrderValue), icon: Package }, { label: "Delivered", value: customer.stats.deliveredOrders, icon: CheckCircle }].map((stat) => (
          <div key={stat.label} className="bg-surface rounded-[1.35rem] border border-border p-4"><stat.icon size={18} className="text-text-muted mb-2" /><p className="text-lg font-semibold">{stat.value}</p><p className="text-xs text-text-muted">{stat.label}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-surface rounded-[1.35rem] border border-border p-5"><h2 className="font-semibold text-sm mb-3">Contact Information</h2><div className="space-y-3">
            <div className="flex items-center gap-3 text-sm"><Mail size={15} className="text-text-muted" /><a href={"mailto:" + customer.email} className="text-accent hover:underline truncate">{customer.email}</a></div>
            {customer.phone && <div className="flex items-center gap-3 text-sm"><Phone size={15} className="text-text-muted" /><a href={"tel:" + customer.phone} className="text-accent hover:underline">{customer.phone}</a></div>}
            <div className="flex items-center gap-3 text-sm"><Clock size={15} className="text-text-muted" /><span className="text-text-secondary">Joined {formatDate(customer.createdAt)}</span></div>
            <div className="flex items-center gap-3 text-sm"><Shield size={15} className="text-text-muted" /><span className={cn("text-sm", customer.isActive ? "text-success" : "text-error")}>{customer.isActive ? "Active" : "Inactive"}</span></div>
            <div className="flex items-center gap-3 text-sm"><Eye size={15} className="text-text-muted" /><span className="text-text-secondary capitalize">{customer.role}</span></div>
          </div>
        </div>

          <div className="bg-surface rounded-[1.35rem] border border-border p-5">
            <h2 className="font-semibold text-sm mb-3">Addresses ({customer.addresses.length})</h2>
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-text-muted">No saved addresses</p>
            ) : (
              <div className="space-y-3">
                {customer.addresses.map((addr) => (
                  <div key={addr.id} className="p-3 bg-white rounded-xl text-sm border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{addr.name}</span>
                      {addr.isDefault && <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">Default</span>}
                    </div>
                    <p className="text-text-secondary text-xs">{addr.addressLine1}{addr.addressLine2 ? ", " + addr.addressLine2 : ""}</p>
                    <p className="text-text-secondary text-xs">{addr.city}, {addr.state} {addr.pinCode}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display font-semibold">Order History ({customer.orders.length})</h2>
          {customer.orders.length === 0 ? (
            <div className="bg-surface rounded-[1.35rem] border border-border p-8 text-center">
              <ShoppingCart size={32} className="mx-auto mb-2 text-text-muted" />
              <p className="text-text-muted">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="bg-surface rounded-[1.35rem] border border-border overflow-hidden">
                  <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">#{order.orderNumber}</p>
                      <p className="text-xs text-text-muted">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", getStatusColor(order.status))}>{order.status}</span>
                      <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                      <ChevronDown size={16} className={cn("text-text-muted transition-transform", expandedOrder === order.id && "rotate-180")} />
                    </div>
                  </button>
                  {expandedOrder === order.id && (
                    <div className="border-t border-border px-5 py-4 space-y-4 bg-white">
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 text-sm">
                            {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.productName}</p>
                              {item.variantName && <p className="text-xs text-text-muted">{item.variantName}</p>}
                            </div>
                            <span className="text-text-secondary">x{item.quantity}</span>
                            <span className="font-medium">{formatPrice(item.totalPrice)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm text-text-secondary border-t border-border pt-2"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                      {order.discount > 0 && <div className="flex justify-between text-sm text-success"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
                      <div className="flex justify-between text-sm text-text-secondary"><span>Delivery ({order.deliveryMethod})</span><span>{formatPrice(order.deliveryCharge)}</span></div>
                      <div className="flex justify-between text-sm font-semibold border-t border-border pt-2"><span>Total</span><span>{formatPrice(order.total)}</span></div>
                      <div className="text-xs text-text-muted space-y-1 pt-2">
                        <p><strong>Ship to:</strong> {order.addressLine1}{order.addressLine2 ? ", " + order.addressLine2 : ""}, {order.city}, {order.state} {order.pinCode}</p>
                        {order.trackingNumber && <p><strong>Tracking:</strong> {order.trackingNumber}</p>}
                        {order.deliveredAt && <p><strong>Delivered:</strong> {formatDate(order.deliveredAt)}</p>}
                      </div>
                      {order.statusHistory.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs font-medium text-text-secondary mb-2">Status Timeline</p>
                          <div className="space-y-2">
                            {order.statusHistory.map((h, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className={cn("px-2 py-0.5 rounded-full font-medium whitespace-nowrap", getStatusColor(h.status))}>{h.status}</span>
                                <span className="text-text-muted">{formatDate(h.createdAt)}</span>
                                {h.note && <span className="text-text-secondary">— {h.note}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Link href={"/admin/orders/" + order.id} className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-2">View full order →</Link>
                    </div>
                  )}
                </div>
              ))}
              {customer.orders.length > 5 && <p className="text-sm text-text-muted text-center">Showing 5 of {customer.orders.length} orders</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
