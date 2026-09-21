/**
 * Tests for src/lib/memoCache.ts — the tiny TTL cache that keeps hot public
 * catalog reads (product lists, product detail, category tiles, sitemap,
 * Merchant feed) from hitting PostgreSQL on every request on the small
 * storefront origin.
 *
 * Run: node --test tests/memo-cache.test.mjs
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const {
  memo,
  memoGet,
  memoSet,
  memoInvalidate,
  memoInvalidateNamespace,
  memoInvalidateCatalog,
  memoClear,
  memoSize,
  CATALOG_TTL_MS,
  SEO_XML_TTL_MS,
  NS,
} = await import("../src/lib/memoCache.ts");

describe("memoCache — memo()", () => {
  beforeEach(() => memoClear());

  it("loads on miss and returns the loader value", async () => {
    const v = await memo("k1", 60_000, async () => 42);
    assert.equal(v, 42);
  });

  it("serves subsequent calls from cache without re-invoking the loader", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return "value";
    };
    await memo("k2", 60_000, loader);
    await memo("k2", 60_000, loader);
    await memo("k2", 60_000, loader);
    assert.equal(calls, 1);
  });

  it("serves stale instantly on expiry, then refreshes in the background", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return `value-${calls}`;
    };
    assert.equal(await memo("k3", 5, loader), "value-1");
    await new Promise((r) => setTimeout(r, 12));
    // Expired: the caller gets the previous value immediately (nobody pays
    // the rebuild latency) while a background refresh runs.
    assert.equal(await memo("k3", 5, loader), "value-1");
    for (let i = 0; i < 30 && calls < 2; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.equal(calls, 2);
    assert.equal(await memo("k3", 5, loader), "value-2");
  });

  it("single-flights concurrent misses into one loader call", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 30));
      return "slow-value";
    };
    const [a, b, c] = await Promise.all([
      memo("sf", 60_000, loader),
      memo("sf", 60_000, loader),
      memo("sf", 60_000, loader),
    ]);
    assert.equal(a, "slow-value");
    assert.equal(b, "slow-value");
    assert.equal(c, "slow-value");
    assert.equal(calls, 1);
  });

  it("backs off after a failed load instead of re-invoking on every request", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      throw new Error("db down");
    };
    await assert.rejects(() => memo("k4", 5, loader));
    // Immediate retry fast-fails through the backoff window (loader NOT re-run).
    await assert.rejects(() => memo("k4", 5, loader));
    assert.equal(calls, 1);
    // After the backoff expires, a fresh attempt is allowed.
    await new Promise((r) => setTimeout(r, 300));
    await assert.rejects(() => memo("k4", 5, loader));
    assert.equal(calls, 2);
  });

  it("namespace invalidation clears the failure backoff so writes retry immediately", async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      if (calls === 1) throw new Error("transient");
      return "recovered";
    };
    await assert.rejects(() => memo("nsx:k", 60_000, loader));
    memoInvalidateNamespace("nsx");
    assert.equal(await memo("nsx:k", 60_000, loader), "recovered");
    assert.equal(calls, 2);
  });

  it("distinct keys do not collide", async () => {
    await memo("a", 60_000, async () => "A");
    await memo("b", 60_000, async () => "B");
    assert.equal(await memo("a", 60_000, async () => "ignored"), "A");
    assert.equal(await memo("b", 60_000, async () => "ignored"), "B");
  });
});

describe("memoCache — memoGet/memoSet", () => {
  beforeEach(() => memoClear());

  it("returns null on miss", () => {
    assert.equal(memoGet("nope"), null);
  });

  it("round-trips a value", () => {
    memoSet("k", 60_000, { hello: "world" });
    assert.deepEqual(memoGet("k"), { hello: "world" });
  });

  it("does not serve entries past their TTL", async () => {
    memoSet("k", 5, "stale-soon");
    await new Promise((r) => setTimeout(r, 12));
    assert.equal(memoGet("k"), null);
  });
});

describe("memoCache — invalidation", () => {
  beforeEach(() => memoClear());

  it("memoInvalidate drops a single key", async () => {
    let calls = 0;
    const loader = async () => (calls += 1);
    await memo("ns1:x", 60_000, loader);
    memoInvalidate("ns1", "x");
    await memo("ns1:x", 60_000, loader);
    assert.equal(calls, 2);
  });

  it("memoInvalidateNamespace drops every key under the prefix", async () => {
    let calls = 0;
    const loader = async () => (calls += 1);
    await memo(`${NS.products}:a`, 60_000, loader);
    await memo(`${NS.products}:b`, 60_000, loader);
    await memo(`${NS.product}:slug`, 60_000, loader);
    memoInvalidateNamespace(NS.products);
    await memo(`${NS.products}:a`, 60_000, loader);
    await memo(`${NS.products}:b`, 60_000, loader);
    await memo(`${NS.product}:slug`, 60_000, loader);
    // products namespace reloaded (2) + product namespace still cached (1)
    assert.equal(calls, 5);
  });

  it("memoInvalidateCatalog drops all five catalog namespaces", async () => {
    let calls = 0;
    const loader = async () => (calls += 1);
    await memo(`${NS.products}:a`, 60_000, loader);
    await memo(`${NS.product}:s`, 60_000, loader);
    await memo(`${NS.categories}:v1`, 60_000, loader);
    await memo(`${NS.sitemap}:v1`, 60_000, loader);
    await memo(`${NS.feed}:v1`, 60_000, loader);
    assert.equal(memoSize(), 5);
    memoInvalidateCatalog();
    assert.equal(memoSize(), 0);
    for (const key of [`${NS.products}:a`, `${NS.product}:s`, `${NS.categories}:v1`, `${NS.sitemap}:v1`, `${NS.feed}:v1`]) {
      await memo(key, 60_000, loader);
    }
    assert.equal(calls, 10);
  });

  it("evicts eldest entries beyond the cap instead of growing unbounded", async () => {
    for (let i = 0; i < 600; i++) {
      memoSet(`fill:${i}`, 60_000, i);
    }
    assert.ok(memoSize() <= 500, `size ${memoSize()} exceeded cap 500`);
    assert.equal(memoGet("fill:0"), null, "eldest entry should have been evicted");
    assert.equal(memoGet("fill:599"), 599, "newest entry should survive");
  });
});

describe("memoCache — constants", () => {
  it("exposes sane TTLs and namespaces", () => {
    assert.equal(typeof CATALOG_TTL_MS, "number");
    // Long enough to absorb bursts; invalidated explicitly on admin writes.
    assert.ok(CATALOG_TTL_MS >= 60_000, `CATALOG_TTL_MS too short: ${CATALOG_TTL_MS}`);
    assert.ok(SEO_XML_TTL_MS >= CATALOG_TTL_MS);
    assert.ok(SEO_XML_TTL_MS >= 600_000, `SEO_XML_TTL_MS too short: ${SEO_XML_TTL_MS}`);
    for (const ns of ["products", "product", "categories", "sitemap", "feed"]) {
      assert.ok(NS[ns], `missing namespace ${ns}`);
    }
  });
});
