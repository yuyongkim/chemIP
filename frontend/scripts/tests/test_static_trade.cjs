// (b) Browser-side trade-controls assembly (static_trade_assembly.jsx via api_static.jsx) vs the live production API.
// Data: the pilot out/ folder (default; only CAS in the pilot sample, served under the contract paths by
// pilot_contract_shim.cjs) or the exporter output (--layout contract --data E:/dev-cache/chemip-static/out, CAS pages
// present so far). Also compares the static international / kr-permit-context answers and some chemical-detail files.
// The live API is production: requests are sequential, at most 2 per second.
//
//   node frontend/scripts/tests/test_static_trade.cjs [--layout pilot|contract] [--data DIR] [--n 50] [--details 20] [--api URL]
//
// destination.kotra is live-only (KOTRA API): it is removed from the live answer and the static answer must carry
// kotra = null with kotra_unavailable = "offline" for export + country.
// Lists added after the p/ export come from the sidecars g/intl_add* and g/intl_reg_add* (api_static_intl.jsx), as in the browser.
// ON_DEMAND lists: the static side carries only a bundled sample; the substance page looks the rest up per CAS. A live
// membership the static side lacks is allowlisted (removed from the live answer and counted), never faked.
"use strict";

const fs = require("fs");
const path = require("path");
const { loadStaticModules } = require("./static_vm_loader.cjs");
const { firstDiff, makeLiveClient } = require("./test_util.cjs");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const LAYOUT = arg("--layout", "pilot");
const DATA = arg("--data", LAYOUT === "pilot" ? "E:/dev-cache/chemip-static-pilot/out" : "E:/dev-cache/chemip-static/out");
const API = arg("--api", "http://127.0.0.1:7011/api");
const N = Number(arg("--n", 50));
const N_DETAILS = Number(arg("--details", 20));
const COUNTRIES = ["", "US", "EU", "CN", "JP", "VN"];
const DIRECTIONS = ["import", "export"];
const MUST = ["71-43-2", "108-88-3", "67-64-1", "7664-93-9", "50-00-0", "117-81-7"];
const CAS_RE = /^\d{2,7}-\d{2}-\d$/;
const ON_DEMAND = {
  EU_REACH_REGISTERED: "EU REACH registration: g/intl_add bundles ~250 key substances (ECHA legal notice 5.1.1 forbids bulk copies); " +
    "every other CAS is looked up on demand by the substance page (GET /api/reach/<CAS>, Worker + backend/api/routes/reach.py). " +
    "The PC list file and the exported sample can differ when one is refreshed before the other.",
};
const onDemandAllowed = {};

// Remove ON_DEMAND memberships that only the live answer has (intl_lists, destination.intl_lists, named_lists).
function dropOnDemand(live, mine) {
  const strip = (liveArr, mineArr) => {
    if (!Array.isArray(liveArr)) return liveArr;
    const mineIds = new Set((mineArr || []).map(m => m.list_id));
    return liveArr.filter(m => {
      if (!ON_DEMAND[m.list_id] || mineIds.has(m.list_id)) return true;
      onDemandAllowed[m.list_id] = (onDemandAllowed[m.list_id] || 0) + 1;
      return false;
    });
  };
  if (!live || !mine) return;
  if (live.intl_lists) live.intl_lists = strip(live.intl_lists, mine.intl_lists);
  if (live.named_lists) live.named_lists = strip(live.named_lists, mine.named_lists);
  if (live.destination && mine.destination) live.destination.intl_lists = strip(live.destination.intl_lists, mine.destination.intl_lists);
}

function pageIds() {
  const dir = LAYOUT === "pilot" ? path.join(DATA, "substances", "full", "d") : path.join(DATA, "v1", "p");
  return fs.readdirSync(dir).map(f => decodeURIComponent(f.replace(/\.json$/, ""))).sort();
}

function spread(all, n, must = []) {
  const picked = must.filter(c => all.includes(c));
  const step = all.length / n;
  for (let i = 0; picked.length < n && i < all.length; i++) {
    const c = all[Math.floor(i * step) % all.length];
    if (!picked.includes(c)) picked.push(c);
  }
  return picked.slice(0, n);
}

function pickCas() {
  const all = LAYOUT === "pilot"
    ? fs.readdirSync(path.join(DATA, "substances", "facts", "c")).map(f => f.replace(/\.json$/, "")).sort()
    : pageIds().filter(id => CAS_RE.test(id));
  return spread(all, N, MUST);
}

