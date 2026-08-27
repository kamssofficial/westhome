import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

// PATCH — mark as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { id } = await params;

  try {
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const readByArray: string[] = JSON.parse(notification.readBy || "[]");
    if (!readByArray.includes(userId)) {
      readByArray.push(userId);
      await db.notification.update({
        where: { id },
        data: { readBy: JSON.stringify(readByArray) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

// DELETE — soft delete for current user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { id } = await params;

  try {
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Try to use deletedBy field
    try {
      const deletedByArray: string[] = JSON.parse((notification as any).deletedBy || "[]");
      if (!deletedByArray.includes(userId)) {
        deletedByArray.push(userId);
        await db.notification.update({
          where: { id },
          data: { deletedBy: JSON.stringify(deletedByArray) } as any,
        });
      }
    } catch {
      // deletedBy column doesn't exist yet — hard delete as fallback
      await db.notification.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
