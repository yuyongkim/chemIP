// Limits step: Pages free plan allows at most LIMITS.maxFiles files and LIMITS.maxFileBytes per file.
import fs from "node:fs";
import path from "node:path";
import { LIMITS, PATHS } from "../config.mjs";
import { toPosix, walk } from "../lib/fsx.mjs";

const CONFIG_FILES = new Set(["_headers", "_redirects", "_routes.json"]); // not counted as assets

export function checkLimits(root = PATHS.out) {
  let files = 0, bytes = 0;
  const tooBig = [];
  const byTop = {};
  for (const f of walk(root)) {
    const rel = toPosix(path.relative(root, f));
    if (CONFIG_FILES.has(rel)) continue;
    const size = fs.statSync(f).size;
    files += 1;
    bytes += size;
    const top = rel.split("/").slice(0, 2).join("/");
    byTop[top] = (byTop[top] || 0) + 1;
    if (size > LIMITS.maxFileBytes) tooBig.push({ rel, size });
  }
  const ok = files <= LIMITS.maxFiles && tooBig.length === 0;
  return { ok, files, bytes, maxFiles: LIMITS.maxFiles, tooBig, byTop };
}
