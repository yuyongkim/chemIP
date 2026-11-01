// Run wrangler as `node <npx cache>/wrangler/bin/wrangler.js` (no cmd.exe, so arguments are passed verbatim).
// The npm cache and wrangler logs stay on E: (config PATHS). Output is streamed; secrets are never passed as args.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PATHS } from "../config.mjs";

function wranglerJs() {
  const npx = path.join(PATHS.npmCache, "_npx");
  const found = [];
  for (const dir of fs.existsSync(npx) ? fs.readdirSync(npx) : []) {
    const pkg = path.join(npx, dir, "node_modules", "wrangler", "package.json");
    if (!fs.existsSync(pkg)) continue;
    const ver = JSON.parse(fs.readFileSync(pkg, "utf8")).version.split(".").map(Number);
    found.push({ ver, js: path.join(path.dirname(pkg), "bin", "wrangler.js") });
  }
  if (!found.length) throw new Error("wrangler is not in the npx cache: run `npx --yes wrangler --version` once");
  found.sort((a, b) => b.ver[0] - a.ver[0] || b.ver[1] - a.ver[1] || b.ver[2] - a.ver[2]);
  return found[0].js;
}

export function wranglerEnv() {
  fs.mkdirSync(PATHS.wranglerLogs, { recursive: true });
  return {
    ...process.env,
    npm_config_cache: PATHS.npmCache,
    WRANGLER_SEND_METRICS: "false",
    WRANGLER_LOG_PATH: PATHS.wranglerLogs,
  };
}

// Returns {status, stdout, stderr}. capture=false streams to this console.
export function wrangler(args, { cwd, capture = false } = {}) {
  const r = spawnSync(process.execPath, [wranglerJs(), ...args], {
    cwd,
    env: wranglerEnv(),
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}
