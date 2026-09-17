import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { syncParentPriceFromVariants } from "@/lib/deriveProductPrice";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const variants = await db.productVariant.findMany({
    where: { productId: id },
    include: {
      images: { orderBy: { position: "asc" } },
      attributes: {
        include: { variantAttribute: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { position: "asc" },
  });

  return NextResponse.json({ variants });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const body = await request.json();

  const product = await db.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const { name, price, salePrice, stockQuantity, attributes } = body as {
    name: string;
    price: number;
    salePrice?: number | null;
    stockQuantity?: number;
    attributes?: { attributeName: string; value: string }[];
  };

  if (!name || price == null) {
    return NextResponse.json({ error: "name and price are required" }, { status: 400 });
  }

  const maxPosition = await db.productVariant.aggregate({
    where: { productId: id },
    _max: { position: true },
  });

  const variant = await db.productVariant.create({
    data: {
      productId: id,
      name,
      price,
      salePrice: salePrice ?? null,
      stockQuantity: stockQuantity ?? 0,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  // Keep the parent price in sync — variants are the price source of truth
  await syncParentPriceFromVariants(id);

  if (attributes?.length) {
    for (const attr of attributes) {
      let variantAttr = await db.variantAttribute.findUnique({
        where: { productId_name: { productId: id, name: attr.attributeName } },
      });
      if (!variantAttr) {
        const maxAttrPos = await db.variantAttribute.aggregate({
          where: { productId: id },
          _max: { position: true },
        });
        variantAttr = await db.variantAttribute.create({
          data: {
            productId: id,
            name: attr.attributeName,
            position: (maxAttrPos._max.position ?? -1) + 1,
          },
        });
      }

      await db.variantAttributeValue.create({
        data: {
          variantAttributeId: variantAttr.id,
          variantId: variant.id,
          value: attr.value,
          position: 0,
        },
      });
    }
  }

  const created = await db.productVariant.findUnique({
    where: { id: variant.id },
    include: {
      images: true,
      attributes: { include: { variantAttribute: true } },
    },
  });

  await logAdminAction({
    action: "CREATE",
    entity: "PRODUCT_VARIANT",
    entityId: variant.id,
    details: { productName: product.name, variantName: name, price },
    request,
  });

  return NextResponse.json({ variant: created }, { status: 201 });
}
