import { NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  try {
    // Find all notifications not yet read by this user
    // Fetch all and filter in JS for exact userId match (avoids substring false-positives)
    const allNotifications = await db.notification.findMany({
      select: { id: true, readBy: true },
      take: 200,
    });
    const unread = allNotifications.filter((n) => {
      try {
        const arr: string[] = JSON.parse(n.readBy || "[]");
        return !arr.includes(userId);
      } catch { return true; }
    });

    // Update each to include this user's ID
    for (const n of unread) {
      let arr: string[] = [];
      try { arr = JSON.parse(n.readBy || "[]"); } catch { arr = []; }
      if (!arr.includes(userId)) {
        arr.push(userId);
        await db.notification.update({
          where: { id: n.id },
          data: { readBy: JSON.stringify(arr) },
        });
      }
    }

    return NextResponse.json({ success: true, marked: unread.length });
  } catch (error) {
    console.error("Mark all read error:", error);
    return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 });
  }
}
