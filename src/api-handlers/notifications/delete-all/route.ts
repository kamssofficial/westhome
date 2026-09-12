import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireStaff } from "@/lib/apiAuth";

export async function DELETE() {
  const authResult = await requireStaff();
  if (authResult.error) return authResult.error;
  const userId = (authResult.session.user as any).id as string;
  try {
    const all = await db.notification.findMany({ select: { id: true, deletedBy: true } });
    let deleted = 0;
    for (const n of all) {
      let arr: string[] = [];
      try { const parsed = JSON.parse(n.deletedBy || "[]"); if (Array.isArray(parsed)) arr = parsed.filter(v => typeof v === "string"); } catch {}
      if (!arr.includes(userId)) {
        arr.push(userId);
        await db.notification.update({ where: { id: n.id }, data: { deletedBy: JSON.stringify(arr) } as any });
        deleted++;
      }
    }
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Delete all notifications error:", error);
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }
}
