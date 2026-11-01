// Verification data: HTTP expectations, browser flows' inputs and UI selectors. Checks read these; add cases here.
export const OFFLINE_TEXT = "지금 연결할 수 없습니다";
export const SEARCH_QUERIES = ["벤젠", "toluene", "67-64-1"];
// Substances to open, in order of preference; only those whose p/ object is in R2 are used (r2_p_keys.json).
export const PREFERRED_CHEMS = ["001008", "71-43-2", "108-88-3", "67-64-1", "7664-93-9", "7647-01-0"];
export const MAX_CHEMS = 3;

export const SELECTORS = {
  appReady: ".shell",
  searchRow: "tr[tabindex='0']",
  tabs: ".tabs button",
  tradeBody: ".tc-body",
  countrySelect: "select.tc-select",
  boardWrite: "글쓰기",
};

export const TEST_POST = {
  category: "기타",
  title: "[TEST] Cloudflare Pages 배포 점검 — 삭제 예정",
  body: "TEST: chemip-test.pages.dev 배포 점검용 자동 글입니다. 관리자께서 삭제해 주십시오.",
};

// HTTP expectations. status: exact; location: substring of Location; type: substring of Content-Type;
// body: substring; headers: {name: RegExp}. "{chem}" is replaced by an R2-backed chem_id (skipped if none).
export const HTTP_CASES = [
  { name: "root redirects to /chemip", path: "/", status: 301, location: "/chemip" },
  { name: "SPA entry", path: "/chemip", status: 200, type: "text/html", body: "window.CHEMIP_STATIC" },
  { name: "SPA trailing slash → /chemip", path: "/chemip/", status: 308, location: "/chemip" },
  { name: "SPA index.html → /chemip", path: "/chemip/index.html", status: 301, location: "/chemip" },
  { name: "robots.txt at root", path: "/robots.txt", status: 200, type: "text/plain", body: "Sitemap:" },
  { name: "sitemap.xml at root", path: "/sitemap.xml", status: 200, type: "xml", body: "<urlset" },
  { name: "Search Console file at root (200, no redirect)", path: "/google5299d3d91ba2dbe2.html", status: 200, type: "text/html",
    body: "google-site-verification: google5299d3d91ba2dbe2.html" },
  { name: "missing page → real 404", path: "/no-such-page", status: 404, type: "text/html" },
  { name: "missing search file → 404 (no SPA fallback)", path: "/data/v1/search/no-such.json", status: 404 },
  { name: "search manifest (Pages)", path: "/data/v1/search/manifest.json", status: 200, type: "application/json",
    headers: { "cache-control": /max-age=604800/ } },
  { name: "missing substance file → 404 JSON (Worker/R2)", path: "/data/v1/p/__no_such_chem__.json", status: 404, type: "application/json" },
  { name: "shared file from R2 (gzip, ETag)", path: "/data/v1/g/trade_catalog.json", status: 200, type: "application/json",
    headers: { "content-encoding": /gzip/, etag: /./, "cache-control": /max-age=604800/ } },
  { name: "substance file from R2 (gzip)", path: "/data/v1/p/{chem}.json", status: 200, type: "application/json",
    headers: { "content-encoding": /gzip/, etag: /./ } },
  { name: "patent mapping index from R2 (plain JSON)", path: "/data/v1/pat/71-43-2/index.json", status: 200, type: "application/json",
    body: "\"by_jurisdiction\"", headers: { etag: /./, "cache-control": /max-age=604800/ } },
  { name: "patent mapping jurisdiction file from R2 (gzip)", path: "/data/v1/pat/71-43-2/KR.json", status: 200, type: "application/json",
    headers: { "content-encoding": /gzip/, etag: /./ } },
  { name: "missing patent mapping → 404 JSON", path: "/data/v1/pat/10000-00-7/index.json", status: 404, type: "application/json" },
  { name: "API via Function → Worker: board meta", path: "/api/feedback/meta", status: 200, type: "application/json", body: "categories" },
  { name: "API via Function → Worker: usage summary", path: "/api/usage/summary", status: 200, type: "application/json" },
  { name: "vendor long cache", path: "/chemip/vendor/react.production.min.js", status: 200,
    headers: { "cache-control": /max-age=604800/ } },
  { name: "bundle immutable cache", path: "{bundle}", status: 200, type: "javascript", headers: { "cache-control": /immutable/ } },
  { name: "legacy /chemical/<id> → SPA substance view", path: "/chemical/001008", status: 302, location: "chem=001008" },
  // SEO substance pages keep the live Next URL (no trailing slash): file chemip/cas/<CAS>.html, served by pretty URLs.
  { name: "SEO substance page (live URL form)", path: "/chemip/cas/71-43-2", status: 200, type: "text/html", body: "/chemip/cas/71-43-2\"", optional: true },
  { name: "SEO substance trailing slash → no slash", path: "/chemip/cas/71-43-2/", status: 308, location: "/chemip/cas/71-43-2", optional: true },
  { name: "SEO hub", path: "/chemip/cas/", status: 200, type: "text/html", optional: true },
  { name: "test host is noindex", path: "/chemip", status: 200, headers: { "x-robots-tag": /noindex/ }, testHostOnly: true },
];

export const TIMING = {
  runs: 3,
  timeoutMs: 60000,
  flows: [
    { name: "landing", path: "/chemip", ready: ".shell" },
    { name: "search 벤젠", path: "/chemip?q=%EB%B2%A4%EC%A0%A0", ready: "tr[tabindex='0']" },
    { name: "substance", path: "/chemip?view=product&pv=chemical&chem={chem}", ready: ".tabs button", text: /MSDS/ },
  ],
};
