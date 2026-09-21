import crypto from "crypto";

/**
 * Guest order access: signed, stateless "claim tokens".
 *
 * Guests have no account, so payment authorization and order lookup cannot use
 * a session. Instead, the server mints an HMAC token when an order is created
 * anonymously and returns it exactly once in the create-order response. The
 * browser holds it only for this checkout session and presents it to
 * /api/payment/* and /api/orders/track, where the server recomputes the HMAC
 * over the order id and compares in constant time.
 *
 * There is deliberately no token table: the token is derivable from the order
 * id, so it cannot get out of sync with the database, and it becomes useless
 * the moment the order is claimed because it is bound to that single order id.
 * If the secret is not configured the helper refuses to mint/accept tokens,
 * which disables guest payment rather than weakening it.
 */

function getSecret(): string | null {
  const secret = process.env.GUEST_ORDER_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

export function isGuestClaimEnabled(): boolean {
  return getSecret() !== null;
}

/**
 * Mint the claim token for an order. Must only be called in the order-creation
 * response path so the token is delivered to the shopper exactly once.
 */
export function mintGuestClaimToken(orderId: string): string | null {
  const secret = getSecret();
  if (!secret || !orderId) return null;
  const sig = crypto.createHmac("sha256", secret).update(`guest-order:${orderId}`).digest("base64url");
  return `${orderId}.${sig}`;
}

/** True when the presented token is valid for this order id. */
export function verifyGuestClaimToken(orderId: string, token: string | null | undefined): boolean {
  const secret = getSecret();
  if (!secret || !orderId || !token) return false;
  const expected = crypto.createHmac("sha256", secret).update(`guest-order:${orderId}`).digest("base64url");
  const given = token.startsWith(`${orderId}.`) ? token.slice(orderId.length + 1) : "";
  if (!given) return false;
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
