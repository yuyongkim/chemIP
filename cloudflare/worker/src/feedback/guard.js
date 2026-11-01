// Request-board write protection: per-client post limit (D1, salted hash only) and admin token check.
import { SECRETS } from "../config.js";
import { clientHash } from "../lib/client_hash.js";
import { allowInWindow } from "../lib/ratelimit.js";
import { MAX_POSTS, POST_WINDOW_SECONDS } from "./schema.js";

const ADMIN_HEADER = "x-admin-token";

export async function allowPost(request, env) {
  const key = await clientHash(request, env);
  return allowInWindow(env.DB, "feedback_post", key, MAX_POSTS, POST_WINDOW_SECONDS);
}

export function adminTokenConfigured(env) {
  return Boolean(String(env[SECRETS.ADMIN_TOKEN] || "").trim());
}

// Constant-time comparison of SHA-256 digests (lengths always equal).
async function digest(s) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

export async function isAdmin(request, env) {
  const expected = String(env[SECRETS.ADMIN_TOKEN] || "").trim();
  const provided = (request.headers.get(ADMIN_HEADER) || "").trim();
  if (!expected) return false;
  const [a, b] = await Promise.all([digest(expected), digest(provided)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
