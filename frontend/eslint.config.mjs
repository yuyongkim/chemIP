import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static assets served verbatim from /public (standalone prototype JSX,
    // loaded in-browser via Babel — not part of the Next app module graph).
    "public/**",
    // Standalone Playwright/browser probe scripts run outside the build.
    "e2e/**",
    // Node build/test scripts (CommonJS, run directly with node).
    "scripts/**",
    // Retired copies kept for rollback only.
    "_legacy_*/**",
  ]),
]);

export default eslintConfig;
