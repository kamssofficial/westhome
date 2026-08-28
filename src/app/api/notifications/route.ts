import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireStaff } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  const authResult = await requireStaff();
  if (authResult.error) return authResult.error;
  const userId = (authResult.session.user as any).id as string;
  const { searchParams } = new URL(request.url);
  const parsedLimit = Number.parseInt(searchParams.get("limit") || "30", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 30;
  const unreadOnly = searchParams.get("unread") === "true";

  try {
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const result = notifications.map((n) => {
      let isRead = false;
      let isDeleted = false;
      try {
        const readByArr: string[] = JSON.parse(n.readBy || "[]");
        isRead = readByArr.includes(userId);
      } catch {}
      try {
        const deletedByArr: string[] = JSON.parse((n as any).deletedBy || "[]");
        isDeleted = deletedByArr.includes(userId);
      } catch {}
      return { id: n.id, type: n.type, title: n.title, message: n.message, orderId: n.orderId, isRead, isDeleted, createdAt: n.createdAt.toISOString() };
    }).filter(n => !n.isDeleted);

    const filtered = unreadOnly ? result.filter(n => !n.isRead) : result;
    return NextResponse.json({ notifications: filtered, unreadCount: result.filter(n => !n.isRead).length });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
