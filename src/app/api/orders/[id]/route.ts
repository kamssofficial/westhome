import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        deliveryCharge: Number(order.deliveryCharge),
        tax: Number(order.tax),
        total: Number(order.total),
        items: order.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          salePrice: i.salePrice ? Number(i.salePrice) : null,
          totalPrice: Number(i.totalPrice),
        })),
        statusHistory: order.statusHistory.map((h) => ({
          ...h,
          createdAt: h.createdAt.toISOString(),
        })),
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Order detail API error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
