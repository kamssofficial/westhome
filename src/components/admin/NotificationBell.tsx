"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell, CheckCheck, X, Trash2, Package, User, ShoppingCart,
  AlertTriangle, RefreshCw, Settings, Truck, CreditCard,
  PackageCheck, Ban, RotateCcw, Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string; type: string; title: string; message: string;
  orderId?: string | null; isRead: boolean; isDeleted?: boolean; createdAt: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date(); const d = new Date(dateStr);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  ORDER_PLACED: { icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
  PAYMENT_SUCCESS: { icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
  PAYMENT_FAILED: { icon: Ban, color: "text-red-600", bg: "bg-red-50" },
  ORDER_CONFIRMED: { icon: PackageCheck, color: "text-blue-600", bg: "bg-blue-50" },
  ORDER_SHIPPED: { icon: Truck, color: "text-indigo-600", bg: "bg-indigo-50" },
  OUT_FOR_DELIVERY: { icon: Truck, color: "text-amber-600", bg: "bg-amber-50" },
  DELIVERED: { icon: PackageCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  CANCELLED: { icon: Ban, color: "text-red-600", bg: "bg-red-50" },
  REFUNDED: { icon: RotateCcw, color: "text-orange-600", bg: "bg-orange-50" },
  NEW_CUSTOMER: { icon: User, color: "text-violet-600", bg: "bg-violet-50" },
  LOW_STOCK: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  PRODUCT_UPDATED: { icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
  PRODUCT_ADDED: { icon: Package, color: "text-emerald-600", bg: "bg-emerald-50" },
  PRODUCT_DELETED: { icon: Trash2, color: "text-red-600", bg: "bg-red-50" },
  STAFF_UPDATED: { icon: Settings, color: "text-gray-600", bg: "bg-gray-50" },
  GENERAL: { icon: Bell, color: "text-[#d4a574]", bg: "bg-[#fdf6f0]" },
};

function getConfig(type: string) { return TYPE_CONFIG[type] || TYPE_CONFIG.GENERAL; }

function getLink(n: Notification): string {
  if (n.orderId) return "/admin/orders/" + n.orderId;
  if (n.type.includes("PRODUCT")) return "/admin/products";
  if (n.type.includes("ORDER")) return "/admin/orders";
  if (n.type.includes("CUSTOMER")) return "/admin/customers";
  if (n.type.includes("STAFF")) return "/admin/staff";
  return "/admin/dashboard";
}
export default function NotificationBell({ className, accentRing = "ring-[#f7f5f2]" }: { className?: string; accentRing?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (res.ok) { const d = await res.json(); setNotifications(d.notifications || []); setUnreadCount(d.unreadCount || 0); }
    } catch {}
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 15000); return () => clearInterval(i); }, [fetchData]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t) && buttonRef.current && !buttonRef.current.contains(t)) {
        setOpen(false); setShowClearConfirm(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setShowClearConfirm(false); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const markRead = async (id: string) => {
    setNotifications(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(p => Math.max(0, p - 1));
    try { await fetch("/api/notifications/" + id, { method: "PATCH" }); } catch {}
  };

  const markAllRead = async () => {
    setLoading(true);
    setNotifications(p => p.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try { await fetch("/api/notifications/read-all", { method: "PATCH" }); } catch {}
    setLoading(false);
  };

  const deleteOne = async (id: string) => {
    const wasUnread = notifications.find(n => n.id === id && !n.isRead);
    setNotifications(p => p.filter(n => n.id !== id));
    if (wasUnread) setUnreadCount(p => Math.max(0, p - 1));
    try { await fetch("/api/notifications/" + id, { method: "DELETE" }); } catch {}
  };

  const deleteAll = async () => {
    setLoading(true); setNotifications([]); setUnreadCount(0); setShowClearConfirm(false);
    try { await fetch("/api/notifications/delete-all", { method: "DELETE" }); } catch {}
    setLoading(false);
  };
  return (
    <div className={cn("relative", className)}>
      <button ref={buttonRef} onClick={e => { e.stopPropagation(); setOpen(p => !p); }}
        className="relative w-11 h-11 flex items-center justify-center hover:bg-black/[.04] rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a574]/50"
        aria-label="Notifications" aria-expanded={open} type="button">
        <Bell size={18} className="text-[#6b6560]" />
        {unreadCount > 0 && (
          <span className={cn("absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center",
            "bg-[#d4a574] text-white text-[10px] font-bold rounded-full px-1 ring-2", accentRing)}> 
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (<>
        <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setOpen(false)} />
        <div ref={panelRef} className={cn(
          "fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full sm:mt-2",
          "w-[calc(100vw-1rem)] sm:w-[380px] sm:max-w-[calc(100vw-2rem)]",
          "max-h-[75vh] sm:max-h-[480px] bg-white sm:rounded-2xl rounded-t-2xl border border-black/[.06]",
          "sm:shadow-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] z-50 overflow-hidden flex flex-col")}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[.04] shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#1a1917]">Notifications</h3>
              {unreadCount > 0 && <span className="text-[10px] font-semibold text-[#d4a574] bg-[#fdf6f0] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
            </div>
            <div className="flex items-center gap-0.5">
              {unreadCount > 0 && (
                <button onClick={markAllRead} disabled={loading}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#6b6560] hover:text-[#1a1917] px-2 py-1.5 rounded-lg hover:bg-[#f7f5f2] transition-colors disabled:opacity-50">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (showClearConfirm ? (
                <div className="flex items-center gap-1 ml-1">
                  <button onClick={deleteAll} disabled={loading} className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">Confirm</button>
                  <button onClick={() => setShowClearConfirm(false)} className="text-[10px] font-medium text-[#6b6560] px-1.5 py-1 rounded-lg hover:bg-[#f7f5f2]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowClearConfirm(true)} className="p-2 hover:bg-red-50 rounded-lg transition-colors ml-0.5" title="Clear all">
                  <Trash2 size={12} className="text-[#b0aba6] hover:text-red-500" />
                </button>
              ))}
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-[#f7f5f2] rounded-lg transition-colors ml-0.5"><X size={13} className="text-[#b0aba6]" /></button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f7f5f2] flex items-center justify-center mx-auto mb-3"><Inbox size={20} className="text-[#d1ccc6]" /></div>
                <p className="text-sm font-medium text-[#6b6560]">All caught up</p>
                <p className="text-xs text-[#b0aba6] mt-1">No notifications</p>
              </div>
            ) : notifications.map(n => {
              const cfg = getConfig(n.type); const Icon = cfg.icon;
              return (
                <div key={n.id} className={cn("group flex items-start gap-3 px-4 py-3 transition-all duration-150 border-b border-black/[.03] last:border-0 hover:bg-[#f7f5f2]/60", !n.isRead && "bg-[#d4a574]/[.03]")}>
                  {!n.isRead ? <span className="w-2 h-2 rounded-full bg-[#d4a574] mt-2 shrink-0 animate-pulse" /> : <span className="w-2 shrink-0" />}
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}><Icon size={14} className={cfg.color} /></div>
                  <a href={getLink(n)} onClick={() => { if (!n.isRead) markRead(n.id); setOpen(false); }} className="flex-1 min-w-0 cursor-pointer">
                    <p className={cn("text-[13px] leading-tight", !n.isRead ? "font-semibold text-[#1a1917]" : "text-[#6b6560]")}>{n.title}</p>
                    <p className="text-xs text-[#b0aba6] mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-[#d1ccc6] mt-1.5 font-medium">{timeAgo(n.createdAt)}</p>
                  </a>
                  <button onClick={e => { e.stopPropagation(); deleteOne(n.id); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-50 transition-all shrink-0 mt-0.5">
                    <Trash2 size={12} className="text-[#b0aba6] hover:text-red-500 transition-colors" />
                  </button>
                </div>
              );
            })}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-black/[.04] shrink-0 text-center">
              <a href="/admin/dashboard" onClick={() => setOpen(false)} className="text-[11px] font-medium text-[#d4a574] hover:text-[#c08a5a] transition-colors">View all activity</a>
            </div>
          )}
        </div>
      </>)}</div>
  );
}