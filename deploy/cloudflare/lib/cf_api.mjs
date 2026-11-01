// Read-only Cloudflare REST calls with wrangler's own OAuth login (refreshed by running `wrangler whoami` first).
// The token is read from wrangler's config file and only sent to api.cloudflare.com; it is never printed.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ACCOUNT_ID } from "../config.mjs";
import { wrangler } from "./wrangler.mjs";

const API = "https://api.cloudflare.com/client/v4";

function tokenFile() {
  const candidates = [
    process.env.XDG_CONFIG_HOME && path.join(process.env.XDG_CONFIG_HOME, ".wrangler", "config", "default.toml"),
    path.join(os.homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml"),
    path.join(os.homedir(), ".config", ".wrangler", "config", "default.toml"),
    path.join(os.homedir(), ".wrangler", "config", "default.toml"),
  ].filter(Boolean);
  const found = candidates.find((f) => fs.existsSync(f));
  if (!found) throw new Error("wrangler login config not found; run `npx wrangler login`");
  return found;
}

function oauthToken() {
  wrangler(["whoami"], { capture: true }); // refreshes an expired access token
  const m = fs.readFileSync(tokenFile(), "utf8").match(/^oauth_token\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error("no oauth_token in wrangler config");
  return m[1];
}

let cached = null;
export async function cfGet(pathAndQuery) {
  cached = cached || oauthToken();
  const r = await fetch(`${API}/accounts/${ACCOUNT_ID}${pathAndQuery}`, { headers: { authorization: `Bearer ${cached}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.success === false) throw new Error(`cf api ${r.status}: ${JSON.stringify(body.errors || body).slice(0, 300)}`);
  return body;
}

// R2 object keys under a prefix (paged with cursor). limit = stop after this many keys.
export async function listR2(bucket, prefix, limit = Infinity) {
  const keys = [];
  let cursor = "";
  do {
    const q = new URLSearchParams({ prefix, per_page: "1000", ...(cursor ? { cursor } : {}) });
    const body = await cfGet(`/r2/buckets/${bucket}/objects?${q}`);
    for (const o of body.result || []) keys.push({ key: o.key, size: o.size, encoding: o.http_metadata?.contentEncoding });
    cursor = body.result_info?.is_truncated ? body.result_info.cursor : "";
  } while (cursor && keys.length < limit);
  return keys.slice(0, limit);
}
