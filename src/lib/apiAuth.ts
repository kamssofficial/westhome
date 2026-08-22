import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Verify the current user is authenticated and has the required role.
 * Returns the session or an error NextResponse.
 */
export async function requireAuthRole(
  allowedRoles: string[]
): Promise<
  | { session: any; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const role = (session.user as any).role as string;
  if (!allowedRoles.includes(role)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { session };
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
