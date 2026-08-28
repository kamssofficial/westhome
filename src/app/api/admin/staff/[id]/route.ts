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

    if (!user || user.role === "CUSTOMER") {
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
    if (!existing || existing.role === "CUSTOMER") {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Validate role
    const validRoles = ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"];
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

// DELETE /api/admin/staff/[id] — Deactivate (soft) or permanently delete staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing || existing.role === "CUSTOMER") {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const isSeededTestAdmin = existing.email.toLowerCase() === "sanoojbm1144@gmail.com";
    // Protect the last real admin. The known seeded test admin may be permanently removed only if
    // another active staff account can be promoted atomically, so the store is never left unmanaged.
    if (existing.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN", isActive: true } });
      if (adminCount <= 1 && !(permanent && isSeededTestAdmin)) {
        return NextResponse.json({ error: "Cannot delete the last admin account" }, { status: 400 });
      }
    }

    // Prevent self-deletion
    if (authResult.session.user.id === id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    if (permanent) {
      // Permanent deletion: remove personal data and dependent records atomically while preserving historical order rows.
      await db.$transaction(async (tx) => {
        if (existing.role === "ADMIN" && isSeededTestAdmin) {
          const replacementAdmin = await tx.user.findFirst({
            where: { id: { not: id }, isActive: true, role: { in: ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"] } },
            orderBy: { createdAt: "asc" },
            select: { id: true, email: true },
          });
          if (!replacementAdmin) throw new Error("Cannot remove the test admin because no active staff account can replace it");
          await tx.user.update({ where: { id: replacementAdmin.id }, data: { role: "ADMIN" } });
          await tx.auditLog.create({ data: { action: "UPDATE", entity: "USER", entityId: replacementAdmin.id, details: { reason: "Promoted while removing seeded test admin", email: replacementAdmin.email } } });
        }
        await tx.auditLog.create({ data: { action: "DELETE", entity: "USER", entityId: id, details: { email: existing.email, name: existing.name, role: existing.role, permanent: true } } });
        await tx.order.updateMany({ where: { userId: id }, data: { userId: null, customerName: "Deleted Staff", customerEmail: "deleted@westhome.invalid", customerPhone: "DELETED" } });
        await tx.wishlist.deleteMany({ where: { userId: id } });
        await tx.recentlyViewed.deleteMany({ where: { userId: id } });
        await tx.address.deleteMany({ where: { userId: id } });
        await tx.review.deleteMany({ where: { userId: id } });
        await tx.couponUsage.deleteMany({ where: { userId: id } });
        await tx.analyticsEvent.updateMany({ where: { userId: id }, data: { userId: null } });
        await tx.liveSession.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
      });


      return NextResponse.json({ success: true, permanent: true });
    } else {
      // Soft delete — deactivate
      await db.user.update({ where: { id }, data: { isActive: false } });

      await db.auditLog.create({
        data: {
          action: "DEACTIVATE",
          entity: "USER",
          entityId: id,
          details: { email: existing.email },
        },
      });

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Staff delete error:", error);
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}
