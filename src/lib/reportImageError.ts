"use client";

import toast from "react-hot-toast";
import { trackEvent } from "@/components/ui/AnalyticsTracker";

/**
 * Reports a failed storefront product image to the admin analytics
 * (IMAGE_ERROR event, visible in the BI Live Activity feed) and shows a
 * small, non-intrusive toast to the visitor.
 *
 * Deduplicated per URL per page load, so a grid of cards sharing one broken
 * image reports a single event/toast instead of dozens.
 */

const reported = new Set<string>();

export function reportImageError(params: {
  url?: string | null;
  productId?: string;
  productName?: string;
}) {
  const url = params.url || "unknown";
  if (reported.has(url)) return;
  reported.add(url);

  try {
    trackEvent("IMAGE_ERROR", {
      productId: params.productId,
      productName: params.productName,
      imageUrl: String(url).slice(0, 300),
      page: typeof window !== "undefined" ? window.location.pathname : "",
    });
  } catch {
    // Analytics must never break the experience
  }

  // Small, quiet toast — the visitor mostly needs to know the page is fine
  // and we are aware. Dedup keeps it from spamming on card grids.
  toast("Some product images could not be loaded.", {
    id: "wh-image-error",
    duration: 3500,
    icon: "🖼️",
  });
}
