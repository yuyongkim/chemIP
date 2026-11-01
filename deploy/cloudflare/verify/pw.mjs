// Load Playwright from frontend/node_modules (NODE_PATH, or the repo default) without adding a dependency here.
import { createRequire } from "node:module";
import path from "node:path";
import { PATHS } from "../config.mjs";

export function playwright() {
  const roots = [process.env.NODE_PATH, path.join(PATHS.repo, "frontend", "node_modules")].filter(Boolean);
  for (const root of roots) {
    try { return createRequire(path.join(root, "noop.js"))("playwright"); } catch { /* next root */ }
  }
  throw new Error("playwright not found: set NODE_PATH=G:\\MSDS\\frontend\\node_modules");
}
