import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== "doit") return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    const products = await db.product.updateMany({
      where: {
        OR: [
          { isActive: false },
          { status: { not: "ACTIVE" } }
        ]
      },
      data: {
        isActive: true,
        status: "ACTIVE"
      }
    });

    const variants = await db.productVariant.updateMany({
      where: { isActive: false },
      data: { isActive: true }
    });

    return NextResponse.json({ success: true, products: products.count, variants: variants.count });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
