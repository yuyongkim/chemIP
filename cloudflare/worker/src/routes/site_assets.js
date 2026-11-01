// Production host only: chemip.yule.pics is served from a far Cloudflare location (LAX for Korean users on this
// zone), while *.pages.dev is served from Seoul (ICN). So the HTML document stays on chemip.yule.pics, and this
// rewriter points everything the page loads afterwards at the Pages origin (SITE_ORIGIN):
//   - relative <script src> / <link rel=stylesheet|preload|icon href> → absolute SITE_ORIGIN URL, crossorigin="anonymous"
//     (vendor scripts carry SRI integrity, which needs CORS; Pages _headers send Access-Control-Allow-Origin);
//   - window.CHEMIP_STATIC base/searchBase ("/data") and window.CHEMIP_API_BASE → SITE_ORIGIN + path,
//     injected before the first external script (CHEMIP_STATIC is set inline right after <base>).
// Off unless SITE_ASSETS_DIRECT=true. Anchors, images and canonical links are left on the request host.
import { boolSetting } from "../config.js";

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:)/i;
const REWRITE_RELS = ["stylesheet", "preload", "modulepreload", "icon"];

export function assetsDirect(env) {
  return boolSetting(env, "SITE_ASSETS_DIRECT");
}

function isHtml(res) {
  return /^text\/html/i.test(res.headers.get("content-type") || "");
}

function overrideScript(origin) {
  const o = JSON.stringify(origin);
  return `<script>(function(o){var s=window.CHEMIP_STATIC;if(s){["base","searchBase"].forEach(function(k){if(typeof s[k]==="string"&&s[k].charAt(0)==="/")s[k]=o+s[k];});}window.CHEMIP_API_BASE=o+"/api";})(${o});</script>`;
}

export function rewriteForAssets(res, origin, pageUrl) {
  if (!isHtml(res) || res.status !== 200) return res;
  const state = { base: new URL(pageUrl.pathname, origin), injected: false };
  const absolutize = (value) => new URL(value, state.base).href;
  const fix = (el, attr) => {
    const v = el.getAttribute(attr);
    if (!v || ABSOLUTE.test(v)) return;
    el.setAttribute(attr, absolutize(v));
    el.setAttribute("crossorigin", "anonymous");
  };
  return new HTMLRewriter()
    .on("base[href]", { element(el) { state.base = new URL(el.getAttribute("href"), new URL(pageUrl.pathname, origin)); } })
    .on("script[src]", {
      element(el) {
        if (!state.injected) { el.before(overrideScript(origin), { html: true }); state.injected = true; }
        fix(el, "src");
      },
    })
    .on("link[href]", {
      element(el) {
        const rel = (el.getAttribute("rel") || "").toLowerCase().split(/\s+/);
        if (rel.some((r) => REWRITE_RELS.includes(r))) fix(el, "href");
      },
    })
    .transform(res);
}
