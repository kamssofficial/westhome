import { notifyOrderStatusChange } from "@/lib/notifications";
import { restoreOrderStock } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireOrderManager } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

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
      // SECURITY: Validate status transitions using state machine
      const currentOrder = await db.order.findUnique({ where: { id }, select: { status: true } });
      if (!currentOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      
      const VALID_TRANSITIONS: Record<string, string[]> = {
        NEW: ["CONFIRMED", "CANCELLED", "ON_HOLD"],
        CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED", "ON_HOLD"],
        PROCESSING: ["SHIPPED", "CANCELLED", "ON_HOLD"],
        SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "ON_HOLD"],
        OUT_FOR_DELIVERY: ["DELIVERED"],
        ON_HOLD: ["CONFIRMED", "PROCESSING", "CANCELLED"],
        DELIVERED: ["REFUNDED"],
        CANCELLED: [],
        PAYMENT_FAILED: ["NEW"],
        REFUNDED: [],
      };
      const allowed = VALID_TRANSITIONS[currentOrder.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: `Cannot transition from ${currentOrder.status} to ${body.status}` }, { status: 400 });
      }

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

    // Return stock to inventory when a paid order is cancelled or refunded,
    // matching the decrement done at payment verification.
    if (body.status === "CANCELLED" || body.status === "REFUNDED") {
      try {
        await restoreOrderStock(id);
      } catch (error) {
        console.error("Failed to restore stock for order", id, error);
      }
    }

    await logAdminAction({
      action: "UPDATE",
      entity: "ORDER",
      entityId: id,
      details: { changes: updates, note: body.note || null },
      request,
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
      await logAdminAction({ action: "CONFIRM", entity: "ORDER", entityId: id, details: { note: body.note || null }, request });

      return NextResponse.json({ success: true, status: "CONFIRMED" });
    }

    // Confirm payment (set paymentStatus to COMPLETED)
    // SECURITY: Only allow for orders with existing Razorpay verification
    if (body.action === "confirm_payment") {
      const order = await db.order.findUnique({ where: { id }, select: { paymentMethod: true, paymentStatus: true, paymentId: true } });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      // Razorpay orders should be verified through /api/payment/verify, not manually
      if (order.paymentMethod === "RAZORPAY" && !order.paymentId) {
        return NextResponse.json({ error: "Razorpay orders must be verified through payment verification, not manually" }, { status: 400 });
      }
      if (order.paymentStatus === "COMPLETED") {
        return NextResponse.json({ error: "Payment already confirmed" }, { status: 400 });
      }
      if (!body.note) {
        return NextResponse.json({ error: "Staff note required for manual payment confirmation" }, { status: 400 });
      }

      await db.order.update({
        where: { id },
        data: { paymentStatus: "COMPLETED" },
      });
      await db.orderStatusHistory.create({
        data: {
          orderId: id,
          status: order.paymentStatus as any,
          note: body.note,
        },
      });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "PAYMENT_CONFIRMED").catch(() => {}); }
      await logAdminAction({ action: "PAYMENT_CONFIRMED", entity: "ORDER", entityId: id, details: { note: body.note }, request });

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
      await logAdminAction({ action: "SHIP", entity: "ORDER", entityId: id, details: { trackingNumber: body.trackingNumber || null, note: body.note || null }, request });

      return NextResponse.json({ success: true, status: "SHIPPED" });
    }

    // Quick deliver
    if (body.action === "deliver") {
      const order = await db.order.findUnique({ where: { id } });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (order.status !== "SHIPPED" && order.status !== "OUT_FOR_DELIVERY") {
        return NextResponse.json({ error: "Order must be SHIPPED or OUT_FOR_DELIVERY first" }, { status: 400 });
      }

      await db.order.update({
        where: { id },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      await db.orderStatusHistory.create({
        data: { orderId: id, status: "DELIVERED", note: body.note || "Delivered" },
      });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "DELIVERED").catch(() => {}); }
      await logAdminAction({ action: "DELIVER", entity: "ORDER", entityId: id, details: { note: body.note || null }, request });

      return NextResponse.json({ success: true, status: "DELIVERED" });
    }

    // Quick cancel
    if (body.action === "cancel") {
      const order = await db.order.findUnique({ where: { id }, select: { status: true } });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (order.status === "DELIVERED" || order.status === "CANCELLED" || order.status === "REFUNDED") {
        return NextResponse.json({ error: `Cannot cancel ${order.status} order` }, { status: 400 });
      }
      await db.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      await db.orderStatusHistory.create({
        data: { orderId: id, status: "CANCELLED", note: body.note || "Cancelled by staff" },
      });
      try {
        await restoreOrderStock(id);
      } catch (error) {
        console.error("Failed to restore stock for order", id, error);
      }
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "CANCELLED").catch(() => {}); }
      await logAdminAction({ action: "CANCEL", entity: "ORDER", entityId: id, details: { note: body.note || null }, request });

      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin order quick action error:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
