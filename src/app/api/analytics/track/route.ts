import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, sessionId, productId, categoryId, subcategoryId, metadata, userAgent, deviceType, source, utmSource, utmMedium, utmCampaign, referrer } = body;

    if (!eventType || !sessionId) {
      return NextResponse.json({ ok: true });
    }

    // SECURITY: Get userId from session, never trust client
    const session = await auth().catch(() => null);
    const userId = (session?.user as any)?.id || null;

    // Build metadata with traffic source info
    const enrichedMetadata: any = { ...(metadata || {}) };
    if (source) enrichedMetadata.trafficSource = source;
    if (utmSource) enrichedMetadata.utmSource = utmSource;
    if (utmMedium) enrichedMetadata.utmMedium = utmMedium;
    if (utmCampaign) enrichedMetadata.utmCampaign = utmCampaign;
    if (referrer) enrichedMetadata.referrer = referrer;

    await db.analyticsEvent.create({
      data: {
        eventType: String(eventType).toUpperCase(),
        sessionId: String(sessionId),
        userId,
        productId: productId || null,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        metadata: Object.keys(enrichedMetadata).length > 0 ? enrichedMetadata : undefined,
        userAgent: userAgent || null,
        deviceType: deviceType || "desktop",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Never break the customer experience
    return NextResponse.json({ ok: true });
  }
}
