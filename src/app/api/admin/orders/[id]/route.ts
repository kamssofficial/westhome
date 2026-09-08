import { notifyOrderStatusChange } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireOrderManager } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrderManager();
  if (authResult.error) return authResult.error;
  try {
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true, statusHistory: { orderBy: { createdAt: "desc" } }, payment: true, user: { select: { id: true, name: true, email: true, phone: true, _count: { select: { orders: true, reviews: true } } } } },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const customerOrders = await db.order.findMany({
      where: { userId: order.userId, id: { not: id } },
      select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 10,
    });
    return NextResponse.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal), discount: Number(order.discount), deliveryCharge: Number(order.deliveryCharge), tax: Number(order.tax), total: Number(order.total),
        items: order.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), salePrice: i.salePrice != null ? Number(i.salePrice) : null, totalPrice: Number(i.totalPrice) })),
        statusHistory: order.statusHistory.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
        createdAt: order.createdAt.toISOString(), deliveredAt: order.deliveredAt?.toISOString() || null,
      },
      customerOrders: customerOrders.map((o) => ({ ...o, total: Number(o.total), createdAt: o.createdAt.toISOString() })),
    });
  } catch (error) {
    console.error("Admin order detail error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrderManager();
  if (authResult.error) return authResult.error;
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: any = {};
    if (body.status) {
      const currentOrder = await db.order.findUnique({ where: { id }, select: { status: true } });
      if (!currentOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      const VALID_TRANSITIONS: Record<string, string[]> = {
        NEW: ["CONFIRMED", "CANCELLED", "ON_HOLD"], CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED", "ON_HOLD"],
        PROCESSING: ["SHIPPED", "CANCELLED", "ON_HOLD"], SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "ON_HOLD"],
        OUT_FOR_DELIVERY: ["DELIVERED"], ON_HOLD: ["CONFIRMED", "PROCESSING", "CANCELLED"], PAYMENT_FAILED: ["NEW"], DELIVERED: ["REFUNDED"], CANCELLED: [], REFUNDED: [],
      };
      if (!(VALID_TRANSITIONS[currentOrder.status] || []).includes(body.status)) {
        return NextResponse.json({ error: `Cannot transition from ${currentOrder.status} to ${body.status}` }, { status: 400 });
      }
      updates.status = body.status;
      if (body.status === "DELIVERED") updates.deliveredAt = new Date();
      await db.orderStatusHistory.create({ data: { orderId: id, status: body.status, note: body.note || null } });
    }
    if (body.trackingNumber !== undefined) updates.trackingNumber = body.trackingNumber || null;
    if (body.adminNotes !== undefined) updates.adminNotes = body.adminNotes || null;
    if (body.deliveredAt) updates.deliveredAt = new Date(body.deliveredAt);
    const order = await db.order.update({ where: { id }, data: updates });
    await logAdminAction({ action: "UPDATE", entity: "ORDER", entityId: id, details: { changes: updates, note: body.note || null }, request });
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Admin order update error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrderManager();
  if (authResult.error) return authResult.error;
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === "confirm") {
      const order = await db.order.findUnique({ where: { id } });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (order.status !== "NEW") return NextResponse.json({ error: "Order is not in NEW status" }, { status: 400 });
      await db.order.update({ where: { id }, data: { status: "CONFIRMED" } });
      await db.orderStatusHistory.create({ data: { orderId: id, status: "CONFIRMED", note: "Order confirmed by staff" } });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "CONFIRMED").catch(() => {}); }
      await logAdminAction({ action: "CONFIRM", entity: "ORDER", entityId: id, details: { note: body.note || null }, request });
      return NextResponse.json({ success: true, status: "CONFIRMED" });
    }

    if (body.action === "confirm_payment") {
      const order = await db.order.findUnique({ where: { id }, select: { status: true, paymentMethod: true, paymentStatus: true, paymentId: true } });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (order.paymentMethod === "RAZORPAY" && !order.paymentId) return NextResponse.json({ error: "Razorpay orders must be verified through payment verification, not manually" }, { status: 400 });
      if (order.paymentStatus === "COMPLETED") return NextResponse.json({ error: "Payment already confirmed" }, { status: 400 });
      if (!body.note || typeof body.note !== "string" || body.note.trim().length < 3) return NextResponse.json({ error: "Staff note required for manual payment confirmation" }, { status: 400 });

      await db.$transaction(async (tx) => {
        const fresh = await tx.order.findUnique({ where: { id }, select: { status: true, paymentStatus: true, paymentMethod: true, paymentId: true } });
        if (!fresh) throw new Error("Order not found");
        if (fresh.paymentStatus === "COMPLETED") throw new Error("Payment already confirmed");
        if (fresh.paymentMethod === "RAZORPAY" && !fresh.paymentId) throw new Error("Razorpay payment must be API verified");
        await tx.order.update({ where: { id }, data: { paymentStatus: "COMPLETED", paymentVerified: true } });
        // OrderStatusHistory contains OrderStatus values, not PaymentStatus values.
        // Keep the order status unchanged and record the payment event in the note.
        await tx.orderStatusHistory.create({ data: { orderId: id, status: fresh.status, note: `PAYMENT_CONFIRMED: ${body.note.trim()}` } });
      });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "PAYMENT_CONFIRMED").catch(() => {}); }
      await logAdminAction({ action: "PAYMENT_CONFIRMED", entity: "ORDER", entityId: id, details: { note: body.note.trim() }, request });
      return NextResponse.json({ success: true, paymentStatus: "COMPLETED" });
    }

    if (body.action === "ship") {
      const order = await db.order.findUnique({ where: { id } });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (order.status !== "CONFIRMED" && order.status !== "PROCESSING") return NextResponse.json({ error: "Order must be CONFIRMED or PROCESSING first" }, { status: 400 });
      const updates: any = { status: "SHIPPED" };
      if (body.trackingNumber) updates.trackingNumber = String(body.trackingNumber).slice(0, 200);
      await db.order.update({ where: { id }, data: updates });
      await db.orderStatusHistory.create({ data: { orderId: id, status: "SHIPPED", note: body.note || "Shipped" } });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "SHIPPED").catch(() => {}); }
      await logAdminAction({ action: "SHIP", entity: "ORDER", entityId: id, details: { trackingNumber: body.trackingNumber || null, note: body.note || null }, request });
      return NextResponse.json({ success: true, status: "SHIPPED" });
    }

    if (body.action === "deliver") {
      const order = await db.order.findUnique({ where: { id } });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (order.status !== "SHIPPED" && order.status !== "OUT_FOR_DELIVERY") return NextResponse.json({ error: "Order must be SHIPPED or OUT_FOR_DELIVERY first" }, { status: 400 });
      await db.order.update({ where: { id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
      await db.orderStatusHistory.create({ data: { orderId: id, status: "DELIVERED", note: body.note || "Delivered" } });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "DELIVERED").catch(() => {}); }
      await logAdminAction({ action: "DELIVER", entity: "ORDER", entityId: id, details: { note: body.note || null }, request });
      return NextResponse.json({ success: true, status: "DELIVERED" });
    }

    if (body.action === "cancel") {
      const order = await db.order.findUnique({ where: { id }, select: { status: true } });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status)) return NextResponse.json({ error: `Cannot cancel ${order.status} order` }, { status: 400 });
      await db.order.update({ where: { id }, data: { status: "CANCELLED" } });
      await db.orderStatusHistory.create({ data: { orderId: id, status: "CANCELLED", note: body.note || "Cancelled by staff" } });
      { const o = await db.order.findUnique({ where: { id }, select: { orderNumber: true } }); if (o) notifyOrderStatusChange(id, o.orderNumber, "CANCELLED").catch(() => {}); }
      await logAdminAction({ action: "CANCEL", entity: "ORDER", entityId: id, details: { note: body.note || null }, request });
      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin order quick action error:", error);
    return NextResponse.json({ error: error?.message === "Payment already confirmed" ? error.message : "Failed to perform action" }, { status: error?.message === "Payment already confirmed" ? 400 : 500 });
  }
}
