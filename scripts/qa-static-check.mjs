import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const files = [
  "src/api-handlers/categories/route.ts",
  "src/lib/auth.ts",
  "src/lib/apiAuth.ts",
  "src/middleware.ts",
  "src/api-handlers/orders/route.ts",
  "src/api-handlers/admin/dashboard/route.ts",
];

const source = {};
for (const file of files) source[file] = await readFile(join(root, file), "utf8");

const categories = source["src/api-handlers/categories/route.ts"];
if (categories.includes("/[^ws-]/g")) throw new Error("Category slug regex is corrupted; expected a real word-character class");
if (categories.includes("/[s_-]+/g")) throw new Error("Category slug whitespace regex is corrupted; expected a real whitespace class");

const auth = source["src/lib/auth.ts"];
// Auth cookies must be secure in production. The codebase intentionally uses a
// NODE_ENV-conditional flag so local HTTP development keeps working.
const secureCookiePattern = /secure:\s*process\.env\.NODE_ENV\s*===\s*"production"/;
if (!secureCookiePattern.test(auth)) throw new Error("Auth cookies must use secure transport in production (NODE_ENV-conditional secure flag)");
if (auth.includes("secure: true") && !secureCookiePattern.test(auth)) throw new Error("Auth cookies hardcode secure:true instead of the NODE_ENV-conditional flag");
if (!auth.includes("strategy: \"jwt\"")) throw new Error("JWT session strategy is required");

const middleware = source["src/middleware.ts"];
if (!middleware.includes("role !== \"ADMIN\"")) throw new Error("Admin role boundary is missing");
// Staff boundary evolved from a STAFF_ROLES constant to a local can([...]) helper;
// accept either spelling so the check survives both.
if (!middleware.includes("STAFF_ROLES.includes(role)") && !middleware.includes("const can = (roles: string[]) => roles.includes(role);")) {
  throw new Error("Staff role boundary is missing");
}

const apiAuth = source["src/lib/apiAuth.ts"];
// apiAuth evolved from getLiveSession to requireAuthRole-family helpers that
// validate the live session and role on every request.
if (!apiAuth.includes("getLiveSession") && !apiAuth.includes("requireAuthRole")) {
  throw new Error("API authorization must validate a live database user");
}

const orders = source["src/api-handlers/orders/route.ts"];
if (!orders.includes("Server-side price validation")) throw new Error("Order price validation missing");
if (!orders.includes("const finalDeliveryCharge = serverDeliveryCharge")) throw new Error("Delivery charge validation missing");

console.log("Static security/data-integrity checks passed.");
