import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// Simple dedup: same session + same event + same product within 2 seconds = skip
const recentEvents = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, sessionId, userId, productId, categoryId, subcategoryId, metadata, userAgent, deviceType } = body;

    if (!eventType || !sessionId) {
      return NextResponse.json({ ok: true }); // silently ignore invalid events
    }

    // Dedup: same session + event + product within 2s
    const dedupKey = `${sessionId}:${eventType}:${productId || "none"}`;
    const now = Date.now();
    const last = recentEvents.get(dedupKey);
    if (last && now - last < 2000) {
      return NextResponse.json({ ok: true, deduped: true });
    }
    recentEvents.set(dedupKey, now);
    // Cleanup old entries periodically
    if (recentEvents.size > 10000) {
      for (const [k, v] of recentEvents) {
        if (now - v > 10000) recentEvents.delete(k);
      }
    }

    // Detect staff/admin from session
    let isStaff = false;
    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user && user.role !== "CUSTOMER") isStaff = true;
    }

    // Don't track staff/admin browsing analytics
    if (isStaff) {
      return NextResponse.json({ ok: true, skipped: "staff" });
    }

    await db.analyticsEvent.create({
      data: {
        eventType,
        userId: userId || null,
        sessionId,
        productId: productId || null,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        metadata: metadata || undefined,
        userAgent: userAgent || null,
        deviceType: deviceType || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Analytics failures must never break the customer experience
    return NextResponse.json({ ok: true });
  }
}
