// Static extras (p/<chem_id>.x.json, g/guides_status.json via api_static_extras.jsx) and the PC-only gate (api_origin.jsx).
//
//   node frontend/scripts/tests/test_static_extras.cjs [--data E:/dev-cache/chemip-static/out] [--live] [--n 12] [--api URL]
//
// Offline part (always):
//   1. the readers return the stored parts for a few known substances (benzene 001008 / 71-43-2, toluene, ammonia)
//   2. static deployment, PC unreachable: the first PC-only call sends ONE probe and no other /api request; every later
//      PC-only call sends nothing; the error is the neutral API_LABELS.liveOnly notice (offline=true, liveOnly=true)
//   3. PC site (no CHEMIP_STATIC base): originGet is a plain apiGet — one request per call, the usual offline message
//   4. tx/<CAS>.json (Texas emission events): a file → its body; no file → the empty answer (total 0) with NO /api request,
//      so a static deployment shows "none" while the PC is off; PC site → null (the hook calls /api)
// --live: incidents / enforcement / handlers PRTR parts vs the production API (sequential, 2/s). guides are not
//   compared live: the live route writes its mapping cache on first use (side effect) and then answers from it.
"use strict";

const fs = require("fs");
const path = require("path");
const { loadStaticModules } = require("./static_vm_loader.cjs");
const { firstDiff, makeLiveClient } = require("./test_util.cjs");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const DATA = arg("--data", "E:/dev-cache/chemip-static/out");
const API = arg("--api", "http://127.0.0.1:7011/api");
const LIVE = process.argv.includes("--live");
const N = Number(arg("--n", 12));
const EXTRA_MODULES = ["api_static_extras.jsx", "api_core.jsx", "api_origin.jsx"];
const KNOWN = [["001008", "71-43-2"], ["108-88-3", "108-88-3"], ["7664-41-7", "7664-41-7"]];
const HANDLER_LOCAL = ["prtr_summary", "prtr_aggregates", "prtr_facilities"];

const results = [];
function check(name, ok, note = "") {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}

// /api/** requests go here instead of the network: count them, answer like the Worker with the PC off (503 JSON).
function withApiStub(win) {
  const calls = [];
  const diskFetch = win.fetch;
  win.fetch = async (url, init) => {
    if (String(url).startsWith("/api/")) {
      calls.push(String(url));
      return new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "content-type": "application/json" } });
    }
    return diskFetch(url, init);
  };
  return calls;
}

async function rejects(p) {
  try { await p; return null; } catch (e) { return e; }
}

async function offlineChecks() {
  const { win } = loadStaticModules({ diskRoot: DATA, layout: "contract", extraModules: EXTRA_MODULES });
  for (const [chemId, cas] of KNOWN) {
    const [g, h, inc, enf] = await Promise.all([
      win.staticGuideRecommendations(chemId), win.staticHandlers(chemId), win.staticIncidents(cas), win.staticEnforcement(cas),
    ]);
    check(`extras ${chemId}: guides / handlers / incidents / enforcement present`,
      g && Array.isArray(g.recommendations) && h && h.sources && inc && inc.cas_no === cas && enf && enf.cas_no === cas,
      `guides ${g?.total}, facilities ${h?.sources?.prtr_facilities?.total}, incidents ${inc?.total}, enforcement ${enf?.total}`);
  }
  const status = await win.staticGuideStatus();
  check("g/guides_status.json present", status && status.loaded === true, status ? `meta_count ${status.meta_count}` : "missing");
  check("kind 'kosha' file carries no CAS panels (read by CAS instead)",
    (await win.staticGetJson(win.staticUrl("pages", win.STATIC_LAYOUT.pages.extras("001008"))))?.incidents === null);
  check("invalid CAS → null (no request)", (await win.staticIncidents("not-a-cas")) === null);

  // static deployment, PC off
  const calls = withApiStub(win);
  const e1 = await rejects(win.originGet("/regulations/intelligence/001008?limit=6", 30000));
  check("static: first PC-only call → probe only, then neutral notice",
    e1 && e1.liveOnly && e1.offline && win.apiIsNotice(e1.message) && calls.length === 1 && calls[0].startsWith("/api/guides/status"),
    `requests ${JSON.stringify(calls)}`);
  const before = calls.length;
  const more = await Promise.all([
    rejects(win.originGet("/integrations/provisions/71-43-2?country=US&name=", 45000)),
    rejects(win.originGet("/handlers?chem_id=x")),
    rejects(win.originGet("/regulations/trade-controls/71-43-2?direction=export&country=US", 12000)),
  ]);
  check("static: later PC-only calls send no request", calls.length === before && more.every(e => e && e.liveOnly),
    `requests after probe ${calls.length - before}`);

  // PC site: no gate
  const pc = loadStaticModules({ diskRoot: DATA, layout: "contract", config: { base: "", searchBase: "" }, extraModules: EXTRA_MODULES });
  const pcCalls = withApiStub(pc.win);
  const e2 = await rejects(pc.win.originGet("/regulations/intelligence/001008?limit=6", 30000));
  const e3 = await rejects(pc.win.originGet("/regulations/intelligence/001008?limit=6", 30000));
  check("PC site: originGet = apiGet (one request per call, usual offline message)",
    pcCalls.length === 2 && e2 && e3 && !e2.liveOnly && e2.message === pc.win.API_LABELS.offline, `requests ${pcCalls.length}`);
  check("PC site: static readers off", (await pc.win.staticHandlers("001008")) === null);
}

