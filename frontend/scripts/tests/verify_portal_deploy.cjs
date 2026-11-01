// Deploy readiness for verify_portal_local.cjs: reads the deploy rules (site_rules.mjs, config.mjs, Worker config.js)
// and checks, per static area and per service, what production needs: files on disk, plausible count, gzip bytes,
// Worker route, Pages _routes.json include, index.html script/stylesheet lines.
"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const REPO = path.resolve(__dirname, "..", "..", "..");
const CHEMIP_DIR = path.join(REPO, "frontend", "public", "chemip");

async function loadDeployRules() {
  const imp = rel => import(pathToFileURL(path.join(REPO, rel)).href);
  const [rules, cfg, ui, worker] = await Promise.all([
    imp("deploy/cloudflare/site_rules.mjs"), imp("deploy/cloudflare/config.mjs"),
    imp("deploy/cloudflare/assemble/ui.mjs"), imp("cloudflare/worker/src/config.js"),
  ]);
  const V = cfg.SITE.static.version;
  const dataPrefix = `${cfg.SITE.static.base}/${V}`;
  const functionCovers = p => rules.FUNCTION_ROUTES.some(r => (r.endsWith("/*") ? p.startsWith(r.slice(0, -1)) : p === r));
  return {
    copies: rules.COPIES, functionRoutes: rules.FUNCTION_ROUTES, functionCovers,
    workerAreas: new Set(worker.STATIC_DATA.AREAS), patentArea: worker.STATIC_DATA.PATENT_AREA,
    staticOut: cfg.PATHS.staticOut, appPath: cfg.SITE.appPath, dataPrefix, injectStatic: ui.injectStatic,
  };
}

function areaDir(def, staticOut) {
  return def.root ? def.root : path.join(staticOut, def.dir);
}

// Count directory entries, stopping at `cap` (p/ holds 333k files on a slow disk).
function countEntries(dir, cap) {
  let n = 0;
  const subdirs = [];
  const d = fs.opendirSync(dir);
  try {
    let e;
    while ((e = d.readSync())) {
      n += 1;
      if (e.isDirectory() && subdirs.length < 50) subdirs.push(e.name);
      if (n >= cap) break;
    }
  } finally { d.closeSync(); }
  return { n, subdirs };
}

// Is <area>/<file> served in production? Worker route /data/:v/<area>/:file (or the patent route) + Pages _routes.json include.
function routeProblems(area, rules) {
  const problems = [];
  const isPat = area === rules.patentArea;
  if (!isPat && !rules.workerAreas.has(area)) problems.push(`"${area}" not in Worker config.js STATIC_DATA.AREAS`);
  if (!rules.functionCovers(`${rules.dataPrefix}/${area}/x.json`)) problems.push(`"${area}/" not in site_rules.mjs FUNCTION_ROUTES (Pages _routes.json)`);
  return problems;
}

function isGzip(file) {
  const fd = fs.openSync(file, "r");
  try {
    const b = Buffer.alloc(2);
    fs.readSync(fd, b, 0, 2, 0);
    return b[0] === 0x1f && b[1] === 0x8b;
  } finally { fs.closeSync(fd); }
}

