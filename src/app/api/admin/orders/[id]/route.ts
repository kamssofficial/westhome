import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireOrderManager } from "@/lib/apiAuth";

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
