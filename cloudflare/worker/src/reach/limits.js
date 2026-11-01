// Polite limits for REACH cache misses (D1 rate_events, lib/ratelimit.js): one anonymous client, then all users together.
// Fail-open on a D1 error (the cache already spares ECHA; a broken limiter must not hide the answer).
import { REACH } from "../config.js";
import { clientHash } from "../lib/client_hash.js";
import { allowInWindow } from "../lib/ratelimit.js";

export async function reachAllowed(request, env) {
  if (!env || !env.DB) return true;
  try {
    const key = await clientHash(request, env);
    if (!(await allowInWindow(env.DB, "reach_client", key, REACH.CLIENT_MAX, REACH.CLIENT_WINDOW_S))) return false;
    return await allowInWindow(env.DB, "reach_upstream", "global", REACH.UPSTREAM_MAX, REACH.UPSTREAM_WINDOW_S);
  } catch (e) {
    console.error(`reach limiter: ${e && e.message}`);
    return true;
  }
}
