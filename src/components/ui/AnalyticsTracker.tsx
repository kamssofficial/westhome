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
    // (the dashboard groups on them), so they must go at the top level of the
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
  } catch {
    // Never break the experience
  }
}

// Heartbeat to keep session alive
export function SessionHeartbeat() {
  useEffect(() => {
    const id = getOrCreateSessionId();
    if (!id) return;

    const heartbeat = () => {
      fetch("/api/analytics/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, deviceType: getDeviceType() }),
      }).catch(() => {});
    };

    heartbeat();
    const interval = setInterval(heartbeat, 30000);
    return () => clearInterval(interval);
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
  }, [pathname]);

  useEffect(() => {
    trackEvent("PAGE_VIEW", { path: pathname });
  }, []);

  return null;
}
