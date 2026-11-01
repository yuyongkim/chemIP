// (a) Static search in the browser modules vs the pilot's Python reference (static_search.py), on the pilot's
// 30 test queries, reading the pilot out/search files from disk. Optional --live also compares the production
// path with GET /api/chemicals?q=&limit=20 (sequential, <= 2 req/s).
//
//   node frontend/scripts/tests/test_static_search.cjs [--pilot E:\dev-cache\chemip-static-pilot] [--live] [--raw]
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadStaticModules } = require("./static_vm_loader.cjs");
const { firstDiff, makeLiveClient } = require("./test_util.cjs");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const PILOT = arg("--pilot", "E:\\dev-cache\\chemip-static-pilot");
const LIVE = process.argv.includes("--live");
const RAW = process.argv.includes("--raw");
const API = arg("--api", "http://127.0.0.1:7011/api");
const QUERIES = path.join(PILOT, "scripts", "test_queries.json");
const WORK = arg("--work", "E:/dev-cache/chemip-static-frontend-tests"); // scratch files stay off C:

function reference() {
  fs.mkdirSync(WORK, { recursive: true });
  const out = path.join(WORK, "search_reference.json");
  execFileSync("python", ["-I", "-B", path.join(__dirname, "static_search_reference.py"), PILOT, QUERIES, out], { stdio: "inherit" });
  return JSON.parse(fs.readFileSync(out, "utf8"));
}

async function main() {
  const t0 = Date.now();
  const ref = reference();
  console.log(`reference: ${ref.length} queries (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  const checks = { search: 0, full20: 0, auto5: 0, lean20: 0, api_shape: 0, mode: 0 };
  const fails = [];
  const modes = {};
  const live = LIVE ? makeLiveClient(API, 2) : null;
  let liveOk = 0;
  for (const r of ref) {
    // fresh context per query = cold browser cache, like the pilot measured
    const { win, stats } = loadStaticModules({ diskRoot: path.join(PILOT, "out"), raw: RAW });
    const idx = new win.StaticSearchIndex(rel => win.staticGetJson(win.staticUrl("search", rel)));
    await idx.init();
    const got = {
      search: await win.ssSearch(idx, r.q, 20),
      full20: await win.ssSearchChemicals(idx, r.q, 20, 0),
      auto5: await win.ssSearchChemicals(idx, r.q, 5, 0),
      lean20: await win.ssLean(idx, r.q, 20),
    };
    const want = { ...r };
    const jsMode = got.search.mode;
    modes[jsMode] = (modes[jsMode] || 0) + 1;
    if (jsMode === want.search.mode) checks.mode += 1;
    else fails.push(`${r.q} mode: ${jsMode} != ${want.search.mode}`);
    for (const k of ["search", "full20", "auto5", "lean20"]) {
      const a = { items: got[k].items, total: got[k].total };
      const b = { items: want[k].items, total: want[k].total };
      const d = firstDiff(a, b);
      if (!d) checks[k] += 1;
      else fails.push(`${r.q} ${k}: ${d}`);
    }
    // the exact function api.jsx calls, through the fetch layer and static_config URLs
    const apiShape = await win.staticChemicalSearch(r.q, 1, 20);
    const d = firstDiff(apiShape, { items: want.search.items, total: want.search.total });
    if (!d && Object.keys(apiShape).sort().join() === "items,total") checks.api_shape += 1;
    else fails.push(`${r.q} api_shape: ${d || Object.keys(apiShape)}`);
    if (live) {
      const res = await live.get(`/chemicals?q=${encodeURIComponent(r.q)}&limit=20`);
      const ld = res.status === 200 ? firstDiff(apiShape, res.data) : `status ${res.status}`;
      if (!ld) liveOk += 1;
      else fails.push(`${r.q} live: ${ld}`);
    }
    process.stdout.write(`  ${r.q} [${jsMode}] files=${stats.requests} kb=${(stats.bytes / 1024).toFixed(0)}\n`);
  }
  const n = ref.length;
  console.log("\nresults (pass / total):");
  for (const [k, v] of Object.entries(checks)) console.log(`  ${k.padEnd(10)} ${v} / ${n}`);
  if (live) console.log(`  live_api   ${liveOk} / ${n}`);
  console.log(`  modes      ${JSON.stringify(modes)}`);
  console.log(`  babel      ${RAW ? "raw source" : "transpiled like build_chemip.cjs"}`);
  if (fails.length) console.log(`\nfailures:\n  ${fails.join("\n  ")}`);
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exitCode = fails.length ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 2; });
