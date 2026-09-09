import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const ALLOWED_EVENTS = new Set([
  "PAGE_VIEW", "VIEW", "PRODUCT_VIEW", "SEARCH", "WISHLIST_ADD", "WISHLIST",
  "ADD_TO_CART", "CHECKOUT_STARTED", "PAYMENT_START", "PAYMENT_SUCCESS", "PURCHASE",
  "REMOVE_FROM_CART", "LOGIN", "SIGNUP", "CATEGORY_VIEW", "COLLECTION_VIEW",
]);
const MAX_BODY_BYTES = 32_000;
const MAX_METADATA_BYTES = 8_000;
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  existing.count += 1;
  return existing.count > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ ok: true });

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`analytics:${forwarded}`)) return NextResponse.json({ ok: true });

    const body = await request.json();
    const {
      eventType, sessionId, productId, categoryId, subcategoryId, metadata,
      userAgent, deviceType, source, utmSource, utmMedium, utmCampaign, referrer,
    } = body;

    if (typeof eventType !== "string" || typeof sessionId !== "string") return NextResponse.json({ ok: true });
    const normalizedEvent = eventType.trim().toUpperCase();
    if (!ALLOWED_EVENTS.has(normalizedEvent)) return NextResponse.json({ ok: true });
    if (sessionId.length < 8 || sessionId.length > 100) return NextResponse.json({ ok: true });

    const serializedMetadata = metadata == null ? "" : JSON.stringify(metadata);
    if (serializedMetadata.length > MAX_METADATA_BYTES) return NextResponse.json({ ok: true });

    const session = await auth().catch(() => null);
    const userId = (session?.user as any)?.id || null;
    const enrichedMetadata: Record<string, unknown> = {
      ...(metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}),
    };
    if (source) enrichedMetadata.trafficSource = String(source).slice(0, 100);
    if (utmSource) enrichedMetadata.utmSource = String(utmSource).slice(0, 100);
    if (utmMedium) enrichedMetadata.utmMedium = String(utmMedium).slice(0, 100);
    if (utmCampaign) enrichedMetadata.utmCampaign = String(utmCampaign).slice(0, 100);
    if (referrer) enrichedMetadata.referrer = String(referrer).slice(0, 500);

    await db.analyticsEvent.create({
      data: {
        eventType: normalizedEvent,
        sessionId,
        userId,
        productId: typeof productId === "string" ? productId : null,
        categoryId: typeof categoryId === "string" ? categoryId : null,
        subcategoryId: typeof subcategoryId === "string" ? subcategoryId : null,
        metadata: Object.keys(enrichedMetadata).length > 0 ? (enrichedMetadata as Prisma.InputJsonValue) : undefined,
        userAgent: typeof userAgent === "string" ? userAgent.slice(0, 1000) : null,
        deviceType: typeof deviceType === "string" ? deviceType.slice(0, 30) : "desktop",
      },
    });

    // Keep the in-memory limiter bounded in long-lived Node runtimes.
    if (buckets.size > 5000) {
      const now = Date.now();
      for (const [key, value] of buckets) if (value.resetAt < now) buckets.delete(key);
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Analytics must never break the storefront.
    return NextResponse.json({ ok: true });
  }
}
