/**
 * Regression tests for the Server -> Client Decimal serialization boundary.
 *
 * Next.js only allows plain objects, arrays and primitives to cross from a
 * Server Component into a Client Component. Prisma returns class instances for
 * every `Decimal` column, and passing one through props makes React throw:
 *
 *   "Only plain objects can be passed to Client Components from Server
 *    Components. Decimal objects are not supported."
 *
 * That error blanked the collection pages (they handed whole Prisma product
 * rows to <CollectionContentClient /> while converting only regularPrice and
 * salePrice), so height/width/costPrice and friends leaked through as Decimal.
 *
 * These tests cover:
 *   1. src/lib/serializeForClient.ts — the shared converter.
 *   2. The two Server Components that read Prisma, asserting they route their
 *      props through the converter so the leak cannot silently return.
 *
 * Run: node --experimental-test-module-mocks --test tests/decimal-serialization.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const { serializeForClient, decimalToNumber } = await import("../src/lib/serializeForClient.ts");

/**
 * Minimal stand-in for Prisma's Decimal (decimal.js). The real constructor
 * name is "Decimal2"; what matters for the serializer is the structural
 * `toNumber` + `toFixed` + `toString` surface.
 */
class FakeDecimal {
  constructor(value) {
    this.value = String(value);
  }
  toString() {
    return this.value;
  }
  toNumber() {
    return Number(this.value);
  }
  toFixed(digits) {
    return Number(this.value).toFixed(digits);
  }
}

const decimal = (v) => new FakeDecimal(v);

/** Mirrors what the RSC payload check cares about: no class instances remain. */
function assertRscSafe(value, path = "root") {
  if (value === null || value === undefined) return;
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return;
  assert.equal(type, "object", `${path} must be a primitive, got ${type}`);
  if (value instanceof Date) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertRscSafe(item, `${path}[${i}]`));
    return;
  }
  const proto = Object.getPrototypeOf(value);
  assert.ok(
    proto === Object.prototype || proto === null,
    `${path} is not a plain object (prototype: ${proto?.constructor?.name})`,
  );
  for (const key of Object.keys(value)) assertRscSafe(value[key], `${path}.${key}`);
}

describe("serializeForClient — Decimal conversion", () => {
  it("converts a Decimal to a plain number by default", () => {
    const out = serializeForClient({ regularPrice: decimal("1299.5") });
    assert.equal(out.regularPrice, 1299.5);
    assert.equal(typeof out.regularPrice, "number");
  });

  it("converts a top-level Decimal", () => {
    assert.equal(serializeForClient(decimal("42.25")), 42.25);
  });

  it("supports lossless string mode for precision-critical values", () => {
    const exact = "12345678901234567890.123456789";
    const out = serializeForClient({ amount: decimal(exact) }, { decimal: "string" });
    assert.equal(typeof out.amount, "string");
    assert.equal(out.amount, exact);
  });

  it("preserves null and undefined Decimal columns", () => {
    const out = serializeForClient({ salePrice: null, costPrice: undefined, weight: null });
    assert.equal(out.salePrice, null);
    assert.equal(out.costPrice, undefined);
    assert.equal(out.weight, null);
  });

  it("preserves zero — a free promotional price is not coerced to null", () => {
    const out = serializeForClient({ promotionalPrice: decimal("0"), discount: decimal("0.00") });
    assert.equal(out.promotionalPrice, 0);
    assert.equal(out.discount, 0);
  });

  it("keeps already-converted numbers untouched", () => {
    const out = serializeForClient({ regularPrice: 999, salePrice: null, stock: 0 });
    assert.deepEqual(out, { regularPrice: 999, salePrice: null, stock: 0 });
  });
});

