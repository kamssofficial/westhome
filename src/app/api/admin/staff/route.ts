import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

const staffCreationAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_STAFF_CREATION = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkStaffRateLimit(adminId: string): boolean {
  const now = Date.now();
  const record = staffCreationAttempts.get(adminId);
  if (!record || now > record.resetAt) {
    staffCreationAttempts.set(adminId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_STAFF_CREATION) return false;
  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").slice(0, 100);
    const role = searchParams.get("role") || "";
    const STAFF_ROLES = ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"];
    const where: any = { role: { in: STAFF_ROLES } };
    if (query) where.OR = [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }];
    if (role && STAFF_ROLES.includes(role)) where.role = role;

    const staff = await db.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, role: true, permissions: true, isActive: true, createdAt: true, updatedAt: true, _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Staff list error:", error);
    return NextResponse.json({ staff: [] });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  const adminId = authResult.session.user.id;
  if (!checkStaffRateLimit(adminId)) {
    return NextResponse.json({ error: "Too many staff creation attempts. Try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const role = typeof body.role === "string" ? body.role : "MANAGER";
    const permissions = Array.isArray(body.permissions) ? body.permissions.slice(0, 100) : [];
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name || !email || !password) return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    if (name.length > 100 || email.length > 254 || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Invalid staff account fields" }, { status: 400 });
    }

    const validRoles = ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"];
    if (!validRoles.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { name, email, passwordHash, phone: phone || null, role, permissions: JSON.stringify(permissions), isActive },
      select: { id: true, name: true, email: true, phone: true, role: true, permissions: true, isActive: true, createdAt: true },
    });

    await logAdminAction({ action: "CREATE", entity: "USER", entityId: user.id, details: { name: user.name, email: user.email, role: user.role }, request });
    return NextResponse.json({ staff: user }, { status: 201 });
  } catch (error) {
    console.error("Staff create error:", error);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
