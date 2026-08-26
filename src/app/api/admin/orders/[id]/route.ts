import { notifyOrderStatusChange } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireOrderManager } from "@/lib/apiAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrderManager();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            _count: { select: { orders: true, reviews: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch customer's other orders
    const customerOrders = await db.order.findMany({
      where: { userId: order.userId, id: { not: id } },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

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
        deliveredAt: order.deliveredAt?.toISOString() || null,
      },
      customerOrders: customerOrders.map((o) => ({
        ...o,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Admin order detail error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrderManager();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const updates: any = {};

    if (body.status) {
      updates.status = body.status;
      if (body.status === "DELIVERED") {
        updates.deliveredAt = new Date();
      }
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
    console.error("Admin order update error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

// PATCH — quick confirm / payment verify
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrderManager();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();

    // Confirm order (NEW -> CONFIRMED)
    if (body.action === "confirm") {
      const order = await db.order.findUnique({ where: { id } });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (order.status !== "NEW") {
        return NextResponse.json({ error: "Order is not in NEW status" }, { status: 400 });
      }

      await db.order.update({
        where: { id },
        data: { status: "CONFIRMED" },
      });
      await db.orderStatusHistory.create({
        data: { orderId: id, status: "CONFIRMED", note: "Order confirmed by staff" },
      });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "CONFIRMED").catch(() => {}); }

      return NextResponse.json({ success: true, status: "CONFIRMED" });
    }

    // Confirm payment (set paymentStatus to COMPLETED)
    if (body.action === "confirm_payment") {
      const order = await db.order.findUnique({ where: { id } });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      await db.order.update({
        where: { id },
        data: { paymentStatus: "COMPLETED" },
      });
      await db.orderStatusHistory.create({
        data: {
          orderId: id,
          status: order.status,
          note: body.note || "Payment confirmed by staff",
        },
      });

      return NextResponse.json({ success: true, paymentStatus: "COMPLETED" });
    }

    // Quick ship
    if (body.action === "ship") {
      const order = await db.order.findUnique({ where: { id } });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (order.status !== "CONFIRMED" && order.status !== "PROCESSING") {
        return NextResponse.json({ error: "Order must be CONFIRMED or PROCESSING first" }, { status: 400 });
      }

      const updates: any = { status: "SHIPPED" };
      if (body.trackingNumber) updates.trackingNumber = body.trackingNumber;

      await db.order.update({ where: { id }, data: updates });
      await db.orderStatusHistory.create({
        data: { orderId: id, status: "SHIPPED", note: body.note || "Shipped" },
      });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "SHIPPED").catch(() => {}); }

      return NextResponse.json({ success: true, status: "SHIPPED" });
    }

    // Quick deliver
    if (body.action === "deliver") {
      const order = await db.order.findUnique({ where: { id } });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      await db.order.update({
        where: { id },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      await db.orderStatusHistory.create({
        data: { orderId: id, status: "DELIVERED", note: body.note || "Delivered" },
      });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "DELIVERED").catch(() => {}); }

      return NextResponse.json({ success: true, status: "DELIVERED" });
    }

    // Quick cancel
    if (body.action === "cancel") {
      await db.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      await db.orderStatusHistory.create({
        data: { orderId: id, status: "CANCELLED", note: body.note || "Cancelled by staff" },
      });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "CANCELLED").catch(() => {}); }

      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin order quick action error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}

// DELETE — delete an order (admin/staff only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrderManager();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    const order = await db.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Delete related records first
    await db.orderStatusHistory.deleteMany({ where: { orderId: id } });
    await db.orderItem.deleteMany({ where: { orderId: id } });
    await db.payment.deleteMany({ where: { orderId: id } });
    await db.notification.deleteMany({ where: { orderId: id } });
    await db.order.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Order deleted" });
  } catch (error) {
    console.error("Admin order delete error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
