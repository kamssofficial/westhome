import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.email !== undefined && body.email !== (session.user as any).email) {
      // Check email uniqueness
      const existing = await db.user.findUnique({ where: { email: body.email } });
      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
      updateData.email = body.email;
    }

    await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ message: "Profile updated" });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json().catch(() => ({}));
    
    // Require password confirmation for self-deletion
    if (!body.password) {
      return NextResponse.json({ error: "Password is required to delete your account" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify password
    const bcrypt = require("bcryptjs");
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    }

    // Check for pending orders
    const pendingOrders = await db.order.count({
      where: { userId, status: { in: ["NEW", "PROCESSING", "SHIPPED"] } },
    });
    if (pendingOrders > 0) {
      return NextResponse.json(
        { error: "Cannot delete account with pending orders. Please wait for them to complete." },
        { status: 400 }
      );
    }

    // Soft delete - deactivate account instead of hard delete (preserves order history)
    await db.user.update({
      where: { id: userId },
      data: { isActive: false, email: `deleted_${Date.now()}_${user.email}` },
    });

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Account delete error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
