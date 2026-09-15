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
    const { sessionId, deviceType, userAgent, currentPage, currentProductId } = body;
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
        // What the visitor is looking at right now (cleared when not viewing a product)
        currentPage: typeof currentPage === "string" ? currentPage.slice(0, 300) : null,
        currentProductId: typeof currentProductId === "string" ? currentProductId.slice(0, 200) : null,
      },
      create: {
        sessionId,
        deviceType: typeof deviceType === "string" ? deviceType.slice(0, 30) : "desktop",
        userAgent: typeof userAgent === "string" ? userAgent.slice(0, 1000) : null,
        userId,
        isStaff,
        currentPage: typeof currentPage === "string" ? currentPage.slice(0, 300) : null,
        currentProductId: typeof currentProductId === "string" ? currentProductId.slice(0, 200) : null,
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
    const role = session?.user?.role as string | undefined;
    if (!session?.user || role === "CUSTOMER" || !["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"].includes(role || "")) {
      return NextResponse.json({ live: 0, customers: 0, guests: 0, visitors: [] });
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [total, customers, guests, rows] = await Promise.all([
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false } }),
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false, userId: { not: null } } }),
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false, userId: null } }),
      // Real per-visitor detail for the Live Store cards
      db.liveSession.findMany({
        where: { lastActive: { gte: fiveMinAgo }, isStaff: false },
        select: {
          sessionId: true, deviceType: true, currentPage: true, currentProductId: true,
          lastActive: true, createdAt: true, userId: true,
        },
        orderBy: { lastActive: "desc" },
        take: 50,
      }),
    ]);

    // Resolve product names for visitors currently on a product page — from
    // the real Product table, never invented.
    const productIds = [...new Set(rows.map(r => r.currentProductId).filter(Boolean))] as string[];
    const products = productIds.length > 0
      ? await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      : [];
    const pMap = Object.fromEntries(products.map(p => [p.id, p.name]));

    const visitors = rows.map(r => ({
      sessionId: r.sessionId,
      device: r.deviceType || "unknown",
      currentPage: r.currentPage,
      viewingProduct: r.currentProductId ? (pMap[r.currentProductId] || null) : null,
      isCustomer: r.userId != null,
      secondsSinceActive: Math.max(0, Math.round((Date.now() - new Date(r.lastActive).getTime()) / 1000)),
      sessionStartedAt: r.createdAt,
    }));

    return NextResponse.json({ live: total, customers, guests, visitors });
  } catch {
    return NextResponse.json({ live: 0, customers: 0, guests: 0, visitors: [] });
  }
}
