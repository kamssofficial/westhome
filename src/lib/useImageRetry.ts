"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Silently retries a failed product image before giving up.
 *
 * Product images are served through the /api/images proxy (Google Drive
 * backed). Cold fetches occasionally fail once — public-endpoint blips or
 * rate limits — even though the file is fine. A short, quiet retry with a
 * cache-busted URL heals those invisibly instead of flashing the
 * "Some product images could not be loaded." toast.
 *
 * Returns [src, onError]:
 *  - `src` is the URL to render (original, or cache-busted on retries)
 *  - `onError` is the <img>/<Image> onError handler. While retries remain it
 *    schedules one (1.2 s, then 4 s). When exhausted it invokes `onExhausted`
 *    exactly once so the caller can fall back to a placeholder / report.
 *
 * A URL that exhausts retries is remembered module-level so a grid of cards
 * sharing the same dead image neither loops nor spams downstream reporting.
 */

const MAX_RETRIES = 2;

const exhausted = new Set<string>();

export function useImageRetry(
  src: string | null | undefined,
  onExhausted?: () => void,
): [string | null | undefined, () => void] {
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<number | null>(null);
  const onExhaustedRef = useRef(onExhausted);
  onExhaustedRef.current = onExhausted;

  // A different source (variant switch, product change) resets the cycle.
  useEffect(() => {
    setAttempt(0);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [src]);

  const currentSrc =
    attempt > 0 && src ? `${src}${src.includes("?") ? "&" : "?"}r=${attempt}` : src;

  const handleError = useCallback(() => {
    if (!src) return;
    if (exhausted.has(src) || attempt >= MAX_RETRIES) {
      exhausted.add(src);
      onExhaustedRef.current?.();
      return;
    }
    const next = attempt + 1;
    const delay = next === 1 ? 1200 : 4000;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAttempt(next), delay);
  }, [src, attempt]);

  return [currentSrc, handleError];
}
