import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "30", 10);
  const unreadOnly = searchParams.get("unread") === "true";

  try {
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    const result = notifications
      .map((n) => {
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
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          orderId: n.orderId,
          isRead,
          isDeleted,
          createdAt: n.createdAt.toISOString(),
        };
      })
      .filter((n) => !n.isDeleted);

    const filtered = unreadOnly ? result.filter((n) => !n.isRead) : result;
    const unreadCount = result.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications: filtered, unreadCount });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}
