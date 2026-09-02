import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/apiAuth";

// GET /api/admin/staff/[id] — Get staff member details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ staff: user });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch staff member" }, { status: 500 });
  }
}

// PUT /api/admin/staff/[id] — Update staff member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, role, password, isActive, permissions } = body;

    // Find existing user
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Validate role
    const validRoles = ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check email uniqueness if changed
    if (email && email !== existing.email) {
      const emailTaken = await db.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "USER",
        entityId: id,
        details: { changes: updateData },
      },
    });

    return NextResponse.json({ staff: updated });
  } catch (error) {
    console.error("Staff update error:", error);
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}

// DELETE /api/admin/staff/[id] — Deactivate staff member (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Prevent deleting the last admin
    if (existing.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN", isActive: true } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate the last admin account" },
          { status: 400 }
        );
      }
    }

    // Soft delete - set isActive to false
    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        action: "DEACTIVATE",
        entity: "USER",
        entityId: id,
        details: { email: existing.email },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff delete error:", error);
    return NextResponse.json({ error: "Failed to deactivate staff member" }, { status: 500 });
  }
}
