import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

function isValidSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === "string" && sessionId.length >= 8 && sessionId.length <= 100;
}

const STAFF_ROLES = ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"] as const;

function actionForEvent(eventType: string, metadata: any, productName: string | null) {
  switch (eventType) {
    case "PRODUCT_VIEW":
    case "VIEW":
      return {
        type: "VIEW_PRODUCT",
        label: productName ? `Viewing “${productName}”` : "Viewing a product",
        intent: "Product interest",
      };
    case "COLLECTION_VIEW":
    case "CATEGORY_VIEW":
      return { type: "BROWSE_COLLECTION", label: "Browsing a collection", intent: "Browsing" };
    case "SEARCH": {
      const q = typeof metadata?.query === "string" ? metadata.query.trim().slice(0, 80) : "";
      return {
        type: "SEARCH",
        label: q ? `Searching “${q}”` : "Searching the store",
        intent: "Search intent",
        searchQuery: q || null,
      };
    }
    case "ADD_TO_CART":
      return { type: "ADD_TO_CART", label: productName ? `Added “${productName}” to cart` : "Added an item to cart", intent: "Purchase intent" };
    case "REMOVE_FROM_CART":
      return { type: "REMOVE_FROM_CART", label: "Removed an item from cart", intent: "Shopping" };
    case "WISHLIST_ADD":
    case "WISHLIST":
      return { type: "WISHLIST", label: productName ? `Saved “${productName}”` : "Saved an item to wishlist", intent: "Product interest" };
    case "WISHLIST_REMOVE":
      return { type: "WISHLIST_REMOVE", label: "Removed an item from wishlist", intent: "Shopping" };
    case "BUY_NOW":
      return { type: "BUY_NOW", label: productName ? `Starting checkout for “${productName}”` : "Starting checkout", intent: "High purchase intent" };
    case "CHECKOUT_STARTED":
      return { type: "CHECKOUT_STARTED", label: "Started checkout", intent: "High purchase intent" };
    case "PAYMENT_START":
      return { type: "PAYMENT_START", label: "Started payment", intent: "High purchase intent" };
    case "PAYMENT_SUCCESS":
    case "PURCHASE":
      return { type: "PURCHASE", label: "Completed a purchase", intent: "Purchase completed" };
    case "WHATSAPP_ENQUIRY":
      return { type: "WHATSAPP_ENQUIRY", label: "Opened a WhatsApp enquiry", intent: "Enquiry" };
    case "LOGIN":
      return { type: "LOGIN", label: "Signed in", intent: "Account activity" };
    case "SIGNUP":
      return { type: "SIGNUP", label: "Created an account", intent: "Account activity" };
    case "PAGE_VIEW":
    default:
      return { type: "BROWSE", label: "Browsing the store", intent: "Browsing", searchQuery: null };
  }
}

function fallbackActionFromPage(path: string | null, productName: string | null) {
  if (path?.startsWith("/products/")) {
    return { type: "VIEW_PRODUCT", label: productName ? `Viewing “${productName}”` : "Viewing a product", intent: "Product interest" };
  }
  if (path?.startsWith("/collections/")) return { type: "BROWSE_COLLECTION", label: "Browsing a collection", intent: "Browsing" };
  if (path?.startsWith("/cart")) return { type: "CART", label: "Viewing the cart", intent: "Purchase intent" };
  if (path?.startsWith("/checkout")) return { type: "CHECKOUT", label: "In checkout", intent: "High purchase intent" };
  if (path?.startsWith("/search")) return { type: "SEARCH", label: "Searching the store", intent: "Search intent" };
  return { type: "BROWSE", label: "Browsing the store", intent: "Browsing" };
}

let lastCleanupAt = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, deviceType, userAgent, currentPage, currentProductId } = body;
    if (!isValidSessionId(sessionId)) return NextResponse.json({ ok: true });

    const session = await auth().catch(() => null);
    const userId = session?.user?.id || null;
    const role = session?.user?.role;
    const isStaff = role !== undefined && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);

    await db.liveSession.upsert({
      where: { sessionId },
      update: {
        lastActive: new Date(),
        deviceType: typeof deviceType === "string" ? deviceType.slice(0, 30) : "desktop",
        userAgent: typeof userAgent === "string" ? userAgent.slice(0, 1000) : null,
        userId,
        isStaff,
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
    if (!session?.user || role === "CUSTOMER" || !STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) {
      return NextResponse.json({ live: 0, customers: 0, guests: 0, visitors: [] });
    }

    const now = Date.now();
    const fiveMinAgo = new Date(now - 5 * 60 * 1000);
    const tenMinAgo = new Date(now - 10 * 60 * 1000);

    const [total, customers, guests, rows] = await Promise.all([
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false } }),
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false, userId: { not: null } } }),
      db.liveSession.count({ where: { lastActive: { gte: fiveMinAgo }, isStaff: false, userId: null } }),
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

    const productIds = [...new Set(rows.map(r => r.currentProductId).filter(Boolean))] as string[];
    const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))] as string[];

    const [products, users, recentEvents] = await Promise.all([
      productIds.length > 0
        ? db.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      rows.length > 0
        ? db.analyticsEvent.findMany({
            where: {
              sessionId: { in: rows.map(r => r.sessionId) },
              createdAt: { gte: tenMinAgo },
            },
            select: {
              sessionId: true,
              eventType: true,
              productId: true,
              metadata: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 500,
          })
        : Promise.resolve([]),
    ]);

    const pMap = Object.fromEntries(products.map(p => [p.id, p.name]));
    const uMap = Object.fromEntries(users.map(u => [u.id, u]));

    const latestBySession = new Map<string, (typeof recentEvents)[number]>();
    for (const event of recentEvents) {
      if (!latestBySession.has(event.sessionId || "")) latestBySession.set(event.sessionId || "", event);
    }

    const visitors = rows.map(r => {
      const currentProductName = r.currentProductId ? (pMap[r.currentProductId] || null) : null;
      const latest = latestBySession.get(r.sessionId);
      const latestProductName = latest?.productId ? (pMap[latest.productId] || null) : null;
      const action = latest
        ? actionForEvent(latest.eventType, latest.metadata, latestProductName)
        : fallbackActionFromPage(r.currentPage, currentProductName);
      const actionAt = latest?.createdAt ? new Date(latest.createdAt) : new Date(r.lastActive);
      const customer = r.userId ? uMap[r.userId] || null : null;

      return {
        sessionId: r.sessionId,
        device: r.deviceType || "unknown",
        currentPage: r.currentPage,
        viewingProduct: currentProductName,
        isCustomer: r.userId != null,
        customerName: customer?.name || null,
        customerEmail: customer?.email || null,
        secondsSinceActive: Math.max(0, Math.round((now - new Date(r.lastActive).getTime()) / 1000)),
        sessionAgeSeconds: Math.max(0, Math.round((now - new Date(r.createdAt).getTime()) / 1000)),
        lastActionType: action.type,
        lastAction: action.label,
        intent: action.intent,
        searchQuery: action.searchQuery || null,
        lastActionAt: actionAt.toISOString(),
        lastActionSecondsAgo: Math.max(0, Math.round((now - actionAt.getTime()) / 1000)),
        sessionStartedAt: r.createdAt,
      };
    });

    return NextResponse.json({ live: total, customers, guests, visitors });
  } catch {
    return NextResponse.json({ live: 0, customers: 0, guests: 0, visitors: [] });
  }
}
