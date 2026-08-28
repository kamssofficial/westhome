import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireStaff } from "@/lib/apiAuth";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireStaff();
  if (authResult.error) return authResult.error;
  const userId = (authResult.session.user as any).id as string;
  const { id } = await params;
  try {
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    let readByArray: string[] = [];
    try { const parsed = JSON.parse(notification.readBy || "[]"); if (Array.isArray(parsed)) readByArray = parsed.filter(v => typeof v === "string"); } catch {}
    if (!readByArray.includes(userId)) {
      await db.notification.update({ where: { id }, data: { readBy: JSON.stringify([...readByArray, userId]) } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireStaff();
  if (authResult.error) return authResult.error;
  const userId = (authResult.session.user as any).id as string;
  const { id } = await params;
  try {
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    let deletedByArray: string[] = [];
    try { const parsed = JSON.parse(notification.deletedBy || "[]"); if (Array.isArray(parsed)) deletedByArray = parsed.filter(v => typeof v === "string"); } catch {}
    if (!deletedByArray.includes(userId)) {
      await db.notification.update({ where: { id }, data: { deletedBy: JSON.stringify([...deletedByArray, userId]) } as any });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
