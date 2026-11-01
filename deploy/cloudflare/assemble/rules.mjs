// Rules step: renders site_rules.mjs into out/_headers, out/_redirects, out/_routes.json, and writes a fallback
// sitemap.xml (only the SPA entry) when the SEO pipeline has not produced one.
import fs from "node:fs";
import path from "node:path";
import { PATHS, SITE, UI } from "../config.mjs";
import { CSS_CACHE, FUNCTION_ROUTES, HEADERS, REDIRECTS } from "../site_rules.mjs";
import { writeText } from "../lib/fsx.mjs";

export function renderHeaders(rules) {
  return rules.map((r) => [r.path, ...Object.entries(r.headers).map(([k, v]) => `  ${k}: ${v}`)].join("\n")).join("\n\n") + "\n";
}

export function renderRedirects(list) {
  return list.map(([from, to, status]) => `${from} ${to} ${status}`).join("\n") + "\n";
}

export function renderRoutes(include) {
  return JSON.stringify({ version: 1, include, exclude: [] }, null, 2) + "\n";
}

export function renderSitemap(urls) {
  const items = urls.map((u) => `<url><loc>${u}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function cssRules() {
  const dir = path.join(PATHS.out, UI.assetDir);
  return fs.readdirSync(dir).filter((f) => f.endsWith(".css"))
    .map((f) => ({ path: `/${UI.assetDir}/${f}`, headers: { "Cache-Control": CSS_CACHE } }));
}

export function writeRules() {
  const headers = [...HEADERS, ...cssRules()];
  if (headers.length > 100) throw new Error(`_headers has ${headers.length} rules (Pages max 100)`);
  writeText(path.join(PATHS.out, "_headers"), renderHeaders(headers));
  writeText(path.join(PATHS.out, "_redirects"), renderRedirects(REDIRECTS));
  writeText(path.join(PATHS.out, "_routes.json"), renderRoutes(FUNCTION_ROUTES));
  const sitemap = path.join(PATHS.out, "sitemap.xml");
  const fromSeo = fs.existsSync(sitemap);
  if (!fromSeo) writeText(sitemap, renderSitemap([`${SITE.canonical}${SITE.appPath}`]));
  return { headerRules: headers.length, redirects: REDIRECTS.length, functionRoutes: FUNCTION_ROUTES, sitemap: fromSeo ? "seo" : "fallback" };
}
