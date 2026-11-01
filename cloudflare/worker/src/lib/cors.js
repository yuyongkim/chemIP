// CORS for the browser frontend. No cookies are used; the admin token travels in X-Admin-Token.
import { setting } from "../config.js";

const ALLOW_HEADERS = "Content-Type, X-Admin-Token";
const ALLOW_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const list = String(setting(env, "CORS_ORIGINS")).split(",").map((s) => s.trim()).filter(Boolean);
  if (list.includes("*")) return "*";
  return list.includes(origin) ? origin : null;
}

export function preflight(request, env) {
  const origin = allowedOrigin(request, env);
  const headers = {
    "access-control-allow-methods": ALLOW_METHODS,
    "access-control-allow-headers": ALLOW_HEADERS,
    "access-control-max-age": "86400",
  };
  if (origin) headers["access-control-allow-origin"] = origin;
  return new Response(null, { status: 204, headers });
}

export function withCors(request, env, response) {
  const origin = allowedOrigin(request, env);
  if (!origin) return response;
  // Set headers in place when they are mutable: re-wrapping would drop encodeBody "manual" (routes/static_data.js
  // passes stored gzip bytes through) and the runtime would gzip them a second time.
  try {
    response.headers.set("access-control-allow-origin", origin);
    response.headers.append("vary", "Origin");
    return response;
  } catch {
    const res = new Response(response.body, response);
    res.headers.set("access-control-allow-origin", origin);
    res.headers.append("vary", "Origin");
    return res;
  }
}