async function tceqChecks() {
  const TX_HIT = "106-99-0", TX_NONE = "7440-57-5";
  const { win } = loadStaticModules({ diskRoot: DATA, layout: "contract", extraModules: EXTRA_MODULES });
  const calls = withApiStub(win);
  const viaHook = cas => win.staticFirst(() => win.staticTceqEvents(cas),
    () => win.originGet(`/integrations/tceq-events/${encodeURIComponent(cas)}?limit=6`));
  const hit = await viaHook(TX_HIT);
  check(`tx ${TX_HIT}: file body`, hit && hit.cas_no === TX_HIT && hit.total > 0 && Array.isArray(hit.recent), `total ${hit?.total}`);
  const none = await viaHook(TX_NONE);
  check(`tx ${TX_NONE}: no file → empty answer, no /api request`,
    none && none.available === true && none.total === 0 && none.recent.length === 0 && calls.length === 0, `requests ${calls.length}`);
  check("tx invalid CAS → null", (await win.staticTceqEvents("not-a-cas")) === null);
  const pc = loadStaticModules({ diskRoot: DATA, layout: "contract", config: { base: "", searchBase: "" }, extraModules: EXTRA_MODULES });
  check("PC site: tx reader off", (await pc.win.staticTceqEvents(TX_HIT)) === null);
}

function sampleCas(n) {
  const dir = path.join(DATA, "v1", "p");
  const ids = fs.readdirSync(dir).filter(f => f.endsWith(".x.json")).map(f => decodeURIComponent(f.slice(0, -7)))
    .filter(id => /^\d{2,7}-\d{2}-\d$/.test(id)).sort();
  const must = KNOWN.map(k => k[1]).filter(c => ids.includes(c));
  const step = Math.max(1, Math.floor(ids.length / n));
  for (let i = 0; must.length < n && i < ids.length; i += step) if (!must.includes(ids[i])) must.push(ids[i]);
  return must;
}

async function liveChecks() {
  const { win } = loadStaticModules({ diskRoot: DATA, layout: "contract", extraModules: EXTRA_MODULES });
  const live = makeLiveClient(API, 2);
  const tally = { incidents: [0, 0], enforcement: [0, 0], handlers_local: [0, 0] };
  const fails = [];
  const rec = (k, label, d) => { tally[k][1] += 1; if (!d) tally[k][0] += 1; else fails.push(`${k} ${label}: ${d}`); };
  for (const cas of sampleCas(N)) {
    const inc = await live.get(`/integrations/incidents/${encodeURIComponent(cas)}?limit=8`);
    rec("incidents", cas, inc.status === 200 ? firstDiff(await win.staticIncidents(cas), inc.data) : `live ${inc.status}`);
    const enf = await live.get(`/integrations/enforcement/${encodeURIComponent(cas)}?limit=6`);
    rec("enforcement", cas, enf.status === 200 ? firstDiff(await win.staticEnforcement(cas), enf.data) : `live ${enf.status}`);
    const q = new URLSearchParams({ chem_id: cas, cas, name: "", name_en: "", facility_limit: 50 }).toString();
    const h = await live.get(`/handlers?${q}`);
    const mine = await win.staticHandlers(cas);
    if (h.status !== 200 || !mine) { rec("handlers_local", cas, `live ${h.status} / static ${mine ? "ok" : "null"}`); continue; }
    // only the parts the local PRTR cache answers; facilities only when the cache had them (else the live portal)
    const parts = HANDLER_LOCAL.filter(k => k !== "prtr_facilities" || mine.sources.prtr_facilities.available);
    const pick = o => Object.fromEntries(parts.map(k => [k, o.sources[k]]));
    rec("handlers_local", cas, firstDiff({ query: mine.query, ...pick(mine) }, { query: h.data.query, ...pick(h.data) }));
  }
  for (const [k, [p, t]] of Object.entries(tally)) check(`live ${k} ${p}/${t}`, p === t);
  if (fails.length) console.log(`  ${fails.slice(0, 20).join("\n  ")}`);
  console.log(`live requests: ${live.count()}`);
}

async function main() {
  await offlineChecks();
  await tceqChecks();
  if (LIVE) await liveChecks();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} / ${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 2; });