describe("serializeForClient — structure handling", () => {
  it("walks arrays of rows", () => {
    const out = serializeForClient([{ price: decimal("10") }, { price: decimal("20") }]);
    assert.deepEqual(out, [{ price: 10 }, { price: 20 }]);
  });

  it("walks deeply nested relation data", () => {
    const out = serializeForClient({
      product: {
        variants: [{ price: decimal("99.99"), attributes: [{ value: decimal("5") }] }],
        category: { name: "Baskets" },
      },
    });
    assert.equal(out.product.variants[0].price, 99.99);
    assert.equal(out.product.variants[0].attributes[0].value, 5);
    assert.equal(out.product.category.name, "Baskets");
  });

  it("preserves Date values, which the RSC payload supports natively", () => {
    const published = new Date("2026-01-15T10:30:00.000Z");
    const out = serializeForClient({ publishedAt: published, createdAt: published });
    assert.ok(out.publishedAt instanceof Date);
    assert.equal(out.publishedAt.toISOString(), published.toISOString());
  });

  it("stringifies bigint so it cannot break serialization", () => {
    assert.deepEqual(serializeForClient({ big: 10n }), { big: "10" });
  });

  it("flattens a class instance into a genuine plain object", () => {
    class Row {
      constructor() {
        this.price = decimal("7");
        this.name = "Basket";
      }
    }
    const out = serializeForClient(new Row());
    assert.equal(Object.getPrototypeOf(out), Object.prototype);
    assert.equal(out.price, 7);
    assert.equal(out.name, "Basket");
    assertRscSafe(out);
  });

  it("passes binary and collection built-ins through untouched", () => {
    const map = new Map([["a", 1]]);
    const set = new Set([1, 2]);
    const bytes = new Uint8Array([1, 2, 3]);
    const out = serializeForClient({ map, set, bytes });
    assert.equal(out.map, map);
    assert.equal(out.set, set);
    assert.equal(out.bytes, bytes);
  });

  it("leaves booleans and strings untouched", () => {
    const out = serializeForClient({ isActive: true, name: "Clock", description: null });
    assert.deepEqual(out, { isActive: true, name: "Clock", description: null });
  });

  it("does not mistake a Date for a Decimal", () => {
    const out = serializeForClient({ at: new Date(0) });
    assert.ok(out.at instanceof Date);
  });
});

describe("serializeForClient — RSC payload safety", () => {
  it("produces a fully plain, RSC-safe product payload", () => {
    const payload = serializeForClient({
      id: "p1",
      name: "Woven Basket",
      regularPrice: decimal("1499"),
      salePrice: decimal("999.99"),
      costPrice: decimal("400.25"),
      promotionalPrice: null,
      height: decimal("45.5"),
      width: decimal("60"),
      weight: decimal("1.25"),
      packagingWeight: decimal("1.8"),
      frameSizeWidth: decimal("90.5"),
      customSizeMinWidth: decimal("10"),
      stockQuantity: 12,
      isActive: true,
      publishedAt: new Date("2026-02-01T00:00:00.000Z"),
      images: [{ id: "i1", url: "/api/images/a.webp" }],
      variants: [{ id: "v1", price: decimal("1499"), salePrice: decimal("999.99") }],
    });
    assertRscSafe(payload);
    assert.equal(payload.regularPrice, 1499);
    assert.equal(payload.salePrice, 999.99);
    assert.equal(payload.variants[0].price, 1499);
  });
});

describe("decimalToNumber", () => {
  it("converts Decimal, number and numeric string inputs", () => {
    assert.equal(decimalToNumber(decimal("12.5")), 12.5);
    assert.equal(decimalToNumber("12.5"), 12.5);
    assert.equal(decimalToNumber(12.5), 12.5);
  });

  it("returns null for nullish and non-numeric input", () => {
    assert.equal(decimalToNumber(null), null);
    assert.equal(decimalToNumber(undefined), null);
    assert.equal(decimalToNumber("not-a-number"), null);
  });
});

describe("Server Components route Prisma props through the serializer", () => {
  const root = process.cwd();
  const pages = [
    "src/app/(shop)/collections/[slug]/page.tsx",
    "src/app/(shop)/products/[slug]/page.tsx",
  ];

  it("both Prisma-reading pages import serializeForClient", async () => {
    for (const page of pages) {
      const source = await readFile(join(root, page), "utf8");
      assert.match(
        source,
        /import \{ serializeForClient \} from "@\/lib\/serializeForClient"/,
        `${page} must import serializeForClient`,
      );
    }
  });

  it("the collection page serializes the products it hands to the client", async () => {
    const source = await readFile(join(root, pages[0]), "utf8");
    assert.match(
      source,
      /return serializeForClient\(\{[\s\S]*?products: products\.map\([\s\S]*?total,[\s\S]*?\}\);/,
      "getInitialProducts must return serializeForClient({ products, total })",
    );
  });

  it("the product page serializes the product, related products and reviews", async () => {
    const source = await readFile(join(root, pages[1]), "utf8");
    // The import line carries no "(" so only real call sites are counted:
    // getProduct, getRelatedProducts and getReviews.
    const serializerCalls = source.match(/serializeForClient\(/g) ?? [];
    assert.equal(
      serializerCalls.length,
      3,
      "expected serializeForClient at all 3 call sites in the product page",
    );
  });
});
