import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
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
    return NextResponse.json({ customers: [] });
  }
}
