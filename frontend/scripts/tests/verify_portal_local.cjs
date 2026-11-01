// Local verification of the portal services before deploy — especially with the home PC off.
//
//   set NODE_PATH=G:\MSDS\frontend\node_modules
//   node frontend/scripts/tests/verify_portal_local.cjs [--modes off,on] [--only usearch,calc] [--suites none|fast|all]
//        [--out DIR] [--concurrency 4] [--pc-base http://127.0.0.1:7000/chemip] [--langs ko,en] [--widths 1440,390] [--skip-build]
//
// 1) builds a SCRATCH copy of the site (build_chemip.cjs --out <out>/build; the live public/chemip/dist is never touched)
// 2) PC-off mode: verify_portal_server.cjs serves it with production paths (/chemip, /data/v1/<area> from the exporter's
//    out/v1 with gzip Content-Encoding, only areas the Worker and Pages route; /api/* → 503)
// 3) PC-on mode: the running PC site (default http://127.0.0.1:7000/chemip)
// 4) Playwright check list from verify_portal_spec.cjs (ko/en × 1440/390); deploy readiness per static area and service
// 5) optional: the existing suites (verify_portal_suites.cjs)
// Prints a per-service table and writes <out>/portal_report_<time>.json (+ portal_report_latest.json).
// Services whose files do not exist yet are "NOT YET". Exit code 1 if any service FAILs (or a suite fails).
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");

const spec = require("./verify_portal_spec.cjs");
const { startOffServer } = require("./verify_portal_server.cjs");
const { loadDeployRules, checkArea, checkDataFile, checkListing, indexListing, areaDir, pcRestartReason, REPO, CHEMIP_DIR } = require("./verify_portal_deploy.cjs");
const { runPool } = require("./verify_portal_browser.cjs");
const { runSuites } = require("./verify_portal_suites.cjs");
const report = require("./verify_portal_report.cjs");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const list = (s) => (s ? s.split(",").map(x => x.trim()).filter(Boolean) : null);
const OPTS = {
  modes: list(arg("--modes", "off,on")),
  only: list(arg("--only", "")),
  suites: arg("--suites", "none"),
  out: path.resolve(arg("--out", "E:/dev-cache/chemip-portal-verify")),
  concurrency: Number(arg("--concurrency", 4)),
  pcBase: arg("--pc-base", "http://127.0.0.1:7000/chemip").replace(/\/+$/, ""),
  langs: list(arg("--langs", "")) || spec.DEFAULTS.langs,
  widths: (list(arg("--widths", "")) || spec.DEFAULTS.widths).map(Number),
  skipBuild: process.argv.includes("--skip-build"),
};

