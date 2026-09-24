/**
 * Redis-backed cache and rate-limiting for the Westhome storefront.
 *
 * Built for GCP Memorystore (managed Redis). The Memorystore endpoint must
 * have a public IP with authorized-network access (or an auth string on
 * Valkey/Redis instances created with in-transit encryption) because this app
 * runs on managed hosting without VPC connectivity.
 *
 * Two independent features share this module:
 *
 *  1. `cacheGet` / `cacheSet` / `cacheDel` — async shared cache. Complements
 *     `src/lib/memoCache.ts` (which is per-instance, synchronous, and powers
 *     the single-flight loaders). Values here survive instance restarts and
 *     are shared by every instance.
 *
 *  2. `checkRateLimit` / `rateLimitResponse` — fixed-window rate limiting.
 *     Replaces the per-instance in-memory limiter in `rate-limit.ts`, whose
 *     counters reset whenever an instance restarts and whose limits are
 *     per-isolate rather than global.
 *
 * Failure model: EVERY function in this module is a no-op (or fail-open for
 * rate limiting) when Redis is unreachable. The store must keep serving if
 * the cache is down — degraded, never broken. All operations carry a short
 * timeout so a hung Redis can never hang a request.
 */

import { Redis } from "ioredis";

const MODULE = "redis";

// ── Singleton client ────────────────────────────────────────────────────────
// One client per instance (serverless-friendly: maxRetriesPerRequest caps
// the work a hung connection can cause, lazyConnect defers the first TCP
// handshake until the first command).

const globalForRedis = globalThis as typeof globalThis & {
  __westhomeRedis?: Redis | null;
};

/** True when MEMORYSTORE_HOST is set (Redis features are wired up). */
export const MEMORYSTORE_CONFIGURED = Boolean(process.env.MEMORYSTORE_HOST);

function getClient(): Redis | null {
  const host = process.env.MEMORYSTORE_HOST;
  if (!host) return null; // Redis not configured — all helpers no-op

  if (globalForRedis.__westhomeRedis !== undefined) {
    return globalForRedis.__westhomeRedis;
  }

  const port = Number(process.env.MEMORYSTORE_PORT) || 6379;
  const password = process.env.MEMORYSTORE_PASSWORD || undefined;
  const tls = process.env.MEMORYSTORE_TLS === "1";

  try {
    const client = new Redis({
      host,
      port,
      password,
      tls: tls ? {} : undefined,
      lazyConnect: false,
      connectTimeout: 3_000,
      commandTimeout: 1_000,
      maxRetriesPerRequest: 1,
      // Retry reconnects in the background (never per-request);
      // with maxRetriesPerRequest=1 a failed command throws fast.
      retryStrategy: (times: number) => Math.min(500 * times, 2_000),
      enableOfflineQueue: false,
    });

    // Never let connection errors crash the Node process.
    client.on("error", (err) => {
      console.error(`${MODULE}: connection error (serving without Redis)`, err?.message ?? err);
    });

    globalForRedis.__westhomeRedis = client;
    return client;
  } catch (err: unknown) {
    console.error(`${MODULE}: client init failed (serving without Redis)`, err instanceof Error ? err.message : err);
    globalForRedis.__westhomeRedis = null;
    return null;
  }
}

/** Test/operational helper: drop the singleton so a new one is created. */
export function __resetRedisForTests(): void {
  globalForRedis.__westhomeRedis = undefined;
}

// ── Shared cache ────────────────────────────────────────────────────────────

/** Default shared-cache TTL: 5 minutes. */
export const REDIS_CACHE_TTL_MS = 5 * 60 * 1_000;

function keyFor(key: string): string {
  return `westhome:cache:${key}`;
}

/**
 * Read a value from the shared cache. Returns null on miss, on
 * misconfiguration, or if Redis is unreachable — callers treat it as a miss
 * and recompute. Throws nothing.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const raw = await client.get(keyFor(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write a value to the shared cache. Fire-and-forget: never throws, never
 * blocks the response path. Returns true when written.
 */
export async function cacheSet(key: string, value: unknown, ttlMs: number = REDIS_CACHE_TTL_MS): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    // Rounded seconds; Redis requires a positive integer expiry.
    const ttlSec = Math.max(1, Math.round(ttlMs / 1_000));
    await client.set(keyFor(key), JSON.stringify(value), "EX", ttlSec);
    return true;
  } catch {
    return false;
  }
}

/** Invalidate one cache key. Never throws. */
export async function cacheDel(key: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.del(keyFor(key));
  } catch {
    // Ignore: TTL bounds staleness even if the delete fails.
  }
}

/**
 * Invalidate every westhome:* cache key (used after admin writes, mirroring
 * memoInvalidateCatalog). Uses SCAN (non-blocking) + batched UNLINK.
 * Never throws.
 */
export async function cacheFlushAll(): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await client.scan(cursor, "MATCH", "westhome:cache:*", "COUNT", 200);
      cursor = next;
      if (keys.length > 0) {
        try {
          await client.unlink(...keys);
        } catch {
          await client.del(...keys).catch(() => {});
        }
      }
    } while (cursor !== "0");
  } catch {
    // Ignore — per-key TTLs bound staleness.
  }
}

// ── Fixed-window rate limiting ──────────────────────────────────────────────

/**
 * Consume one hit for `key` within `windowMs`. Atomic via SET … NX EX + INCR
 * (no races across concurrent requests or instances). FAIL-OPEN: if Redis is
 * unreachable, the request is allowed — availability beats enforcement here.
 */
export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const client = getClient();
  if (!client) return true; // fail-open when unconfigured or unreachable

  const redisKey = `westhome:ratelimit:${key}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1_000));

  try {
    const allowed = await incrWithWindow(client, redisKey, windowSec);
    return allowed <= max;
  } catch {
    return true; // fail-open: Redis down must not block shoppers
  }
}

/**
 * Create the counter WITH its expiry in one atomic step (SET … NX EX), then
 * INCR. This avoids the failure mode of INCR-then-EXPIRE where a crash (or a
 * failed EXEC) between the two commands leaves a counter key without a TTL —
 * a permanent key would block that client forever. NX makes concurrent
 * first-hits safe: only the first SET wins, INCR handles the rest atomically.
 */
async function incrWithWindow(client: Redis, key: string, windowSec: number): Promise<number> {
  // No-op (returns null, no throw) when the key already exists.
  await client.set(key, "0", "EX", windowSec, "NX");
  return client.incr(key);
}

/**
 * Standard 429 payload for rejected requests, mirroring the shape callers of
 * the old in-memory limiter expect.
 */
export function rateLimitResponse(remaining: number, retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again shortly." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, retryAfterSec)),
        "X-RateLimit-Remaining": String(Math.max(0, remaining)),
      },
    },
  );
}

// ── Health check ────────────────────────────────────────────────────────────

/**
 * One-shot connectivity probe for the /api/health endpoint. Never throws;
 * reports configured/ok/error so dashboards can tell "not configured" apart
 * from "broken".
 */
export async function redisHealth(): Promise<{ configured: boolean; ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return { configured: false, ok: false };
  try {
    const pong = await client.ping();
    return { configured: true, ok: pong === "PONG" };
  } catch (err: unknown) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
