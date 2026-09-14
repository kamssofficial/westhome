import { NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * GET /api/admin/products/health
 *
 * Public-ish health-check endpoint (no auth required) that returns a
 * JSON report of product visibility.  Designed for uptime monitors,
 * CI pipelines, or manual spot-checks.
 *
 * Response shape:
 * {
 *   ok: boolean,                // true when all products are visible
 *   total: number,
 *   visible: number,
 *   hidden: number,
 *   hiddenBreakdown: { draft, inactive, activeButDisabled, archived },
 *   timestamp: string
 * }
 */
export async function GET() {
  try {
    const [total, visible, draft, inactive, activeButDisabled, archived] =
      await Promise.all([
        db.product.count(),
        db.product.count({ where: { status: "ACTIVE", isActive: true } }),
        db.product.count({
          where: { OR: [{ status: "DRAFT" }], isActive: true },
        }),
        db.product.count({
          where: { OR: [{ status: "INACTIVE" }], isActive: true },
        }),
        db.product.count({ where: { status: "ACTIVE", isActive: false } }),
        db.product.count({ where: { status: "ARCHIVED" } }),
      ]);

    const hidden = total - visible;

    return NextResponse.json(
      {
        ok: hidden === 0,
        total,
        visible,
        hidden,
        hiddenBreakdown: {
          draft,
          inactive,
          activeButDisabled,
          archived,
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: hidden === 0 ? 200 : 200, // always 200 — consumers check `ok`
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Product health check failed:", error);
    return NextResponse.json(
      { ok: false, error: "Health check failed" },
      { status: 500 }
    );
  }
}
