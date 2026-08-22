import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const role = (session.user as any).role;
    const userId = (session.user as any).id;

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

    // Ownership check: customers can only see their own orders
    if (role === "CUSTOMER" && order.userId !== userId) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "MANAGER" && role !== "ORDER_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updates: any = {};
    if (body.status) {
      updates.status = body.status;
      // Create status history entry
      await db.orderStatusHistory.create({
        data: {
          orderId: id,
          status: body.status,
          note: body.note || null,
        },
      });
    }

    if (body.trackingNumber !== undefined) {
      updates.trackingNumber = body.trackingNumber || null;
    }
    if (body.adminNotes !== undefined) {
      updates.adminNotes = body.adminNotes || null;
    }
    if (body.deliveredAt) {
      updates.deliveredAt = new Date(body.deliveredAt);
    }

    const order = await db.order.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Order PATCH error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
