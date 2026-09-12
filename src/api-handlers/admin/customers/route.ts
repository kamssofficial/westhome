import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdminOrManager } from "@/lib/apiAuth";

export async function GET() {
  const authResult = await requireAdminOrManager();
  if (authResult.error) return authResult.error;

  try {
    const customers = await db.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      customers: customers.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        orders: c._count.orders,
      })),
    });
  } catch (error) {
    console.error("Customers API error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
