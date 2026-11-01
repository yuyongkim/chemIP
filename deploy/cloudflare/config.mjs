// Every path, name, URL and limit of the Cloudflare deploy pipeline, defined once. Other modules import from here.
// Nothing is written under G:\MSDS: staging, build output, reports and wrangler state all live under STAGE (E:).
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const STAGE = "E:/dev-cache/chemip-pages";

export const PATHS = {
  here: HERE,
  repo: REPO,
  publicRoot: path.join(REPO, "frontend", "public"),
  uiSrc: path.join(REPO, "frontend", "public", "chemip"),
  uiBuildScript: path.join(REPO, "frontend", "scripts", "build_chemip.cjs"),
  favicon: path.join(REPO, "frontend", "app", "favicon.ico"),
  worker: path.join(REPO, "cloudflare", "worker"),
  pagesSrc: path.join(HERE, "pages"), // functions/ + lib/ copied into the staged Pages project
  templates: path.join(HERE, "templates"),
  // inputs produced by other pipelines
  staticOut: "E:/dev-cache/chemip-static/out/v1", // scripts/static_export (CONTRACT.md)
  seoOut: "E:/dev-cache/chemip-seo/out", // scripts/seo_pages
  // staging (the Pages project root: wrangler.toml, functions/, lib/, out/)
  stage: STAGE,
  uiBuild: path.join(STAGE, "build", "dist"),
  out: path.join(STAGE, "out"),
  reports: path.join(STAGE, "reports"),
  npmCache: "E:/dev-cache/npm",
  wranglerLogs: path.join(STAGE, "wrangler-logs"),
};

export const ACCOUNT_ID = "be15024b2f5766dabce34ad4ae19c49e";

export const SITE = {
  canonical: "https://chemip.yule.pics", // sitemap / robots host (production)
  appPath: "/chemip", // SPA entry, served from out/chemip.html (see UI.pageFile)
  // window.CHEMIP_STATIC for the built page: same-origin paths, so no CORS.
  static: { base: "/data", searchBase: "/data", version: "v1" },
};

export const UI = {
  pageFile: "chemip.html", // Pages serves /chemip from chemip.html (pretty URLs); assets stay under /chemip/
  bundleDir: "chemip/dist", // built app.js (index.html refers to dist/app.js?v=<hash> under <base href="/chemip/">)
  assetDir: "chemip", // css, vendor/, data/, label.html
  baseTag: '<base href="/chemip/" />', // must be in the source index.html; CHEMIP_STATIC is injected after it
};

// Deploy targets. "test" is the default everywhere; "prod" is only used by the cutover steps in README.md.
// Selecting a target never touches DNS, routes or custom domains: those are manual dashboard steps.
const TARGETS = {
  test: {
    pages: { project: "chemip-test", url: "https://chemip-test.pages.dev" },
    worker: { name: "chemip-api-test", url: "https://chemip-api-test.yule-pics.workers.dev" },
  },
  prod: {
    pages: { project: "chemip", url: "https://chemip-9h6.pages.dev" }, // 2026-10-29: Cloudflare 가 붙인 실제 이름
    worker: { name: "chemip-api", url: "" }, // wrangler deploy --env production (README "Production cutover")
  },
};
const targetName = (() => {
  const i = process.argv.indexOf("--target");
  return i >= 0 ? process.argv[i + 1] : "test";
})();
if (!TARGETS[targetName]) throw new Error(`unknown --target ${targetName} (test | prod)`);
export const TARGET = targetName;

export const PAGES = {
  ...TARGETS[TARGET].pages,
  productionBranch: "main",
  compatibilityDate: "2026-10-01",
  serviceBinding: { binding: "API", service: TARGETS[TARGET].worker.name }, // Pages Functions → Worker (no public hop)
};

export const WORKER = { ...TARGETS[TARGET].worker, r2Bucket: "chemip-data" };

export const PRODUCTION = { url: "https://chemip.yule.pics/chemip" };

// Cloudflare Pages free-plan limits (checked by assemble/limits.mjs before every deploy).
export const LIMITS = { maxFiles: 20000, maxFileBytes: 25 * 1024 * 1024 };
