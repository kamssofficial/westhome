"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell, CheckCheck, X, AlertTriangle, ShoppingCart, Package,
  Truck, CheckCircle, XCircle, UserPlus, RefreshCw, ArrowRight,
  DollarSign, Star, FileText, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  className?: string;
  accentRing?: string;
}

// ── Lucide icons per notification type ──
const TYPE_ICON_MAP: Record<string, any> = {
  ORDER_PLACED: ShoppingCart,
  PAYMENT_SUCCESS: CheckCircle,
  PAYMENT_FAILED: XCircle,
  ORDER_CONFIRMED: Package,
  ORDER_SHIPPED: Truck,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
  REFUNDED: DollarSign,
  NEW_CUSTOMER: UserPlus,
  LOW_STOCK: AlertTriangle,
  PRODUCT_UPDATED: FileText,
  STAFF_UPDATED: Settings,
  GENERAL: Bell,
};

const TYPE_COLOR_MAP: Record<string, string> = {
  ORDER_PLACED: "bg-blue-100 text-blue-600",
  PAYMENT_SUCCESS: "bg-green-100 text-green-600",
  PAYMENT_FAILED: "bg-red-100 text-red-500",
  ORDER_CONFIRMED: "bg-indigo-100 text-indigo-600",
  ORDER_SHIPPED: "bg-purple-100 text-purple-600",
  OUT_FOR_DELIVERY: "bg-amber-100 text-amber-600",
  DELIVERED: "bg-green-100 text-green-600",
  CANCELLED: "bg-red-100 text-red-500",
  REFUNDED: "bg-orange-100 text-orange-600",
  NEW_CUSTOMER: "bg-blue-100 text-blue-500",
  LOW_STOCK: "bg-amber-100 text-amber-600",
  PRODUCT_UPDATED: "bg-gray-100 text-gray-600",
  STAFF_UPDATED: "bg-gray-100 text-gray-500",
  GENERAL: "bg-gray-100 text-gray-500",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "orders", label: "Orders", types: ["ORDER_PLACED", "ORDER_CONFIRMED", "ORDER_SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] },
  { key: "payments", label: "Payments", types: ["PAYMENT_SUCCESS", "PAYMENT_FAILED", "REFUNDED"] },
  { key: "inventory", label: "Inventory", types: ["LOW_STOCK"] },
  { key: "products", label: "Products", types: ["PRODUCT_UPDATED"] },
  { key: "customers", label: "Customers", types: ["NEW_CUSTOMER"] },
];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return days + "d ago";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getNotifLink(n: Notification): string {
  if (n.orderId) return "/admin/orders/" + n.orderId;
  if (n.type.includes("PRODUCT")) return "/admin/products";
  if (n.type.includes("ORDER")) return "/admin/orders";
  if (n.type.includes("CUSTOMER")) return "/admin/customers";
  if (n.type.includes("STAFF")) return "/admin/staff";
  return "/admin/dashboard";
}

function NotifIcon({ type }: { type: string }) {
  const Icon = TYPE_ICON_MAP[type] || Bell;
  const color = TYPE_COLOR_MAP[type] || "bg-gray-100 text-gray-500";
  return (
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", color)}>
      <Icon size={14} />
    </div>
  );
}

// ── Group consecutive same-type notifications ──
function groupNotifications(notifs: Notification[]): (Notification | { grouped: true; type: string; count: number; ids: string[]; latest: string; sample: Notification })[] {
  const result: any[] = [];
  let i = 0;
  while (i < notifs.length) {
    const current = notifs[i];
    // Check if next 2+ are same type within 10 minutes
    const group = [current];
    let j = i + 1;
    while (j < notifs.length && notifs[j].type === current.type && !notifs[j].isRead) {
      const diff = new Date(current.createdAt).getTime() - new Date(notifs[j].createdAt).getTime();
      if (diff < 10 * 60 * 1000 && group.length < 5) {
        group.push(notifs[j]);
        j++;
      } else break;
    }
    if (group.length >= 2) {
      result.push({ grouped: true, type: current.type, count: group.length, ids: group.map(g => g.id), latest: group[0].createdAt, sample: current });
      i = j;
    } else {
      result.push(current);
      i++;
    }
  }
  return result;
}

export default function NotificationBell({ className, accentRing = "ring-panel-header" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (p = 1, append = false) => {
    try {
      const res = await fetch(`/api/notifications?limit=20&page=${p}`);
      if (res.ok) {
        const data = await res.json();
        const notifs = data.notifications || [];
        if (append) {
          setAllNotifications(prev => [...prev, ...notifs]);
        } else {
          setAllNotifications(notifs);
        }
        setUnreadCount(data.unreadCount || 0);
        setHasMore(notifs.length >= 20);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Apply filter
  useEffect(() => {
    let filtered = allNotifications;
    if (filter === "unread") filtered = filtered.filter(n => !n.isRead);
    else if (filter !== "all") {
      const filterDef = FILTERS.find(f => f.key === filter);
      if (filterDef?.types) filtered = filtered.filter(n => filterDef.types!.includes(n.type));
    }
    setNotifications(filtered);
  }, [allNotifications, filter]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Reset filter and page when closing
  useEffect(() => {
    if (!open) { setFilter("all"); setPage(1); }
  }, [open]);

  const markAsRead = async (id: string) => {
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try { await fetch("/api/notifications/" + id, { method: "PATCH" }); } catch {}
  };

  const markAllRead = async () => {
    setLoading(true);
    setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try { await fetch("/api/notifications/read-all", { method: "PATCH" }); } catch {}
    setLoading(false);
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchNotifications(nextPage, true);
  };

  const grouped = groupNotifications(notifications);

  return (
    <div className={cn("relative", className)}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
        className="relative w-11 h-11 flex items-center justify-center hover:bg-black/[.04] rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a574]/50"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        type="button"
      >
        <Bell size={18} className="text-[#6b6560]" />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center",
            "bg-[#d4a574] text-white text-[10px] font-bold rounded-full px-1",
            "ring-2", accentRing
          )}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setOpen(false)} />

          <div
            ref={panelRef}
            className={cn(
              // Mobile: bottom sheet style
              "fixed sm:absolute bottom-0 sm:bottom-auto right-0 sm:right-0 top-auto sm:top-full sm:mt-2",
              "w-full sm:w-[380px] sm:max-w-[calc(100vw-2rem)]",
              "max-h-[75vh] sm:max-h-[520px]",
              "bg-white sm:rounded-2xl rounded-t-2xl border border-black/[.06]",
              "sm:shadow-xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)]",
              "z-50 overflow-hidden animate-fade-in",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[.06] shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#1a1917]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#d4a574]/10 text-[#d4a574] text-[10px] font-bold rounded-full">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs font-medium text-[#6b6560] hover:text-[#1a1917] px-2 py-1 rounded-lg hover:bg-[#f7f5f2] transition-colors disabled:opacity-50"
                  >
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-[#f7f5f2] rounded-lg transition-colors ml-1"
                  aria-label="Close notifications"
                >
                  <X size={14} className="text-[#b0aba6]" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1 px-4 py-2 border-b border-black/[.03] overflow-x-auto scrollbar-hide shrink-0">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0",
                    filter === f.key
                      ? "bg-[#1a1917] text-white"
                      : "bg-[#f7f5f2] text-[#6b6560] hover:bg-[#ece9e4]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div ref={listRef} className="overflow-y-auto flex-1 overscroll-contain" style={{ scrollbarWidth: "none" }}>
              {loading && notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <RefreshCw size={20} className="text-[#d1ccc6] mx-auto mb-2 animate-spin" />
                  <p className="text-xs text-[#b0aba6]">Loading notifications...</p>
                </div>
              ) : grouped.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#f7f5f2] flex items-center justify-center mx-auto mb-3">
                    <Bell size={20} className="text-[#d1ccc6]" />
                  </div>
                  <p className="text-sm font-medium text-[#6b6560]">You&apos;re all caught up</p>
                  <p className="text-xs text-[#b0aba6] mt-1">No new notifications right now.</p>
                </div>
              ) : (
                <>
                  {grouped.map((item, idx) => {
                    if ("grouped" in item && item.grouped) {
                      const Icon = TYPE_ICON_MAP[item.type] || Bell;
                      const color = TYPE_COLOR_MAP[item.type] || "bg-gray-100 text-gray-500";
                      return (
                        <Link
                          key={item.ids.join(",")}
                          href={getNotifLink(item.sample)}
                          onClick={() => { item.ids.forEach(id => markAsRead(id)); setOpen(false); }}
                          className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#f7f5f2]/60 transition-colors border-b border-black/[.03] last:border-0"
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", color)}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-[#1a1917]">{item.count} {item.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</p>
                              <span className="px-1.5 py-0.5 bg-[#f7f5f2] text-[#6b6560] text-[9px] font-bold rounded-full">{item.count}</span>
                            </div>
                            <p className="text-xs text-[#b0aba6] mt-0.5 line-clamp-1">Tap to view all</p>
                            <p className="text-[10px] text-[#d1ccc6] mt-0.5">{timeAgo(item.latest)}</p>
                          </div>
                          <ArrowRight size={12} className="text-[#d1ccc6] mt-2 shrink-0" />
                        </Link>
                      );
                    }

                    const n = item as Notification;
                    return (
                      <Link
                        key={n.id}
                        href={getNotifLink(n)}
                        onClick={() => { if (!n.isRead) markAsRead(n.id); setOpen(false); }}
                        className={cn(
                          "flex items-start gap-3 px-4 py-2.5 transition-colors border-b border-black/[.03] last:border-0",
                          n.isRead ? "bg-white hover:bg-[#f7f5f2]/50" : "bg-[#d4a574]/[.03] hover:bg-[#d4a574]/[.06]"
                        )}
                      >
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] mt-2.5 shrink-0" />
                        )}
                        <NotifIcon type={n.type} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm leading-tight", n.isRead ? "text-[#6b6560]" : "font-medium text-[#1a1917]")}>{n.title}</p>
                          <p className="text-xs text-[#b0aba6] mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-[#d1ccc6] mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </Link>
                    );
                  })}

                  {hasMore && (
                    <button
                      onClick={loadMore}
                      className="w-full py-2.5 text-xs font-medium text-[#6b6560] hover:bg-[#f7f5f2] transition-colors"
                    >
                      Load more
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
