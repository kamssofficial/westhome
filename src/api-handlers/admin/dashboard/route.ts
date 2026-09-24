import { NextRequest, NextResponse } from "next/server";
import { requireAuthRole } from "@/lib/apiAuth";
import { loadDashboardData } from "@/lib/dashboardData";
import { memo, DASHBOARD_TTL_MS, NS } from "@/lib/memoCache";

/**
 * GET /api/admin/dashboard?range=<today|yesterday|7d|30d|90d|thisMonth|lastMonth>
 *
 * Auth lives here; the queries live in the loader. Role list mirrors the
 * per-page matrix in middleware.ts.
 *
 * The loader issues ~45 reads, and the client re-polls every 20s, so the result
 * is held in the shared memo cache. `?force=1` (the refresh button) bypasses it
 * so an explicit user action always sees fresh numbers. The response is marked
 * `no-store` because it is admin-only and must never sit in a shared cache.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  const params = new URL(request.url).searchParams;
  const range = params.get("range") || "30d";
  const force = params.get("force") === "1";

  try {
    const data = force
      ? await loadDashboardData(range)
      : await memo(`${NS.dashboard}:${range}`, DASHBOARD_TTL_MS, () => loadDashboardData(range));

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
