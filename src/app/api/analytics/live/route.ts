import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

// POST — heartbeat (update or create live session)
// Public endpoint (no auth required) but uses session when available
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, deviceType, userAgent } = body;
    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 100) {
      return NextResponse.json({ ok: true });
    }

    // SECURITY: Get userId from session if authenticated (don't trust client)
    const session = await auth().catch(() => null);
    const userId = (session?.user as any)?.id || null;
    const isStaff = !!(session?.user && ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"].includes((session.user as any).role));

    await db.liveSession.upsert({
      where: { sessionId },
      update: { lastActive: new Date(), deviceType, userAgent, userId, isStaff },
      create: { sessionId, deviceType, userAgent, userId, isStaff },
    });

    // Cleanup old sessions (older than 10 minutes)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    await db.liveSession.deleteMany({ where: { lastActive: { lt: tenMinAgo } } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

// GET — count live users (admin/staff only)
export async function GET(request: NextRequest) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user) return NextResponse.json({ live: 0, customers: 0, guests: 0 });

    const role = (session.user as any).role;
    if (role === "CUSTOMER") return NextResponse.json({ live: 0, customers: 0, guests: 0 });

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
