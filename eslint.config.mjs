import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent-skill assets: CommonJS by design, not shipped app code.
    "skills/**",
    // Untracked local scratch (user notes, its own eslint config) — never
    // app code. Ignored so `npm run lint` works in workspaces that have it.
    "isolate/**",
  ]),
  {
    rules: {
      // Migration debt, tracked: ~300 `any`s across 72 legacy files and
      // ~39 set-state-in-effect/immutability hits under the React Compiler
      // rules. Both are behavior-sensitive refactors; demote to warnings so
      // CI gates on real errors while the debt stays visible. Burn these
      // down, then delete this block to restore error severity.
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
