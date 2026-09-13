import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== "doit") return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    // Set all products to have stock
    const productUpdate = await db.product.updateMany({
      data: { stockQuantity: 10, trackInventory: false }
    });

    // Set all variants to have stock
    const variantUpdate = await db.productVariant.updateMany({
      data: { stockQuantity: 10 }
    });

    return NextResponse.json({ 
      success: true, 
      products: productUpdate.count,
      variants: variantUpdate.count
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
