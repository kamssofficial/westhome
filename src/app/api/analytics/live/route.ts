import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

function isValidSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === "string" && sessionId.length >= 8 && sessionId.length <= 100;
}

let lastCleanupAt = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, deviceType, userAgent } = body;
    if (!isValidSessionId(sessionId)) {
      return NextResponse.json({ ok: true });
    }

    const session = await auth().catch(() => null);
    const userId = session?.user?.id || null;
    const role = session?.user?.role;
    const isStaff =
      role !== undefined &&
      ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"].includes(role);

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

    // Cleanup is intentionally throttled per instance; deleting on every heartbeat
    // creates unnecessary write load as traffic grows.
    if (Date.now() - lastCleanupAt > 60_000) {
      lastCleanupAt = Date.now();
      try {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        await db.liveSession.deleteMany({ where: { lastActive: { lt: tenMinAgo } } });
      } catch {}
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

    const role = session.user.role;
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
