// Production-shaped local server for the "home PC off" check (verify_portal_local.cjs).
// Same paths as https://chemip.yule.pics with the PC off:
//   /chemip, /chemip/                → the scratch build's index.html with window.CHEMIP_STATIC injected (deploy/cloudflare/assemble/ui.mjs)
//   /chemip/dist/app.js              → the scratch build's bundle
//   other Pages files                → deploy/cloudflare/site_rules.mjs COPIES (vendor/, data/, assets/, faq/, *.css, search/, SEO pages)
//   /data/v1/<area>/<file>           → <area root>/<file>, only for areas the Worker routes (STATIC_DATA.AREAS / PATENT_AREA)
//                                      AND the Pages _routes.json include (site_rules FUNCTION_ROUTES); gzip bytes → Content-Encoding gzip
//   /api/*                           → 503 (the Worker cannot reach the home PC)
// Unrouted /data paths answer 404, as Pages would; they are counted in `stats.unrouted`.
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".csv": "text/csv; charset=utf-8",
  ".woff2": "font/woff2", ".woff": "font/woff", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon", ".jpg": "image/jpeg", ".webp": "image/webp", ".geojson": "application/json", ".topojson": "application/json",
  ".wasm": "application/wasm", // CoolProp (vendor/coolprop) — Pages serves .wasm as application/wasm
};
const OFFLINE = JSON.stringify({ error: "offline", message: "지금 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch (e) { return false; }
}

// COPIES rule → resolver(relPath) returning a file path or null. `to` is a path under the site root ("" = root).
function copyResolvers(copies) {
  return copies.map(rule => (rel) => {
    if (rule.glob) {
      if (!rel.startsWith(`${rule.to}/`)) return null;
      const name = rel.slice(rule.to.length + 1);
      if (name.includes("/") || !name.endsWith(rule.glob.ext)) return null;
      const f = path.join(rule.glob.dir, name);
      return isFile(f) ? f : null;
    }
    let rest;
    if (rule.to === "") rest = rel;
    else if (rel === rule.to) rest = "";
    else if (rel.startsWith(`${rule.to}/`)) rest = rel.slice(rule.to.length + 1);
    else return null;
    if (rule.exclude && rule.exclude.some(x => rest === x || rest.startsWith(`${x}/`))) return null;
    const base = rest ? path.join(rule.from, ...rest.split("/")) : rule.from;
    for (const cand of [base, `${base}.html`, path.join(base, "index.html")]) if (isFile(cand)) return cand;
    return null;
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end(body);
}

// opts: { pageHtml, bundleFile, copies, functionRoutes: [..], workerAreas: Set, patentArea, areaRoots: {first segment: dir},
//         dataPrefix: "/data/v1", appPath: "/chemip" }
// 404s get "x-verify: unrouted | missing-area | missing-file" so the browser check can tell a deploy-rule gap
// (unrouted), an area not exported yet (missing-area) and a missing file inside an exported area (missing-file) apart.
function dataRoute(p, opts) {
  const rest = p.slice(opts.dataPrefix.length + 1);
  const segs = rest.split("/");
  const first = segs[0];
  const root = opts.areaRoots[first] || "";
  const exported = Boolean(root) && fs.existsSync(root);
  const isFunction = opts.functionRoutes.some(r => (r.endsWith("/*") ? p.startsWith(r.slice(0, -1)) : p === r));
  if (!isFunction) return null; // Pages static asset (search/ via COPIES) — or nothing
  const workerOk = first === opts.patentArea
    ? segs.length === 3
    : opts.workerAreas.has(segs.slice(0, -1).join("/")) && /^[^/]+\.(json|xml)$/.test(segs[segs.length - 1]);
  if (!workerOk) return { status: 404, tag: "unrouted" };
  if (!exported) return { status: 404, tag: "missing-area" };
  const f = path.join(root, ...segs.slice(1));
  return isFile(f) ? { status: 200, file: f } : { status: 404, tag: "missing-file" };
}

function startOffServer(opts) {
  const resolvers = copyResolvers(opts.copies);
  const stats = { requests: 0, api: 0, unrouted: [], missingArea: [], missing: [] };
  const server = http.createServer((req, res) => {
    stats.requests += 1;
    const url = new URL(req.url, "http://x");
    let p;
    try { p = decodeURIComponent(url.pathname); } catch (e) { return send(res, 400, "bad path"); }
    if (p.includes("..")) return send(res, 403, "");
    if (p === "/api" || p.startsWith("/api/")) {
      stats.api += 1;
      return send(res, 503, OFFLINE, { "Content-Type": TYPES[".json"] });
    }
    if (p === opts.appPath || p === `${opts.appPath}/` || p === `${opts.appPath}/index.html`) {
      return send(res, 200, opts.pageHtml, { "Content-Type": TYPES[".html"] });
    }
    if (p === `${opts.appPath}/dist/app.js`) {
      return send(res, 200, fs.readFileSync(opts.bundleFile), { "Content-Type": TYPES[".js"] });
    }
    if (p.startsWith(`${opts.dataPrefix}/`)) {
      const r = dataRoute(p, opts);
      if (r && r.status === 200) {
        const body = fs.readFileSync(r.file);
        const h = { "Content-Type": TYPES[path.extname(r.file)] || TYPES[".json"] };
        if (body[0] === 0x1f && body[1] === 0x8b) h["Content-Encoding"] = "gzip";
        return send(res, 200, body, h);
      }
      if (r) {
        if (r.tag === "unrouted") stats.unrouted.push(p);
        if (r.tag === "missing-area") stats.missingArea.push(p);
        return send(res, 404, JSON.stringify({ detail: "Not Found" }), { "Content-Type": TYPES[".json"], "x-verify": r.tag });
      }
    }
    const rel = p.replace(/^\/+/, "");
    for (const r of resolvers) {
      const f = r(rel);
      if (f) {
        const body = fs.readFileSync(f);
        const h = { "Content-Type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream" };
        if (body[0] === 0x1f && body[1] === 0x8b) h["Content-Encoding"] = "gzip";
        return send(res, 200, body, h);
      }
    }
    if (p.startsWith(`${opts.dataPrefix}/`)) {
      const first = p.slice(opts.dataPrefix.length + 1).split("/")[0];
      const root = opts.areaRoots[first];
      const tag = root && fs.existsSync(root) ? "unrouted" : "missing-area";
      (tag === "unrouted" ? stats.unrouted : stats.missingArea).push(p);
      return send(res, 404, "not found", { "Content-Type": "text/plain", "x-verify": tag });
    }
    stats.missing.push(p);
    return send(res, 404, "not found", { "Content-Type": "text/plain" });
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({ port, origin: `http://127.0.0.1:${port}`, stats, close: () => new Promise(r => { server.closeAllConnections?.(); server.close(() => r()); }) });
    });
  });
}

module.exports = { startOffServer, copyResolvers };
