import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "prisma/schema.prisma",
  "src/lib/auth.ts",
  "src/lib/apiAuth.ts",
  "src/middleware.ts",
  "src/app/api/[...path]/route.ts",
  "src/api-handlers/orders/route.ts",
  "src/api-handlers/admin/dashboard/route.ts",
];

for (const file of required) {
  if (!existsSync(join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const expectedScripts = ["build", "lint", "qa:regression"];
for (const script of expectedScripts) {
  if (!packageJson.scripts?.[script]) throw new Error(`Missing npm script: ${script}`);
}

const auth = await readFile(join(root, "src/lib/auth.ts"), "utf8");
if (!auth.includes("secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET")) {
  throw new Error("Auth secret configuration invariant failed");
}
if (!auth.includes("session:") || !auth.includes('strategy: "jwt"')) throw new Error("JWT session invariant failed");

const middleware = await readFile(join(root, "src/middleware.ts"), "utf8");
if (!middleware.includes("pathname.startsWith(\"/admin\")")) throw new Error("Admin middleware guard missing");
if (!middleware.includes('role !== "ADMIN"')) throw new Error("Admin role guard missing");

const orders = await readFile(join(root, "src/api-handlers/orders/route.ts"), "utf8");
if (!orders.includes("Server-side price validation")) throw new Error("Server-side order price validation missing");

console.log("West Home preflight audit passed.");
