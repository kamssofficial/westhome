import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/apiAuth";

// SECURITY: Simple in-memory rate limiter for staff creation
const staffCreationAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_STAFF_CREATION = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkStaffRateLimit(adminId: string): boolean {
  const now = Date.now();
  const record = staffCreationAttempts.get(adminId);
  if (!record || now > record.resetAt) {
    staffCreationAttempts.set(adminId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_STAFF_CREATION) {
    return false;
  }
  record.count++;
  return true;
}

// GET /api/admin/staff — List all staff members
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const role = searchParams.get("role") || "";

    // SECURITY: Only return staff/admin roles, NEVER customers
    const STAFF_ROLES = ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"];
    const where: any = { role: { in: STAFF_ROLES } };
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const staff = await db.user.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Staff list error:", error);
    return NextResponse.json({ staff: [] });
  }
}

// POST /api/admin/staff — Create a new staff member
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { name, email, password, phone, role, permissions, isActive } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate role — never allow CUSTOMER or ADMIN creation through this endpoint
    const validRoles = ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null,
        role: role || "MANAGER",
        permissions: JSON.stringify(permissions || []),
        isActive: isActive !== undefined ? isActive : true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log the action
    await db.auditLog.create({
      data: {
        action: "CREATE",
        entity: "USER",
        entityId: user.id,
        details: { name: user.name, email: user.email, role: user.role },
      },
    });

    return NextResponse.json({ staff: user }, { status: 201 });
  } catch (error) {
    console.error("Staff create error:", error);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
