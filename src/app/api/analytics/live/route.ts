import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

const heartbeatBuckets = new Map<string, { count: number; resetAt: number }>();
const HEARTBEAT_LIMIT = 30;
const HEARTBEAT_WINDOW_MS = 60_000;
let lastCleanupAt = 0;

function isRateLimited(key: string) {
  const now = Date.now();
  const current = heartbeatBuckets.get(key);
  if (!current || now >= current.resetAt) {
    heartbeatBuckets.set(key, { count: 1, resetAt: now + HEARTBEAT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > HEARTBEAT_LIMIT;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, deviceType, userAgent } = body;
    if (typeof sessionId !== "string" || sessionId.length < 8 || sessionId.length > 100) {
      return NextResponse.json({ ok: true });
    }

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`live:${forwarded}:${sessionId}`)) return NextResponse.json({ ok: true });

    const session = await auth().catch(() => null);
    const userId = (session?.user as any)?.id || null;
    const isStaff = !!(session?.user && ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"].includes((session.user as any).role));

    await db.liveSession.upsert({
      where: { sessionId },
      update: {
        lastActive: new Date(),
        deviceType: typeof deviceType === "string" ? deviceType.slice(0, 30) : "desktop",
        userAgent: typeof userAgent === "string" ? userAgent.slice(0, 1000) : null,
        userId,
        isStaff,
      },
      create: {
        sessionId,
        deviceType: typeof deviceType === "string" ? deviceType.slice(0, 30) : "desktop",
        userAgent: typeof userAgent === "string" ? userAgent.slice(0, 1000) : null,
        userId,
        isStaff,
      },
    });

    // Cleanup is intentionally throttled; deleting on every heartbeat creates
    // unnecessary write load as traffic grows.
    if (Date.now() - lastCleanupAt > 60_000) {
      lastCleanupAt = Date.now();
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      await db.liveSession.deleteMany({ where: { lastActive: { lt: tenMinAgo } } });
    }

    if (heartbeatBuckets.size > 5000) {
      const now = Date.now();
      for (const [key, value] of heartbeatBuckets) if (value.resetAt < now) heartbeatBuckets.delete(key);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ live: 0, customers: 0, guests: 0 });

    const role = (session.user as any).role;
    if (role === "CUSTOMER") return NextResponse.json({ live: 0, customers: 0, guests: 0 });
    if (!["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"].includes(role)) {
      return NextResponse.json({ live: 0, customers: 0, guests: 0 });
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [total, customers, guests] = await Promise.all([
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false } }),
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false, userId: { not: null } } }),
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false, userId: null } }),
    ]);

    return NextResponse.json({ live: total, customers, guests });
  } catch {
    return NextResponse.json({ live: 0, customers: 0, guests: 0 });
  }
}
