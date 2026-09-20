import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import { loadDashboardData } from "@/lib/dashboardData";

/**
 * GET /api/admin/dashboard?range=<today|yesterday|7d|30d|90d|thisMonth|lastMonth>
 *
 * Auth lives here; the queries live in the loader. Role list mirrors the
 * per-page matrix in middleware.ts.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  const range = new URL(request.url).searchParams.get("range") || "30d";

  try {
    return NextResponse.json(await loadDashboardData(range));
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
