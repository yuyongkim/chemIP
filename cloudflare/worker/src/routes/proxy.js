// Fallback for /api/* routes not implemented in the Worker: forward to ORIGIN (home PC tunnel) with a short
// timeout. On any failure -> 503 OFFLINE_BODY. Also counts usage for 200 responses (backend middleware rule).
// ORIGIN must be a different host from the one this Worker is routed on; a loop header blocks self-proxying.
import { OFFLINE_BODY, intSetting, setting } from "../config.js";
import { json } from "../lib/http.js";
import { fetchWithTimeout } from "../lib/upstream.js";
import { countIfMatched } from "../usage/counter.js";

const LOOP_HEADER = "x-chemip-worker-proxy";
const HOP_HEADERS = ["host", "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor", "x-forwarded-for", "x-real-ip", "content-length"];

export const offline = () => json(OFFLINE_BODY, 503, { "cache-control": "no-store" });

export async function proxyToOrigin(request, env, ctx, url) {
  const origin = String(setting(env, "ORIGIN") || "").replace(/\/+$/, "");
  if (!origin || request.headers.get(LOOP_HEADER)) return offline();
  const headers = new Headers(request.headers);
  for (const h of HOP_HEADERS) headers.delete(h);
  headers.set(LOOP_HEADER, "1");
  const init = { method: request.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(request.method)) init.body = await request.arrayBuffer();
  try {
    const res = await fetchWithTimeout(`${origin}${url.pathname}${url.search}`, init, intSetting(env, "ORIGIN_TIMEOUT_MS"));
    // Tunnel up but backend down (cloudflared/Cloudflare HTML error pages) also counts as offline.
    // A JSON 502/503 is a real backend answer (e.g. {"detail": ...} from an adapter) and is passed through.
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    if (!isJson && [502, 503, 504, 520, 521, 522, 523, 524, 530].includes(res.status)) return offline();
    countIfMatched(request, env, ctx, url.pathname, res.status);
    const out = new Response(res.body, res);
    out.headers.set("x-chemip-source", "origin");
    return out;
  } catch {
    return offline();
  }
}
