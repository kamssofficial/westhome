import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN","MANAGER","PRODUCT_MANAGER","ORDER_MANAGER","CONTENT_MANAGER","STAFF"]);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const since = new Date(Date.now() - 60 * 60 * 1000);

    const events = await db.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
      select: { id: true, eventType: true, productId: true, deviceType: true, metadata: true, createdAt: true },
    });

    const productIds = [...new Set(events.map(e => e.productId).filter(Boolean))] as string[];
    const products = productIds.length > 0 ? await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

    const enriched = events.map(e => ({
      id: e.id, type: e.eventType,
      product: e.productId ? productMap[e.productId] || "Unknown" : null,
      productId: e.productId, device: e.deviceType,
      source: (e.metadata as any)?.trafficSource || null,
      query: (e.metadata as any)?.query || null,
      time: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ activities: enriched });
  } catch (error) {
    return NextResponse.json({ activities: [] });
  }
}
