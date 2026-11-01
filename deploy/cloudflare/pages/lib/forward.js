// Pages Function body shared by every function route: forward the request unchanged to the ChemIP Worker.
// Preferred: service binding `API` (wrangler.toml [[services]], no public hop, same request incl. CF-Connecting-IP).
// Fallback: env var API_URL (the Worker's workers.dev URL) when no binding is configured.
// The Worker owns all logic (routes, R2 headers, offline 503); this file only picks the transport.
const NO_BACKEND = { error: "offline", message: "지금 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." };

export async function onRequest({ request, env }) {
  if (env.API && typeof env.API.fetch === "function") return env.API.fetch(request);
  if (env.API_URL) {
    const url = new URL(request.url);
    const target = `${String(env.API_URL).replace(/\/+$/, "")}${url.pathname}${url.search}`;
    return fetch(new Request(target, request));
  }
  return new Response(JSON.stringify(NO_BACKEND), {
    status: 503,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
