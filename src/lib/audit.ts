import { auth } from "@/lib/auth";
import db from "@/lib/db";

/**
 * Best-effort admin audit logging.
 *
 * Audit writes must NEVER break the primary operation they accompany —
 * a logging failure (missing table, DB hiccup) is swallowed and reported
 * to the server console only, so callers can `await` it inline without
 * wrapping it in their own try/catch.
 */
export async function logAdminAction(input: {
  action: string;
  entity: string;
  entityId?: string | null;
  details?: unknown;
  request?: Request;
}) {
  try {
    const session = await auth();
    const forwardedFor = input.request?.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || undefined;

    await db.auditLog.create({
      data: {
        userId: (session?.user as any)?.id ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        details:
          input.details === undefined
            ? undefined
            : (input.details as object),
        ipAddress,
      },
    });
  } catch (error) {
    console.error("Audit log write failed (action skipped):", error);
  }
}