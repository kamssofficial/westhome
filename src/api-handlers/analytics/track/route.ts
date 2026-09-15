import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const ALLOWED_EVENTS = new Set([
  "PAGE_VIEW", "VIEW", "PRODUCT_VIEW", "SEARCH", "WISHLIST_ADD", "WISHLIST", "WISHLIST_REMOVE",
  "ADD_TO_CART", "REMOVE_FROM_CART", "BUY_NOW", "WHATSAPP_ENQUIRY", "CHECKOUT_STARTED",
  "PAYMENT_START", "PAYMENT_SUCCESS", "PURCHASE", "LOGIN", "SIGNUP", "CATEGORY_VIEW", "COLLECTION_VIEW",
]);
const MAX_BODY_BYTES = 32_000;
const MAX_METADATA_BYTES = 8_000;

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ ok: true });

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
    const userId = session?.user?.id || null;
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

    return NextResponse.json({ ok: true });
  } catch {
    // Analytics must never break the storefront.
    return NextResponse.json({ ok: true });
  }
}
