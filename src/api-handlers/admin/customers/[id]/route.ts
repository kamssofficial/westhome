import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdminOrManager } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminOrManager();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    const customer = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: { isDefault: "desc" },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            subtotal: true,
            discount: true,
            deliveryCharge: true,
            paymentMethod: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            pinCode: true,
            deliveryMethod: true,
            trackingNumber: true,
            createdAt: true,
            deliveredAt: true,
            items: {
              select: {
                id: true,
                productName: true,
                variantName: true,
                quantity: true,
                unitPrice: true,
                salePrice: true,
                totalPrice: true,
                image: true,
              },
            },
            statusHistory: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { orders: true, reviews: true, addresses: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // SECURITY: Only expose CUSTOMER role users through this endpoint
    if (customer.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Calculate stats
    const totalSpent = customer.orders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );
    const deliveredOrders = customer.orders.filter(
      (o) => o.status === "DELIVERED"
    ).length;

    return NextResponse.json({
      customer: {
        ...customer,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        orders: customer.orders.map((o) => ({
          ...o,
          total: Number(o.total),
          subtotal: Number(o.subtotal),
          discount: Number(o.discount),
          deliveryCharge: Number(o.deliveryCharge),
          createdAt: o.createdAt.toISOString(),
          deliveredAt: o.deliveredAt?.toISOString() || null,
          items: o.items.map((i) => ({
            ...i,
            unitPrice: Number(i.unitPrice),
            salePrice: i.salePrice ? Number(i.salePrice) : null,
            totalPrice: Number(i.totalPrice),
          })),
          statusHistory: o.statusHistory.map((h) => ({
            ...h,
            createdAt: h.createdAt.toISOString(),
          })),
        })),
        addresses: customer.addresses.map((a) => ({
          ...a,
          createdAt: undefined,
        })),
        stats: {
          totalOrders: customer._count.orders,
          totalReviews: customer._count.reviews,
          totalAddresses: customer._count.addresses,
          totalSpent,
          deliveredOrders,
          avgOrderValue:
            customer.orders.length > 0
              ? Math.round(totalSpent / customer.orders.length)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("Customer detail API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminOrManager();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();

    // SECURITY: Strict allowlist — only these fields can be updated
    const ALLOWED_FIELDS = ["name", "email", "phone", "isActive"] as const;
    const updates: Record<string, any> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        // SECURITY: Use explicit null check to preserve false values
        updates[field] = body[field] === null ? null : body[field];
      }
    }

    // Check email uniqueness if changing
    if (updates.email) {
      const existing = await db.user.findFirst({
        where: { email: updates.email, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    const customer = await db.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      customer: {
        ...customer,
        updatedAt: customer.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Customer update API error:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminOrManager();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Prevent deleting admin/staff accounts through customer endpoint
    if (existing.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Use staff management to manage non-customer accounts" },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    const session = await (await import("@/lib/auth")).auth();
    if (session?.user && (session.user as any).id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account from here" },
        { status: 400 }
      );
    }

    // Hard delete. Orders keep their history — they store customer info
    // denormalized (customerName/customerEmail/customerPhone), so the user row
    // is detached (userId -> null) and the order becomes guest-like.
    await db.$transaction(async (tx) => {
      // Relations without onDelete: Cascade must be removed explicitly
      await tx.review.deleteMany({ where: { userId: id } });
      await tx.couponUsage.deleteMany({ where: { userId: id } });

      // Detach orders so purchase history survives (userId is nullable)
      await tx.order.updateMany({ where: { userId: id }, data: { userId: null } });

      // Detach analytics events (userId is nullable)
      await tx.analyticsEvent.updateMany({ where: { userId: id }, data: { userId: null } });

      // Addresses, wishlist, recentlyViewed cascade automatically with the user
      await tx.user.delete({ where: { id } });
    });

    // Log the action
    await logAdminAction({
      action: "DELETE",
      entity: "USER",
      entityId: id,
      details: { email: existing.email, hardDeleted: true },
      request,
    });

    return NextResponse.json({ message: "Customer deleted permanently" });
  } catch (error) {
    console.error("Customer delete API error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
