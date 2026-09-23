/**
 * Tests for src/lib/guestOrder.ts — the HMAC claim tokens that authorize guest
 * payment and guest order tracking without an account.
 *
 * Run: node --test tests/guest-order.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.GUEST_ORDER_SECRET = "test-secret-for-guest-order-claims-0123456789";

const { mintGuestClaimToken, verifyGuestClaimToken, isGuestClaimEnabled } = await import(
  "../src/lib/guestOrder.ts"
);

describe("guest claim tokens", () => {
  it("are enabled when a strong secret is configured", () => {
    assert.equal(isGuestClaimEnabled(), true);
  });

  it("mint then verify round-trips for the same order", () => {
    const token = mintGuestClaimToken("order_abc123");
    assert.ok(token, "token should be minted");
    assert.ok(token.startsWith("order_abc123."), "token is bound to the order id");
    assert.equal(verifyGuestClaimToken("order_abc123", token), true);
  });

  it("rejects a token presented for a different order", () => {
    const token = mintGuestClaimToken("order_abc123");
    assert.equal(verifyGuestClaimToken("order_other", token), false);
  });

  it("rejects tampered payloads", () => {
    const token = mintGuestClaimToken("order_abc123");
    const sig = token.slice("order_abc123.".length);
    assert.equal(verifyGuestClaimToken("order_abc123", `order_abc123.${sig}x`), false);
    assert.equal(verifyGuestClaimToken("order_abc123", `order_abc123.${sig.slice(0, -2)}AA`), false);
  });

  it("rejects garbage, empty, and missing tokens", () => {
    assert.equal(verifyGuestClaimToken("order_abc123", "garbage"), false);
    assert.equal(verifyGuestClaimToken("order_abc123", ""), false);
    assert.equal(verifyGuestClaimToken("order_abc123", null), false);
    assert.equal(verifyGuestClaimToken("order_abc123", undefined), false);
    assert.equal(verifyGuestClaimToken("", "whatever"), false);
  });

  it("tokens are deterministic for the same order (stateless verification)", () => {
    assert.equal(mintGuestClaimToken("order_x"), mintGuestClaimToken("order_x"));
  });

  it("different orders produce different tokens", () => {
    assert.notEqual(mintGuestClaimToken("order_a"), mintGuestClaimToken("order_b"));
  });
});

describe("guest claim tokens — secret governance", () => {
  it("refuse to mint or verify when no secret is configured", async () => {
    const saved = process.env.GUEST_ORDER_SECRET;
    const savedAuth = process.env.AUTH_SECRET;
    const savedNext = process.env.NEXTAUTH_SECRET;
    delete process.env.GUEST_ORDER_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    try {
      const fresh = await import(`../src/lib/guestOrder.ts?case=disabled&t=${Date.now()}`);
      assert.equal(fresh.isGuestClaimEnabled(), false);
      assert.equal(fresh.mintGuestClaimToken("order_abc"), null);
      assert.equal(fresh.verifyGuestClaimToken("order_abc", "order_abc.sig"), false);
    } finally {
      if (saved !== undefined) process.env.GUEST_ORDER_SECRET = saved;
      if (savedAuth !== undefined) process.env.AUTH_SECRET = savedAuth;
      if (savedNext !== undefined) process.env.NEXTAUTH_SECRET = savedNext;
    }
  });

  it("refuse to operate with a weak (short) secret", async () => {
    process.env.GUEST_ORDER_SECRET = "short";
    try {
      const fresh = await import(`../src/lib/guestOrder.ts?case=weak&t=${Date.now()}`);
      assert.equal(fresh.isGuestClaimEnabled(), false);
      assert.equal(fresh.mintGuestClaimToken("order_abc"), null);
    } finally {
      process.env.GUEST_ORDER_SECRET = "test-secret-for-guest-order-claims-0123456789";
    }
  });
});