// "dir/name*.jsx" → existing absolute paths ("*" only in the last segment)
function globFiles(rel) {
  const abs = path.join(REPO, ...rel.split("/"));
  if (!rel.includes("*")) return fs.existsSync(abs) ? [abs] : [];
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) return [];
  const re = new RegExp(`^${path.basename(abs).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
  return fs.readdirSync(dir).filter(f => re.test(f)).map(f => path.join(dir, f));
}

function detectService(svc) {
  const detected = (svc.detect || []).flatMap(globFiles);
  const missingRequired = (svc.requires || []).filter(r => !globFiles(r).length);
  const own = [...new Set([...detected, ...(svc.jsx || []).flatMap(globFiles), ...(svc.css || []).flatMap(globFiles)])];
  const newest = Math.max(0, ...[...detected, ...(svc.requires || []).flatMap(globFiles)].map(f => fs.statSync(f).mtimeMs));
  return { detected: detected.length > 0, files: own, missingRequired, newest };
}

function buildScratch(outDir) {
  const buildDir = path.join(outDir, "build");
  if (OPTS.skipBuild && fs.existsSync(path.join(buildDir, "app.js"))) return { ok: true, buildDir, skipped: true };
  fs.rmSync(buildDir, { recursive: true, force: true });
  const r = spawnSync(process.execPath, [path.join(REPO, "frontend", "scripts", "build_chemip.cjs"), "--out", buildDir], { encoding: "utf8" });
  return { ok: r.status === 0, buildDir, log: `${r.stdout || ""}${r.stderr || ""}`.trim().split(/\r?\n/).slice(-6) };
}

function reachable(url) {
  return new Promise(resolve => {
    const req = http.get(url, res => { res.resume(); resolve(res.statusCode < 500); });
    req.on("error", () => resolve(false));
    req.setTimeout(8000, () => { req.destroy(); resolve(false); });
  });
}

function pageTasks(services) {
  const tasks = [];
  for (const s of services) {
    for (const page of s.pages || []) {
      for (const lang of (page.langs || OPTS.langs).filter(l => OPTS.langs.includes(l))) {
        for (const width of (page.widths || OPTS.widths).filter(w => OPTS.widths.includes(w))) {
          tasks.push({ service: s.key, page, lang, width, views: s.views, modes: page.modes });
        }
      }
    }
  }
  return tasks;
}

async function main() {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  fs.mkdirSync(OPTS.out, { recursive: true });
  const rules = await loadDeployRules();

  // services: detection + deploy readiness
  const services = spec.SERVICES.filter(s => !OPTS.only || OPTS.only.includes(s.key));
  const det = Object.fromEntries(services.map(s => [s.key, detectService(s)]));
  const listing = indexListing();
  const areaKeys = [...new Set(services.filter(s => det[s.key].detected).flatMap(s => s.areas || []))];
  console.log(`deploy readiness: ${areaKeys.length} static areas`);
  const areaChecks = Object.fromEntries(areaKeys.map(k => [k, checkArea(k, spec.STATIC_AREAS[k] || { dir: k, minFiles: 1, worker: true }, rules)]));
  for (const a of Object.values(areaChecks)) console.log(`  ${a.status.padEnd(7)} ${a.key}/ ${a.countText || ""}${a.problems.length ? ` — ${a.problems.join("; ")}` : ""}`);

  // scratch build + PC-off server
  const build = OPTS.modes.includes("off") ? buildScratch(OPTS.out) : null;
  if (build) console.log(`scratch build: ${build.ok ? "ok" : "FAILED"} ${build.buildDir}${build.ok ? "" : `\n  ${build.log.join("\n  ")}`}`);
  const allTasks = pageTasks(services.filter(s => det[s.key].detected));
  const results = { off: [], on: [] };
  const modeInfo = {};
  let off = null;
  const areaRoots = {};
  for (const a of new Set([...[...rules.workerAreas].map(x => x.split("/")[0]), ...Object.keys(spec.STATIC_AREAS)])) {
    const def = spec.STATIC_AREAS[a] || { dir: a };
    areaRoots[def.patent ? rules.patentArea : def.dir] = areaDir(def, rules.staticOut);
  }
  if (build?.ok) {
    const pageHtml = rules.injectStatic(fs.readFileSync(path.join(build.buildDir, "index.html"), "utf8"));
    off = await startOffServer({
      pageHtml, bundleFile: path.join(build.buildDir, "app.js"), copies: rules.copies, areaRoots,
      functionRoutes: rules.functionRoutes, workerAreas: rules.workerAreas, patentArea: rules.patentArea,
      dataPrefix: rules.dataPrefix, appPath: rules.appPath,
    });
    const tasks = allTasks.filter(t => !t.modes || t.modes.includes("off"));
    console.log(`\nPC-off mode: ${off.origin}${rules.appPath} — ${tasks.length} page checks`);
    results.off = await runPool(tasks, {
      mode: "off", base: `${off.origin}${rules.appPath}`, defaults: spec.DEFAULTS, hangulExclude: spec.HANGUL_EXCLUDE,
      allowHttp: spec.ALLOW_HTTP,
    }, OPTS.concurrency);
    modeInfo.off = { base: `${off.origin}${rules.appPath}`, requests: off.stats.requests, api503: off.stats.api,
      unrouted: [...new Set(off.stats.unrouted)].slice(0, 30), missingArea: [...new Set(off.stats.missingArea)].slice(0, 30),
      missing: [...new Set(off.stats.missing)].slice(0, 30) };
    await off.close();
  } else if (build) {
    modeInfo.off = { buildFailed: build.log };
  }

  // PC-on mode
  const liveDist = path.join(CHEMIP_DIR, "dist", "app.js");
  const liveDistMtime = fs.existsSync(liveDist) ? fs.statSync(liveDist).mtimeMs : 0;
  if (OPTS.modes.includes("on")) {
    const up = await reachable(OPTS.pcBase);
    modeInfo.on = { base: OPTS.pcBase, reachable: up, liveDistBuilt: liveDistMtime ? new Date(liveDistMtime).toISOString() : null };
    if (up) {
      const tasks = allTasks.filter(t => !t.modes || t.modes.includes("on"));
      console.log(`\nPC-on mode: ${OPTS.pcBase} — ${tasks.length} page checks (live dist built ${modeInfo.on.liveDistBuilt})`);
      results.on = await runPool(tasks, {
        mode: "on", base: OPTS.pcBase, defaults: spec.DEFAULTS, hangulExclude: spec.HANGUL_EXCLUDE, allowHttp: spec.ALLOW_HTTP,
        restartReason: p => pcRestartReason(p, rules, areaRoots),
      }, OPTS.concurrency);
    } else console.log(`\nPC-on mode: ${OPTS.pcBase} not reachable — skipped`);
  }

  // per-service rows
  const rows = services.map(s => {
    const d = det[s.key];
    const row = { key: s.key, name: s.name, detected: d.detected, off: "-", on: "-", notes: [] };
    if (!d.detected) { row.deploy = { status: "-", notes: [] }; row.overall = "NOT YET"; return row; }
    const offRes = results.off.filter(r => r.service === s.key);
    const onRes = results.on.filter(r => r.service === s.key);
    row.off = !OPTS.modes.includes("off") ? "-" : build?.ok ? report.modeStatus(offRes) : "FAIL";
    if (build && !build.ok) row.notes.push(`scratch build failed: ${build.log.slice(-2).join(" ")}`);
    row.on = !OPTS.modes.includes("on") ? "-" : report.modeStatus(onRes, { skipped: !modeInfo.on?.reachable, stale: d.newest > liveDistMtime });
    const dataChecks = (s.dataFiles || []).map(f => checkDataFile(f, rules));
    row.deploy = report.deployStatus(s, areaChecks, dataChecks, checkListing(d.files, listing), d.missingRequired);
    row.notes.push(...report.failNotes([...offRes, ...(row.on === "STALE" ? [] : onRes)]));
    row.pending = [...new Set(offRes.flatMap(r => r.pending || []))].slice(0, 20);
    row.pcRestart = [...new Set(onRes.flatMap(r => (r.pending || []).filter(x => x.startsWith("pc-restart"))))].slice(0, 20);
    if (row.on === "STALE") row.notes.push("PC-on: live dist/app.js is older than this service's files (rebuild the live site to check PC-on)");
    row.overall = report.overall(row);
    return row;
  });

  let suites = null;
  if (OPTS.suites !== "none") {
    console.log(`\nsuites (${OPTS.suites}):`);
    suites = await runSuites({ slow: OPTS.suites === "all" });
  }

  report.printTable(rows, modeInfo);
  if (suites) {
    console.log("\nsuites:");
    for (const s of suites) console.log(`  ${s.ok ? "PASS" : "FAIL"} ${s.key} (${s.secs}s)`);
  }
  const file = report.writeReport(OPTS.out, {
    startedAt, secs: Math.round((Date.now() - t0) / 1000), options: OPTS, modes: modeInfo, areas: areaChecks, rows, suites,
    pages: [...results.off, ...results.on],
  });
  console.log(`\nreport: ${file} (${Math.round((Date.now() - t0) / 1000)}s)`);
  process.exitCode = rows.some(r => r.overall === "FAIL") || (suites && suites.some(s => !s.ok)) ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 2; });
