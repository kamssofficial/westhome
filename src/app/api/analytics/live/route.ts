import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// POST — heartbeat (update or create live session)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, deviceType, userAgent } = body;
    if (!sessionId) return NextResponse.json({ ok: true });

    // Check if session is staff
    let isStaff = false;
    // We don't know userId from client, so mark isStaff based on path context
    // The client won't send this for staff pages

    await db.liveSession.upsert({
      where: { sessionId },
      update: { lastActive: new Date(), deviceType, userAgent },
      create: { sessionId, deviceType, userAgent, isStaff },
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
