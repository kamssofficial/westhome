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
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const unreadOnly = searchParams.get("unread") === "true";
  const role = (session.user as any).role as string;
  const isStaff = role === "ADMIN" || role === "MANAGER" || role === "ORDER_MANAGER" || role === "PRODUCT_MANAGER" || role === "CONTENT_MANAGER" || role === "STAFF";

  try {
    // Customers only see notifications related to their own orders;
    // Staff see all notifications
    const where: any = isStaff ? {} : {
      orderId: {
        in: (await db.order.findMany({ where: { userId }, select: { id: true } })).map(o => o.id),
      },
    };
    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        orderId: true,
        readBy: true,
        createdAt: true,
      },
    });

    const filtered = notifications.map((n) => {
      let isRead = false;
      try {
        const readByArray: string[] = JSON.parse(n.readBy || "[]");
        isRead = readByArray.includes(userId);
      } catch {
        // readBy column may not exist yet — treat all as unread
        isRead = false;
      }
      return {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        orderId: n.orderId,
        isRead,
        createdAt: n.createdAt.toISOString(),
      };
    });

    const result = unreadOnly ? filtered.filter((n) => !n.isRead) : filtered;
    const unreadCount = filtered.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications: result, unreadCount });
  } catch (error: any) {
    // If readBy column doesn't exist, fall back to legacy behavior
    if (error?.code === "P2022" || error?.message?.includes("readBy")) {
      try {
        const notifications = await db.notification.findMany({
          orderBy: { createdAt: "desc" },
          take: Math.min(limit, 50),
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            orderId: true,
            createdAt: true,
          },
        });

        const result = notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          orderId: n.orderId,
          isRead: false,
          createdAt: n.createdAt.toISOString(),
        }));

        return NextResponse.json({ notifications: result, unreadCount: result.length });
      } catch {}
    }

    console.error("Notifications fetch error:", error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}
