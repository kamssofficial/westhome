import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const addresses = await db.address.findMany({
      where: { userId: (session.user as any).id },
      orderBy: [{ isDefault: "desc" }],
    });

    return NextResponse.json({ addresses });
  } catch {
    return NextResponse.json({ addresses: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

    // If first address, make it default
    const existingCount = await db.address.count({ where: { userId } });

    const address = await db.address.create({
      data: {
        userId,
        name: body.name,
        phone: body.phone,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 || null,
        city: body.city,
        state: body.state,
        pinCode: body.pinCode,
        country: body.country || "India",
        isDefault: existingCount === 0,
      },
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add address" }, { status: 500 });
  }
}