function stripKotra(live, mine, direction, country) {
  const errs = [];
  if (live && live.destination) delete live.destination.kotra;
  if (mine && mine.destination) {
    const wantFlag = direction === "export" && country && country !== "KR";
    if (mine.destination.kotra !== null) errs.push("static kotra must be null");
    if (wantFlag !== (mine.destination.kotra_unavailable === "offline")) errs.push("kotra_unavailable flag wrong");
    delete mine.destination.kotra;
    delete mine.destination.kotra_unavailable;
  }
  return errs;
}

async function main() {
  const t0 = Date.now();
  const { win } = loadStaticModules({ diskRoot: DATA, layout: LAYOUT });
  const live = makeLiveClient(API, 2);
  const cases = pickCas();
  const res = {
    trade: { pass: 0, total: 0 }, trade_assembled: { pass: 0, total: 0 }, international: { pass: 0, total: 0 },
    kr_permit_context: { pass: 0, total: 0 }, chemical_detail: { pass: 0, total: 0 },
  };
  const diffKeys = {};
  const fails = [];
  const record = (kind, label, d) => {
    res[kind].total += 1;
    if (!d) { res[kind].pass += 1; return; }
    fails.push(`${kind} ${label}: ${d}`);
    const key = `${kind} ${d.split(":")[0].replace(/\[\d+\]/g, "[]")}`;
    diffKeys[key] = (diffKeys[key] || 0) + 1;
  };
  for (const cas of cases) {
    for (const direction of DIRECTIONS) {
      for (const country of COUNTRIES) {
        const mine = await win.staticTradeControls(cas, direction, country);
        const q = new URLSearchParams({ direction, country }).toString();
        const got = await live.get(`/regulations/trade-controls/${encodeURIComponent(cas)}?${q}`);
        const label = `${cas} ${direction} ${country || "-"}`;
        if (got.status !== 200 || !mine) { record("trade", label, `live ${got.status} / static ${mine ? "ok" : "null"}`); continue; }
        const extra = stripKotra(got.data, mine, direction, country);
        dropOnDemand(got.data, mine);
        record("trade", label, extra.join("; ") || firstDiff(mine, got.data));
        // the stored default view (country "") is used as is; also check that assembling it gives the same answer
        if (!country) {
          const files = await Promise.all(["rulebook", "tradeCommon"].map(k => win.staticGetJson(win.staticUrl("pages", win.STATIC_LAYOUT.pages[k]))));
          const page = await win.staticGetJson(win.staticUrl("pages", win.STATIC_LAYOUT.pages.page(cas)));
          const [added, regAdded] = [await win.staticIntlAdded(cas), await win.staticIntlRegAdded(cas)];
          const merged = win.staticFactsWithSidecars(page, files[0], added, regAdded);
          const assembled = win.assembleTradeControls(merged.page, merged.rulebook, files[1], cas, direction, "");
          record("trade_assembled", label, firstDiff(assembled, got.data));
        }
      }
    }
    const intl = await live.get(`/regulations/international/${encodeURIComponent(cas)}`);
    const mineIntl = await win.staticIntl(cas);
    if (intl.status === 200) dropOnDemand(intl.data, mineIntl);
    record("international", cas, intl.status === 200 ? firstDiff(mineIntl, intl.data) : `live ${intl.status}`);
    const pc = await live.get(`/integrations/kr-permit-context/${encodeURIComponent(cas)}`);
    record("kr_permit_context", cas, pc.status === 200 ? firstDiff(await win.staticPermitContext(cas), pc.data) : `live ${pc.status}`);
    process.stdout.write(`  ${cas} trade ${res.trade.pass}/${res.trade.total} (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
  }
  for (const chemId of spread(pageIds(), N_DETAILS)) {
    const mine = await win.staticChemicalDetail(chemId);
    if (!mine) continue; // pilot: CAS pages without a detail file
    const got = await live.get(`/chemicals/${encodeURIComponent(chemId)}`);
    record("chemical_detail", chemId, got.status === 200 ? firstDiff(mine, got.data) : `live ${got.status}`);
  }
  console.log(`\nlayout: ${LAYOUT} (${DATA}), CAS checked: ${cases.length}, live requests: ${live.count()}`);
  console.log("results (pass / total):");
  for (const [k, v] of Object.entries(res)) console.log(`  ${k.padEnd(18)} ${v.pass} / ${v.total}`);
  for (const [id, n] of Object.entries(onDemandAllowed)) console.log(`  allowlisted on-demand ${id}: ${n} live-only membership(s) — ${ON_DEMAND[id]}`);
  if (Object.keys(diffKeys).length) console.log(`\ndiff locations:\n  ${Object.entries(diffKeys).map(([k, v]) => `${v}x ${k}`).join("\n  ")}`);
  if (fails.length) console.log(`\nfirst failures:\n  ${fails.slice(0, 40).join("\n  ")}`);
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exitCode = fails.length ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 2; });
