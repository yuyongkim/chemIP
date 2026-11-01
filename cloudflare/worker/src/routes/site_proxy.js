// Site pages for the production host: any non-/api, non-data path is fetched from the Pages project (SITE_ORIGIN,
// e.g. https://chemip.pages.dev) so chemip.yule.pics works with the PC off while its DNS record still points at
// the PC tunnel (the Worker route chemip.yule.pics/* runs before the origin). Unset SITE_ORIGIN = feature off.
// Only GET/HEAD. Pages' *.pages.dev noindex header is dropped (it is meant for the test host, not this one), and an
// absolute Location on the pages.dev host is rewritten to the request host so redirects stay on chemip.yule.pics.
import { setting } from "../config.js";
import { json } from "../lib/http.js";
import { assetsDirect, rewriteForAssets } from "./site_assets.js";
import { geoCookie } from "../lib/geo_lang.js";

const DROP_HEADERS = ["x-robots-tag"];

export function siteOrigin(env) {
  return String(setting(env, "SITE_ORIGIN") || "").replace(/\/+$/, "");
}

export async function proxyToSite(request, env, url) {
  const origin = siteOrigin(env);
  if (!["GET", "HEAD"].includes(request.method)) return json({ detail: "Method Not Allowed" }, 405);
  const upstream = new URL(`${origin}${url.pathname}${url.search}`);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const res = await fetch(upstream.toString(), { method: request.method, headers, redirect: "manual" });
  const out = new Response(res.body, res);
  for (const h of DROP_HEADERS) out.headers.delete(h);
  const loc = out.headers.get("location");
  if (loc && loc.startsWith(upstream.origin)) out.headers.set("location", url.origin + loc.slice(upstream.origin.length));
  out.headers.set("x-chemip-source", "pages");
  const geo = /text\/html/i.test(out.headers.get("content-type") || "") ? geoCookie(request) : null;
  if (geo) out.headers.append("set-cookie", geo);
  return assetsDirect(env) ? rewriteForAssets(out, origin, url) : out;
}
