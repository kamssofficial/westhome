import { NextRequest, NextResponse } from "next/server";
import { requireOrderManager, requireStaff } from "@/lib/apiAuth";
import db from "@/lib/db";
import { notifyOrderStatusChange } from "@/lib/notifications";

const ORDER_STATUSES = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED", "PAYMENT_FAILED", "ON_HOLD"] as const;

function serializeOrder(order: any) {
  return {
    ...order,
    subtotal: Number(order.subtotal), discount: Number(order.discount), deliveryCharge: Number(order.deliveryCharge), tax: Number(order.tax), total: Number(order.total),
    items: order.items.map((item: any) => ({ ...item, unitPrice: Number(item.unitPrice), salePrice: item.salePrice === null ? null : Number(item.salePrice), totalPrice: Number(item.totalPrice) })),
    statusHistory: order.statusHistory?.map((history: any) => ({ ...history, createdAt: history.createdAt.toISOString() })),
    createdAt: order.createdAt.toISOString(),
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireStaff();
  if (authResult.error) return authResult.error;
  try {
    const { id } = await params;
    const order = await db.order.findUnique({ where: { id }, include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ order: serializeOrder(order) });
  } catch (error) {
    console.error("Order detail API error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrderManager();
  if (authResult.error) return authResult.error;
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    const status = body.status as string | undefined;
    if (status !== undefined && !ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    if (status) updates.status = status;
    if (body.trackingNumber !== undefined) updates.trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim().slice(0, 200) || null : null;
    if (body.adminNotes !== undefined) updates.adminNotes = typeof body.adminNotes === "string" ? body.adminNotes.slice(0, 5000) || null : null;
    if (body.deliveredAt !== undefined) {
      const deliveredAt = new Date(body.deliveredAt);
      if (Number.isNaN(deliveredAt.getTime())) return NextResponse.json({ error: "Invalid deliveredAt" }, { status: 400 });
      updates.deliveredAt = deliveredAt;
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No valid updates supplied" }, { status: 400 });

    const order = await db.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id }, select: { id: true, orderNumber: true, status: true } });
      if (!existing) throw new Error("ORDER_NOT_FOUND");
      return tx.order.update({ where: { id }, data: { ...updates, ...(status ? { statusHistory: { create: { status: status as any, note: typeof body.note === "string" ? body.note.slice(0, 1000) : null } } } : {}) } });
    });

    if (status) notifyOrderStatusChange(order.id, order.orderNumber, status).catch((error) => console.error("Order notification failed", error));
    return NextResponse.json({ order: serializeOrder(order) });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found" }, { status: 404 });
    console.error("Order PATCH error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
