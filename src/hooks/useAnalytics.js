"use client";
import { useEffect, useRef, useCallback } from "react";

function getSessionId() {
  if (typeof window === "undefined") return null;
  let id = sessionStorage.getItem("wh_session");
  if (!id) {
    id = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem("wh_session", id);
  }
  return id;
}

function getDeviceType() {
  if (typeof navigator === "undefined") return "desktop";
  const w = window.innerWidth;
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return "mobile";
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function trackEvent(eventType, data = {}) {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  const body = {
    eventType,
    sessionId,
    deviceType: getDeviceType(),
    userAgent: navigator.userAgent,
    ...data,
  };
  // Fire-and-forget — never block the UI
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function useHeartbeat() {
  const intervalRef = useRef(null);
  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    // Send initial heartbeat
    fetch("/api/analytics/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, deviceType: getDeviceType(), userAgent: navigator.userAgent }),
    }).catch(() => {});
    // Send heartbeat every 60s
    intervalRef.current = setInterval(() => {
      fetch("/api/analytics/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, deviceType: getDeviceType(), userAgent: navigator.userAgent }),
      }).catch(() => {});
    }, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);
}

export function useTrackPageView(productId, categoryId, subcategoryId) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackEvent("VIEW", { productId: productId || undefined, categoryId: categoryId || undefined, subcategoryId: subcategoryId || undefined });
  }, [productId, categoryId, subcategoryId]);
}
