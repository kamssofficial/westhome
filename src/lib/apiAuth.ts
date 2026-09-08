import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Verify the current user is authenticated, active, and has the required role.
 * Role/active status is re-read from the database so deactivated users and role
 * changes take effect immediately instead of waiting for JWT expiry.
 */
export async function requireAuthRole(
  allowedRoles: string[]
): Promise<
  | { session: any; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    select: { id: true, email: true, name: true, role: true, permissions: true, isActive: true },
  });

  if (!user || user.isActive === false) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!allowedRoles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    session: {
      ...session,
      user: { ...session.user, ...user },
    },
  };
}

/** Shorthand: require ADMIN role */
export async function requireAdmin() {
  return requireAuthRole(["ADMIN"]);
}

/** Shorthand: require ADMIN or MANAGER */
export async function requireAdminOrManager() {
  return requireAuthRole(["ADMIN", "MANAGER"]);
}

/** Shorthand: require ADMIN, MANAGER, or ORDER_MANAGER */
export async function requireOrderManager() {
  return requireAuthRole(["ADMIN", "MANAGER", "ORDER_MANAGER"]);
}

/** Check if the current user has a specific permission */
export async function requirePermission(permission: string): Promise<
  | { session: any; error?: never }
  | { session?: never; error: NextResponse }
> {
  const authResult = await requireAuthRole([
    "ADMIN",
    "MANAGER",
    "ORDER_MANAGER",
    "PRODUCT_MANAGER",
    "CONTENT_MANAGER",
    "STAFF",
  ]);
  if (authResult.error) return authResult;

  const session = authResult.session;
  const role = session.user.role as string;
  const permissionsStr = session.user.permissions || "[]";

  if (role === "ADMIN" || role === "MANAGER") {
    return { session };
  }

  try {
    const permissions = JSON.parse(permissionsStr);
    if (Array.isArray(permissions) && permissions.includes(permission)) {
      return { session };
    }
  } catch {
    // Invalid permission JSON is treated as no permissions.
  }

  return {
    error: NextResponse.json({ error: "Forbidden: Missing permission" }, { status: 403 }),
  };
}

/** Check if the user is staff (any non-customer role) */
export async function requireStaff() {
  return requireAuthRole([
    "ADMIN",
    "MANAGER",
    "ORDER_MANAGER",
    "PRODUCT_MANAGER",
    "CONTENT_MANAGER",
    "STAFF",
  ]);
}