function checkArea(key, def, rules) {
  const dir = areaDir(def, rules.staticOut);
  const out = { key, dir, exists: fs.existsSync(dir), problems: [] };
  if (!out.exists) { out.status = "MISSING"; return out; }
  const cap = Math.max(def.minFiles * 2, 50);
  const counted = countEntries(dir, cap);
  out.count = counted.n;
  out.countText = out.count >= cap ? `>=${cap}` : String(out.count);
  if (out.count < def.minFiles) out.problems.push(`only ${out.count} files (expected >= ${def.minFiles})`);
  for (const s of def.samples || []) {
    const f = path.join(dir, ...s.split("/"));
    if (!fs.existsSync(f)) out.problems.push(`sample missing: ${s}`);
    else if (def.gzip && !isGzip(f)) out.problems.push(`sample not gzip bytes: ${s}`);
  }
  if (def.worker) {
    out.problems.push(...routeProblems(def.patent ? rules.patentArea : def.dir, rules));
    // nested folders (feed/by-cas, reg/list) are their own Worker areas (route /data/:v/<area>/:file has one file segment)
    if (!def.patent) for (const sub of counted.subdirs) out.problems.push(...routeProblems(`${def.dir}/${sub}`, rules));
  }
  if (def.pagesCopy && !rules.copies.some(c => c.to && c.to.endsWith(`/${def.dir}`))) out.problems.push(`no COPIES rule for ${def.dir}/`);
  out.status = out.problems.length ? "FAIL" : "OK";
  return out;
}

function checkDataFile(rel, rules) {
  const f = path.join(rules.staticOut, ...rel.split("/"));
  if (!fs.existsSync(f)) return { file: rel, status: "MISSING" };
  const problems = routeProblems(rel.split("/").slice(0, -1).join("/"), rules);
  return { file: rel, status: problems.length ? "FAIL" : "OK", problems };
}

const BABEL_TAG = /<script type="text\/babel" src="([^"?]+)(?:\?[^"]*)?"><\/script>/g;
const CSS_TAG = /<link rel="stylesheet" href="([^"?]+)(?:\?[^"]*)?"/g;

function indexListing() {
  const html = fs.readFileSync(path.join(CHEMIP_DIR, "index.html"), "utf8");
  return { scripts: [...html.matchAll(BABEL_TAG)].map(m => m[1]), css: [...html.matchAll(CSS_TAG)].map(m => m[1]) };
}

// index.html lines for the service's own public/chemip files (.jsx scripts, .css stylesheets).
function checkListing(files, listing) {
  const problems = [];
  for (const abs of files) {
    const rel = path.relative(CHEMIP_DIR, abs).split(path.sep).join("/");
    if (rel.startsWith("..") || rel.startsWith("_legacy") || rel.startsWith("dist/")) continue;
    if (rel.endsWith(".jsx") && !listing.scripts.includes(rel)) problems.push(`index.html has no <script> for ${rel}`);
    if (rel.endsWith(".css") && !rel.includes("/") && !listing.css.includes(rel)) problems.push(`index.html has no stylesheet for ${rel}`);
  }
  return problems;
}

module.exports = { loadDeployRules, routeProblems, checkArea, checkDataFile, checkListing, indexListing, areaDir, REPO, CHEMIP_DIR };

// PC-on mode: a 404 for something that exists in the source tree / exporter output means the running PC processes
// (Next public file list, backend routes) predate it — a restart issue, not a code bug. Returns a reason or "".
function pcRestartReason(urlPath, rules, areaRoots) {
  const m = urlPath.match(/^\/chemip\/(.+)$/);
  if (m && fs.existsSync(path.join(CHEMIP_DIR, ...m[1].split("/")))) return "Next started before this public file existed";
  if (urlPath.startsWith(`${rules.dataPrefix}/`)) {
    const segs = urlPath.slice(rules.dataPrefix.length + 1).split("/");
    const root = areaRoots[segs[0]];
    if (root && fs.existsSync(path.join(root, ...segs.slice(1)))) return "PENDING next build (file exported; next.config.ts rewrite compiled at build time)";
  }
  const a = urlPath.match(/^\/api\/([a-z_-]+)/i);
  if (a) {
    const dir = path.join(REPO, "backend", "api", "routes");
    const hit = fs.existsSync(dir) && fs.readdirSync(dir).some(f => f.endsWith(".py") && f.replace(/\.py$/, "").split("_").includes(a[1].replace(/-/g, "_")));
    if (hit) return `backend has a ${a[1]} route in source; running backend predates it`;
  }
  return "";
}

module.exports.pcRestartReason = pcRestartReason;
