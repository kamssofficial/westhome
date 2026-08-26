"use client";
import { useEffect, useRef } from "react";

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
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return "mobile";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getTrafficSource() {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const referrer = document.referrer || "";
  const utmSource = url.searchParams.get("utm_source") || "";
  const utmMedium = url.searchParams.get("utm_medium") || "";
  const utmCampaign = url.searchParams.get("utm_campaign") || "";

  let source = "direct";
  if (utmSource) {
    source = utmSource.toLowerCase();
  } else if (referrer) {
    const r = referrer.toLowerCase();
    if (r.includes("google")) source = "google";
    else if (r.includes("facebook") || r.includes("fb.")) source = "facebook";
    else if (r.includes("instagram")) source = "instagram";
    else if (r.includes("wa.me") || r.includes("whatsapp")) source = "whatsapp";
    else if (r.includes("twitter") || r.includes("x.com")) source = "twitter";
    else if (r.includes("pinterest")) source = "pinterest";
    else source = "referral";
  }

  return { source, utmSource, utmMedium, utmCampaign, referrer: referrer || undefined };
}

export function trackEvent(eventType, data = {}) {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  const traffic = getTrafficSource();
  const body = {
    eventType,
    sessionId,
    deviceType: getDeviceType(),
    userAgent: navigator.userAgent,
    ...traffic,
    ...data,
  };
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
    const send = () => {
      fetch("/api/analytics/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, deviceType: getDeviceType(), userAgent: navigator.userAgent }),
      }).catch(() => {});
    };
    send();
    intervalRef.current = setInterval(send, 60000);
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
