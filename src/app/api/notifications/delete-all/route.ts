import { NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  try {
    const all = await db.notification.findMany({
      select: { id: true },
    });

    let updated = 0;
    for (const n of all) {
      try {
        const full = await db.notification.findUnique({ where: { id: n.id } });
        if (!full) continue;
        const deletedByArr: string[] = JSON.parse((full as any).deletedBy || "[]");
        if (!deletedByArr.includes(userId)) {
          deletedByArr.push(userId);
          await db.notification.update({
            where: { id: n.id },
            data: { deletedBy: JSON.stringify(deletedByArr) } as any,
          });
          updated++;
        }
      } catch {
        // deletedBy column doesn't exist yet — try hard delete as last resort
        try { await db.notification.delete({ where: { id: n.id } }); updated++; } catch {}
      }
    }

    return NextResponse.json({ success: true, deleted: updated });
  } catch (error) {
    console.error("Delete all notifications error:", error);
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }
}
