import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const files = [
  "src/app/api/categories/route.ts",
  "src/app/api/categories/[id]/route.ts",
  "src/lib/auth.ts",
  "src/lib/apiAuth.ts",
  "src/middleware.ts",
  "src/app/api/orders/route.ts",
  "src/app/api/admin/dashboard/route.ts",
];

const source = {};
for (const file of files) source[file] = await readFile(join(root, file), "utf8");

const categories = source["src/app/api/categories/route.ts"];
if (categories.includes("/[^ws-]/g")) throw new Error("Category slug regex is corrupted; expected a real word-character class");
if (categories.includes("/[s_-]+/g")) throw new Error("Category slug whitespace regex is corrupted; expected a real whitespace class");

const auth = source["src/lib/auth.ts"];
if (auth.includes("secure: true") === false) throw new Error("Auth cookies must use secure transport");
if (!auth.includes("strategy: \"jwt\"")) throw new Error("JWT session strategy is required");

const middleware = source["src/middleware.ts"];
if (!middleware.includes("role !== \"ADMIN\"")) throw new Error("Admin role boundary is missing");
if (!middleware.includes("STAFF_ROLES.includes(role)")) throw new Error("Staff role boundary is missing");

const apiAuth = source["src/lib/apiAuth.ts"];
if (!apiAuth.includes("getLiveSession")) throw new Error("API authorization must validate a live database user");

const orders = source["src/app/api/orders/route.ts"];
if (!orders.includes("Server-side price validation")) throw new Error("Order price validation missing");
if (!orders.includes("const finalDeliveryCharge = serverDeliveryCharge")) throw new Error("Delivery charge validation missing");

console.log("Static security/data-integrity checks passed.");
