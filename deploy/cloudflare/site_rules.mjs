// Site rules as data: what is copied where, response headers, redirects and which paths run Functions.
// assemble/*.mjs renders these into out/ (_headers, _redirects, _routes.json). Add a rule here, not in code.
import path from "node:path";
import { PATHS, SITE, UI } from "./config.mjs";

const V = SITE.static.version;
// Search Console verification must answer 200 at exactly /<name>.html. Pages "pretty URLs" would 308 a root
// *.html file to the extensionless path, so the file lives in VERIFY_DIR and a 200 rewrite serves it at the root.
const GOOGLE_VERIFY = "google5299d3d91ba2dbe2.html";
const VERIFY_DIR = "site-verification";
const DATA = SITE.static.base; // "/data"

// Copies into out/. from = absolute source, to = path under out/. optional: skip silently when missing.
export const COPIES = [
  { from: path.join(PATHS.uiSrc, "vendor"), to: `${UI.assetDir}/vendor` },
  { from: path.join(PATHS.uiSrc, "data"), to: `${UI.assetDir}/data` },
  // 2026-10-28: 첫 화면 그림(논문 그림 assets/paper, 사례 FAQ faq/*.png). 빠져 있어 시험 사이트에서 404 였다.
  { from: path.join(PATHS.uiSrc, "assets"), to: `${UI.assetDir}/assets` },
  { from: path.join(PATHS.uiSrc, "faq"), to: `${UI.assetDir}/faq` },
  { from: path.join(PATHS.uiSrc, "label.html"), to: `${UI.assetDir}/label.html` },
  { glob: { dir: PATHS.uiSrc, ext: ".css" }, to: UI.assetDir },
  { from: path.join(PATHS.publicRoot, "robots.txt"), to: "robots.txt" },
  { from: path.join(PATHS.publicRoot, GOOGLE_VERIFY), to: `${VERIFY_DIR}/${GOOGLE_VERIFY}` },
  { from: PATHS.favicon, to: "favicon.ico" },
  { from: path.join(PATHS.templates, "404.html"), to: "404.html" },
  { from: path.join(PATHS.staticOut, "search"), to: `${DATA.slice(1)}/${V}/search`, required: "manifest.json" },
  // SEO pages map onto the site root (/chemip/cas/**, sitemap.xml). Optional until that pipeline has run.
  { from: PATHS.seoOut, to: "", optional: true, exclude: ["_screenshots", GOOGLE_VERIFY] },
];

// Paths handled by Pages Functions (forwarded to the Worker). Everything else is a static asset.
export const FUNCTION_ROUTES = [
  "/api/*", `${DATA}/${V}/p/*`, `${DATA}/${V}/g/*`, `${DATA}/${V}/pat/*`, `${DATA}/${V}/tx/*`, `${DATA}/${V}/pv/*`, `${DATA}/${V}/gs/*`,
  `${DATA}/${V}/f/*`,
  `${DATA}/${V}/reg/*`, // regulation lists, changes.json, changes.xml RSS (CONTRACT.md "reg/")
  `${DATA}/${V}/feed/*`, // incident feed: latest.json + by-cas/<CAS>.json (CONTRACT.md "feed/")
  `${DATA}/${V}/oel/*`, // exposure-limit comparison by CAS (CONTRACT.md "oel/<CAS>.json")
  `${DATA}/${V}/el/*`, // emergency exposure guidelines by CAS + index.json (CONTRACT.md "el/")
  `${DATA}/${V}/prtr/*`, // PRTR facility map: index.json + <CAS>.json (CONTRACT.md "prtr/")
  `${DATA}/${V}/rel/*`, // related substances by CAS (CONTRACT.md "rel/<CAS>.json")
  `${DATA}/${V}/tp/*`, // temperature-dependent property correlations by CAS (CONTRACT.md "tp/")
  `${DATA}/${V}/law/*`, // Korean law corpus: index/toc/lists + one file per law + CAS shards (CONTRACT.md "law/")
  "/chemical/*",
];

const LONG = "public, max-age=31536000, immutable"; // content-hashed (?v=) files
const WEEK = "public, max-age=604800, stale-while-revalidate=86400"; // same value as the Worker's STATIC_DATA hit
const DAY = "public, max-age=86400";

// _headers rules (Pages applies every matching rule; max 100 rules).
export const HEADERS = [
  { path: "/*", headers: { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" } },
  // test hostnames are never indexed; the production host is not *.pages.dev
  { path: "https://:project.pages.dev/*", headers: { "X-Robots-Tag": "noindex" } },
  { path: "https://:version.:project.pages.dev/*", headers: { "X-Robots-Tag": "noindex" } },
  { path: `/${UI.bundleDir}/*`, headers: { "Cache-Control": LONG } },
  { path: `/${UI.assetDir}/vendor/*`, headers: { "Cache-Control": "public, max-age=604800" } },
  { path: `/${UI.assetDir}/data/*`, headers: { "Cache-Control": DAY } },
  { path: `${DATA}/${V}/search/*`, headers: { "Cache-Control": WEEK } }, // .json → application/json (Pages default)
  { path: SITE.appPath, headers: { "Cache-Control": "public, max-age=0, must-revalidate" } },
  // 2026-10-29: the production HTML (chemip.yule.pics) loads UI files and the search index from this Pages origin
  // (cloudflare/worker/src/routes/site_assets.js); SRI-checked scripts and fonts need CORS.
  { path: `/${UI.assetDir}/*`, headers: { "Access-Control-Allow-Origin": SITE.canonical } },
  { path: `${DATA}/${V}/search/*`, headers: { "Access-Control-Allow-Origin": SITE.canonical } },
];
// CSS files are loaded with ?v=; one rule per file is generated (assemble/rules.mjs) with this value.
export const CSS_CACHE = LONG;

// _redirects (source destination status). Legacy Next pages of the PC site go to the SPA.
export const REDIRECTS = [
  [`/${GOOGLE_VERIFY}`, `/${VERIFY_DIR}/${GOOGLE_VERIFY.replace(/\.html$/, "")}`, 200],
  ["/", SITE.appPath, 301],
  [`${SITE.appPath}/index.html`, SITE.appPath, 301],
  [`${SITE.appPath}/dist/index.html`, SITE.appPath, 301],
  // /chemical/<id> → SPA substance view is a Function (pages/functions/chemical): placeholders are not
  // substituted inside a _redirects query string.
  ...["/home", "/patents", "/guide", "/drugs", "/ghs", "/trade", "/docs"].map((p) => [p, SITE.appPath, 302]),
];
