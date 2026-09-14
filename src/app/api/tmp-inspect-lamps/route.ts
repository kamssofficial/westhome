import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== "doit") return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    const lampCat = await db.category.findUnique({ where: { slug: "lamps" } });
    if (!lampCat) return NextResponse.json({ error: "No lamps category found" });

    const allLamps = await db.product.findMany({
      where: { categoryId: lampCat.id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isActive: true,
        regularPrice: true,
        salePrice: true,
        images: { select: { id: true, url: true, position: true } }
      }
    });

    return NextResponse.json({
      count: allLamps.length,
      lamps: allLamps
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
