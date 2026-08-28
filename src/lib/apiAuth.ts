import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";

type AuthResult =
  | { session: any; error?: never }
  | { session?: never; error: NextResponse };

const STAFF_ROLES = ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"] as const;

async function getLiveSession() {
  const session = await auth();
  const sessionUser = session?.user as ({ id?: string } & Record<string, any>) | undefined;
  if (!sessionUser?.id) return null;

  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, name: true, role: true, permissions: true, isActive: true },
  });
  if (!user?.isActive) return null;

  return {
    ...session,
    user: { ...sessionUser, id: user.id, email: user.email, name: user.name || "", role: user.role, permissions: user.permissions || "[]" },
  };
}

export async function requireAuthRole(allowedRoles: readonly string[]): Promise<AuthResult> {
  const session = await getLiveSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  if (!allowedRoles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function requireAdmin() {
  return requireAuthRole(["ADMIN"]);
}

export async function requireAdminOrManager() {
  return requireAuthRole(["ADMIN", "MANAGER"]);
}

export async function requireOrderManager() {
  return requireAuthRole(["ADMIN", "MANAGER", "ORDER_MANAGER"]);
}

export async function requirePermission(permission: string): Promise<AuthResult> {
  const session = await getLiveSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  if (session.user.role === "ADMIN" || session.user.role === "MANAGER") return { session };

  try {
    const permissions = typeof session.user.permissions === "string" ? JSON.parse(session.user.permissions) : session.user.permissions;
    if (Array.isArray(permissions) && permissions.includes(permission)) return { session };
  } catch (error) {
    console.error("Invalid stored permissions", error);
  }

  return { error: NextResponse.json({ error: "Forbidden: Missing permission" }, { status: 403 }) };
}

export async function requireStaff() {
  return requireAuthRole(STAFF_ROLES);
}

export function getSessionUserId(session: any): string {
  return session.user.id as string;
}

export function isStaffRole(role: unknown): boolean {
  return typeof role === "string" && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}

export async function getLiveAuthorizedUser() {
  const session = await getLiveSession();
  return session?.user ?? null;
}

export { STAFF_ROLES };

export type { AuthResult };

export default requireAuthRole;
