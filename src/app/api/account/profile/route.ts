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
    
    // Verify password if provided
    if (body.password) {
      const bcrypt = require("bcryptjs");
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const isValid = await bcrypt.compare(body.password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
      }
    }

    // Anonymize user data instead of hard delete to preserve order history
    const timestamp = Date.now();
    await db.user.update({
      where: { id: userId },
      data: {
        name: "Deleted Customer",
        email: "deleted_" + timestamp + "@deleted.local",
        phone: null,
        passwordHash: "DELETED",
        isActive: false,
      },
    });

    // Delete related data
    await db.wishlist.deleteMany({ where: { userId } });
    await db.recentlyViewed.deleteMany({ where: { userId } });
    await db.address.deleteMany({ where: { userId } });

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}