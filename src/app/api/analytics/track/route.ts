import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, sessionId, userId, productId, categoryId, subcategoryId, metadata, userAgent, deviceType, source, utmSource, utmMedium, utmCampaign, referrer } = body;

    if (!eventType || !sessionId) {
      return NextResponse.json({ ok: true });
    }

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
        userId: userId || null,
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
