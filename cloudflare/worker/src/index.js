// Entry point: CORS preflight -> route table -> ORIGIN fallback for other /api/* -> site pages (SITE_ORIGIN, Pages).
// No route logic here.
import { preflight, withCors } from "./lib/cors.js";
import { ValidationError, json, validationResponse } from "./lib/http.js";
import { buildTable, match } from "./lib/router.js";
import { proxyToOrigin } from "./routes/proxy.js";
import { ROUTE_GROUPS } from "./routes/registry.js";
import { scheduledFeed } from "./cron_feed.js";
import { proxyToSite, siteOrigin } from "./routes/site_proxy.js";

const TABLE = buildTable(ROUTE_GROUPS);

async function dispatch(request, env, ctx) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return preflight(request, env);
  const hit = match(TABLE, request.method, url.pathname);
  try {
    if (hit) return await hit.route.handler({ request, env, ctx, url, params: hit.params });
    if (url.pathname.startsWith("/api/")) return await proxyToOrigin(request, env, ctx, url);
    if (siteOrigin(env)) return await proxyToSite(request, env, url);
    return json({ detail: "Not Found" }, 404);
  } catch (e) {
    if (e instanceof ValidationError) return validationResponse(e);
    console.error(`unhandled error on ${request.method} ${url.pathname}: ${e && e.name}`);
    return json({ code: "INTERNAL_SERVER_ERROR", message: "Unhandled server error", detail: (e && e.name) || "Error" }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    return withCors(request, env, await dispatch(request, env, ctx));
  },
  // Cron Trigger (wrangler.toml [env.production.triggers]) — 화학사고 소식 갱신. 다른 정기 작업이 생기면 controller.cron 으로 나눈다.
  scheduled(controller, env, ctx) {
    scheduledFeed(controller, env, ctx);
  },
};
