"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
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

interface NotificationBellProps {  className?: string;  accentRing?: string;  basePath?: string;}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const TYPE_ICONS: Record<string, string> = {
  ORDER_PLACED: "\u{1F6D2}",
  PAYMENT_SUCCESS: "\u2705",
  PAYMENT_FAILED: "\u274C",
  ORDER_CONFIRMED: "\u{1F4E6}",
  ORDER_SHIPPED: "\u{1F69A}",
  OUT_FOR_DELIVERY: "\u{1F4CD}",
  DELIVERED: "\u{1F389}",
  CANCELLED: "\u{1F6AB}",
  REFUNDED: "\u{1F4B0}",
  NEW_CUSTOMER: "\u{1F464}",
  LOW_STOCK: "\u26A0\uFE0F",
  PRODUCT_UPDATED: "\u{1F4DD}",
  STAFF_UPDATED: "\u{1F465}",
  GENERAL: "\u{1F514}",
};

export default function NotificationBell({ className, accentRing = "ring-[#f7f5f2]", basePath = "/admin" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=15");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
        setOpen(false);
      }
    };
    // Use mousedown for immediate response
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

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch("/api/notifications/" + id, { method: "PATCH" });
    } catch {}
  };

  const markAllRead = async () => {
    setLoading(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    } catch {}
    setLoading(false);
  };

  const getNotifLink = (n: Notification): string => {
    if (n.orderId) return "/admin/orders/" + n.orderId;
    if (n.type.includes("PRODUCT")) return "/admin/products";
    if (n.type.includes("ORDER")) return "/admin/orders";
    if (n.type.includes("CUSTOMER")) return "/admin/customers";
    if (n.type.includes("STAFF")) return "/admin/staff";
    return "/admin/dashboard";
  };

  return (
    <div className={cn("relative", className)}>
      {/* Bell button — minimum 44×44 touch target */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="relative w-11 h-11 flex items-center justify-center hover:bg-black/[.04] rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a574]/50"
        aria-label="Notifications"
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

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Mobile: full-screen backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            className={cn(
              "fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full sm:mt-2",
              "w-[calc(100vw-1rem)] sm:w-[360px] sm:max-w-[calc(100vw-2rem)]",
              "max-h-[70vh] sm:max-h-[420px]",
              "bg-white sm:rounded-2xl rounded-t-2xl border border-black/[.06]",
              "sm:shadow-xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)]",
              "z-50 overflow-hidden animate-fade-in",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[.06] shrink-0">
              <h3 className="text-sm font-semibold text-[#1a1917]">Notifications</h3>
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

            {/* Notification list */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={28} className="text-[#d1ccc6] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#6b6560]">No new notifications</p>
                  <p className="text-xs text-[#b0aba6] mt-1">You&apos;re all caught up.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <a
                    key={n.id}
                    href={getNotifLink(n)}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors border-b border-black/[.03] last:border-0",
                      n.isRead ? "bg-white hover:bg-[#f7f5f2]/50" : "bg-[#d4a574]/[.03] hover:bg-[#d4a574]/[.06]"
                    )}
                  >
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#d4a574] mt-1.5 shrink-0" />
                    )}
                    <span className="text-base mt-0.5 shrink-0">{TYPE_ICONS[n.type] || "\u{1F514}"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-tight", n.isRead ? "text-[#6b6560]" : "font-medium text-[#1a1917]")}>{n.title}</p>
                      <p className="text-xs text-[#b0aba6] mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-[#d1ccc6] mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
