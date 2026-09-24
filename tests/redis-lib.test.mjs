import test from "node:test";
import assert from "node:assert/strict";

// The Redis module (GCP Memorystore integration) must be a safe no-op when
// MEMORYSTORE_HOST is absent, and fail-open for rate limiting. These tests
// run without a Redis server on purpose.

test("redis lib: unconfigured mode is a safe no-op", async () => {
  const mod = await import("../src/lib/redis.ts");

  assert.equal(mod.MEMORYSTORE_CONFIGURED, false, "not configured without MEMORYSTORE_HOST");

  await assert.doesNotReject(() => mod.cacheGet("missing"));
  assert.equal(await mod.cacheGet("missing"), null);

  await assert.doesNotReject(() => mod.cacheSet("k", { a: 1 }));
  await assert.doesNotReject(() => mod.cacheDel("k"));
  await assert.doesNotReject(() => mod.cacheFlushAll());

  const health = await mod.redisHealth();
  assert.deepEqual(health, { configured: false, ok: false });
});

test("rate-limit: fail-open (allows) when Redis is not configured", async () => {
  const { rateLimit } = await import("../src/lib/rate-limit.ts");
  const limiter = rateLimit({ windowMs: 60_000, max: 2 });

  const req = new Request("https://www.westhome.in/api/test", {
    headers: { "x-forwarded-for": "203.0.113.9" },
  });

  // Unconfigured → falls back to in-memory: first 2 allowed, 3rd blocked.
  assert.equal(await limiter.checkAsync(req), true);
  assert.equal(await limiter.checkAsync(req), true);
  assert.equal(await limiter.checkAsync(req), false);
});
