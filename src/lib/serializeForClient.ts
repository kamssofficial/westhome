/**
 * Server -> Client boundary serializer.
 *
 * Next.js can only pass plain objects, arrays, and primitives from a Server
 * Component to a Client Component. Prisma returns `Decimal` instances for every
 * `Decimal` column (prices, dimensions, weights, order totals, ...) and those
 * instances are class objects, not plain objects, so React rejects the props
 * with:
 *
 *   "Only plain objects can be passed to Client Components from Server
 *    Components. Decimal objects are not supported."
 *
 * Every Server Component that hands a Prisma row to a Client Component must run
 * its result through `serializeForClient()` first. Doing the conversion in one
 * tested place avoids the previous failure mode, where each page hand-picked a
 * few fields (`regularPrice`, `salePrice`, ...) and silently leaked the rest
 * (`height`, `width`, `costPrice`, `promotionalPrice`, `frameSize*`, ...).
 *
 * Decimal handling: values are converted with `toNumber()`, which is exact for
 * the money/dimension magnitudes this store uses (far below
 * `Number.MAX_SAFE_INTEGER`) and keeps the existing client contract, where
 * prices are compared (`salePrice > 0`) and formatted with `toLocaleString()`.
 * Pass `{ decimal: "string" }` when a caller genuinely needs the exact decimal
 * text (for example persisting a raw amount), which is lossless.
 *
 * Dates are intentionally left as `Date`: the RSC payload format supports them
 * natively and Next rehydrates them on the client.
 *
 * This module must stay server-side. It is imported by Server Components only
 * and intentionally does not import `@prisma/client`, so the Decimal check is
 * structural (duck typing) rather than an `instanceof` against a runtime class.
 */

export type DecimalSerialization = "number" | "string";

export interface SerializeForClientOptions {
  /** How to render Prisma `Decimal` values. Defaults to `"number"`. */
  decimal?: DecimalSerialization;
}

type DecimalLike = {
  toNumber?: () => number;
  toFixed?: (digits?: number) => string;
  toString: () => string;
};

function isDecimalLike(value: unknown): value is DecimalLike {
  if (value === null || typeof value !== "object") return false;
  if (value instanceof Date) return false;
  const candidate = value as Record<string, unknown>;
  // Prisma's Decimal exposes decimal.js methods. Checking for both `toNumber`
  // and `toFixed` keeps this from matching unrelated objects that merely have
  // a `toString`.
  return (
    typeof candidate.toNumber === "function" && typeof candidate.toFixed === "function"
  );
}

function serializeDecimal(value: DecimalLike, mode: DecimalSerialization): number | string {
  if (mode === "string") return value.toString();
  if (typeof value.toNumber === "function") {
    const n = value.toNumber();
    if (Number.isFinite(n)) return n;
  }
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : value.toString();
}

/**
 * Built-ins that are either supported by the RSC payload format or are binary
 * containers that must not be flattened into a plain object. Prisma returns
 * none of these for this schema (there are no `Bytes` columns), but callers
 * that introduce one should keep it intact.
 */
function isPassThroughObject(value: object): boolean {
  return (
    value instanceof Date ||
    value instanceof Map ||
    value instanceof Set ||
    value instanceof RegExp ||
    value instanceof Uint8Array
  );
}

/**
 * Recursively convert a Prisma result (or any server value) into a structure
 * React can serialize into the client payload.
 *
 * - Prisma `Decimal` -> `number` (default) or `string`
 * - `Date`           -> preserved (RSC supports Date natively)
 * - Arrays           -> mapped element-wise
 * - Objects          -> rebuilt as genuine plain objects with serialized
 *                       values, so no class instance can leak to the client
 *                       (this covers Decimal-carrying rows and anything else)
 * - `Map`/`Set`/`RegExp`/binary (`Uint8Array`) -> passed through untouched
 * - Everything else  -> passed through unchanged
 */
export function serializeForClient<T>(value: T, options: SerializeForClientOptions = {}): T {
  const mode: DecimalSerialization = options.decimal ?? "number";
  return serializeValue(value, mode) as T;
}

function serializeValue(value: unknown, mode: DecimalSerialization): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  // Direct typeof checks (rather than a `const valueType = typeof value`
  // alias) so TypeScript narrows `unknown` down to `object` below.
  if (typeof value !== "object") return value;

  if (isDecimalLike(value)) return serializeDecimal(value, mode);
  if (isPassThroughObject(value)) return value;
  if (Array.isArray(value)) return value.map((item) => serializeValue(item, mode));

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    result[key] = serializeValue((value as Record<string, unknown>)[key], mode);
  }
  return result;
}

/** Convenience wrapper for the common single-Decimal case. */
export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (isDecimalLike(value)) {
    const n = typeof value.toNumber === "function" ? value.toNumber() : Number(value.toString());
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
