import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== "doit") return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    // Get all active products
    const products = await db.product.findMany({
      where: { isActive: true, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true }
    });

    // Set first 4 as Featured
    const featuredIds = products.slice(0, 4).map(p => p.id);
    await db.product.updateMany({
      where: { id: { in: featuredIds } },
      data: { isFeatured: true }
    });

    // Set next 4 as New Arrivals
    const newArrivalIds = products.slice(4, 8).map(p => p.id);
    await db.product.updateMany({
      where: { id: { in: newArrivalIds } },
      data: { isNewArrival: true }
    });

    // Set next 4 as Bestsellers
    const bestsellerIds = products.slice(8, 12).map(p => p.id);
    await db.product.updateMany({
      where: { id: { in: bestsellerIds } },
      data: { isBestseller: true }
    });

    return NextResponse.json({ 
      success: true, 
      featured: featuredIds.length,
      newArrivals: newArrivalIds.length,
      bestsellers: bestsellerIds.length,
      total: products.length
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
