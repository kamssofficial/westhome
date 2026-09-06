import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/apiAuth";

// GET /api/admin/audit?page=1&limit=25&entity=PRODUCT&action=DELETE
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const entity = searchParams.get("entity") || "";
    const action = searchParams.get("action") || "";

    const where: any = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    // Resolve actor names in one query
    const userIds = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean))) as string[];
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, role: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const enriched = logs.map((l) => ({
      ...l,
      actor: l.userId ? userMap.get(l.userId) ?? null : null,
    }));

    return NextResponse.json({ logs: enriched, total, page, limit });
  } catch (error) {
    console.error("Audit log list error:", error);
    return NextResponse.json({ logs: [], total: 0, page: 1, limit: 25 });
  }
}