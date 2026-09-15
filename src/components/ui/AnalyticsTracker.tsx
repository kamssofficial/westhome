"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("wh_session");
  if (!id) {
    id = "s_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    sessionStorage.setItem("wh_session", id);
  }
  return id;
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export async function trackEvent(eventType: string, metadata?: Record<string, any>) {
  try {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;
    // productId / categoryId / subcategoryId are stored as dedicated columns
    // (the dashboards group on them), so they must go at the top level of the
    // payload — inside `metadata` they would be dropped by the track API.
    const { productId, categoryId, subcategoryId, ...rest } = metadata || {};
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        sessionId,
        deviceType: getDeviceType(),
        productId: typeof productId === "string" ? productId : undefined,
        categoryId: typeof categoryId === "string" ? categoryId : undefined,
        subcategoryId: typeof subcategoryId === "string" ? subcategoryId : undefined,
        metadata: rest,
      }),
    });
    // Keep the live-session record in sync so the Live Store shows the page
    // the visitor is on right now, not just a heartbeat count.
    if (productId && (eventType === "VIEW" || eventType === "PRODUCT_VIEW")) {
      void updateLiveSession({ currentProductId: productId });
    }
  } catch {
    // Never break the experience
  }
}

// Fire-and-forget heartbeat update with the visitor's current context.
export async function updateLiveSession(extra?: { currentProductId?: string }) {
  try {
    const sessionId = getOrCreateSessionId();
    if (!sessionId || typeof window === "undefined") return;
    const path = window.location.pathname;
    await fetch("/api/analytics/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        deviceType: getDeviceType(),
        currentPage: path,
        currentProductId: extra?.currentProductId,
      }),
    });
  } catch {
    // Never break the experience
  }
}

// Heartbeat to keep session alive (every 30s while the tab is visible)
export function SessionHeartbeat() {
  useEffect(() => {
    const id = getOrCreateSessionId();
    if (!id) return;

    const beat = () => {
      if (document.visibilityState === "hidden") return; // don't count background tabs as active
      void updateLiveSession();
    };

    beat();
    const interval = setInterval(beat, 30000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  return null;
}

// Track page views automatically
export function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    trackEvent("PAGE_VIEW", { path: pathname });
    // route change: refresh the live-session context immediately
    void updateLiveSession();
  }, [pathname]);

  useEffect(() => {
    trackEvent("PAGE_VIEW", { path: pathname });
  }, []);

  return null;
}
