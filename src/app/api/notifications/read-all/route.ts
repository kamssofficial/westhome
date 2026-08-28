import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireStaff } from "@/lib/apiAuth";

export async function PATCH() {
  const authResult = await requireStaff();
  if (authResult.error) return authResult.error;
  const userId = (authResult.session.user as any).id as string;
  try {
    const unread = await db.notification.findMany({ where: { NOT: { readBy: { contains: userId } } }, select: { id: true, readBy: true } });
    let marked = 0;
    for (const n of unread) {
      let arr: string[] = [];
      try { const parsed = JSON.parse(n.readBy || "[]"); if (Array.isArray(parsed)) arr = parsed.filter(v => typeof v === "string"); } catch {}
      if (!arr.includes(userId)) { arr.push(userId); await db.notification.update({ where: { id: n.id }, data: { readBy: JSON.stringify(arr) } }); marked++; }
    }
    return NextResponse.json({ success: true, marked });
  } catch (error) {
    console.error("Mark all read error:", error);
    return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 });
  }
}
