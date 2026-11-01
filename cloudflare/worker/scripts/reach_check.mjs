// Tests of GET /api/reach/<CAS> (src/routes/reach.js + src/reach/*) with a mocked ECHA CHEM, a fake D1 and no Cache API.
//   node cloudflare/worker/scripts/reach_check.mjs                       mocked tests (+ parity with the bundled list
//                                                                        when the parser's raw ECHA answers are on disk)
//   node cloudflare/worker/scripts/reach_check.mjs --live 64-17-5 …      the same lookup code against the real ECHA CHEM
//                                                                        (sequential, 1.5 s apart; no cache, no D1)
// Parity: the parser (scripts/trade_controls/intl/parse_echa_reach.py) saved every ECHA answer it used under RAW_DIR;
// serving those files to the Worker code must give exactly the entries of backend/.../EU_REACH_REGISTERED.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { casIsValid } from "../src/lib/cas.js";
import { lookupReach, reachTtl } from "../src/reach/lookup.js";
import { detailText } from "../src/reach/summary.js";
import { reach } from "../src/routes/reach.js";
import { REACH } from "../src/config.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const LIST = path.join(ROOT, "backend", "data", "trade_controls", "intl_lists", "EU_REACH_REGISTERED.json");
const RAW_DIR = "S:/chemip_trade_controls_raw/intl/echa/reach_reg";

let failed = 0;
function check(name, ok, info = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !info ? "" : `  — ${info}`}`);
}
const jsonRes = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// ── fake ECHA from a table {cas: {search, substance, dossiers}} ──
function fakeEcha(table, calls) {
  return async (url, init) => {
    const u = new URL(url);
    calls.push({ url, ua: init && init.headers && init.headers["user-agent"] });
    if (u.pathname === REACH.SEARCH) {
      const t = table[u.searchParams.get("searchText")];
      return t && t.status ? new Response("err", { status: t.status }) : jsonRes(t ? t.search : { items: [], state: { totalItems: 0 } });
    }
    const rml = u.searchParams.get("rmlId") || decodeURIComponent(u.pathname.slice(REACH.SUBSTANCE.length));
    const rec = Object.values(table).find(t => t.substance && t.substance.rmlId === rml);
    if (!rec) return new Response("nf", { status: 404 });
    if (u.pathname.startsWith(REACH.SUBSTANCE)) return jsonRes(rec.substance);
    const size = Number(u.searchParams.get("pageSize")), page = Number(u.searchParams.get("pageIndex"));
    const all = rec.dossiers || [];
    return jsonRes({ items: all.slice((page - 1) * size, page * size), state: { totalItems: all.length } });
  };
}

// ── fake D1 (only the statements the Worker uses) ──
function fakeDb() {
  const t = { reach_cache: new Map(), rate_events: [], daily_salt: new Map() };
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async first() {
      if (sql.startsWith("SELECT answer_json")) return t.reach_cache.get(args[0]) || null;
      if (sql.startsWith("SELECT salt")) return { salt: t.daily_salt.get(args[0]) };
      if (sql.startsWith("SELECT COUNT")) return { n: t.rate_events.filter(e => e.scope === args[0] && e.key === args[1] && e.ts >= args[2]).length };
      throw new Error(`unexpected ${sql}`);
    },
    async run() {
      if (sql.startsWith("INSERT OR REPLACE INTO reach_cache")) t.reach_cache.set(args[0], { answer_json: args[2], expires_at: args[4] });
      else if (sql.startsWith("INSERT OR IGNORE INTO daily_salt")) { if (!t.daily_salt.has(args[0])) t.daily_salt.set(args[0], args[1]); }
      else if (sql.startsWith("INSERT INTO rate_events")) t.rate_events.push({ scope: args[0], key: args[1], ts: args[2] });
      else if (sql.startsWith("DELETE FROM rate_events")) t.rate_events = t.rate_events.filter(e => !(e.scope === args[0] && e.ts < args[1]));
      else throw new Error(`unexpected ${sql}`);
      return {};
    },
  });
  return { prepare: sql => stmt(sql), tables: t };
}

async function call(env, cas) {
  const request = new Request(`https://x/api/reach/${cas}`, { headers: { "cf-connecting-ip": "203.0.113.9" } });
  const waits = [];
  const res = await reach({ request, env, ctx: { waitUntil: p => waits.push(p) }, params: { cas } });
  await Promise.all(waits);
  return { status: res.status, cc: res.headers.get("cache-control"), body: await res.json() };
}

const ETHANOL = {
  search: { items: [
    { substanceIndex: { rmlId: "100.000.526", rmlName: "Ethanol", rmlEc: "200-578-6", rmlCas: "64-17-5", casNumber: ["64-17-5"], listParticipation: ["REACH REGISTERED"] } },
    { substanceIndex: { rmlId: "100.212.831", rmlName: "Mixture of 25086-89-9 and 64-17-5", rmlCas: "-", casNumber: ["-"], listParticipation: null } },
  ] },
  substance: { rmlId: "100.000.526", rmlName: "Ethanol", rmlEc: "200-578-6", tonnageBand: "1,000,000 - 10,000,000  tonnes", listParticipation: ["REACH REGISTERED"] },
  dossiers: [
    ...Array.from({ length: 3 }, (_, i) => ({ registrationDate: `2010-0${i + 7}-26`, lastUpdatedDate: `2024-08-3${i}`, reachDossierInfo: { dossierSubtype: "Article 10 - full", nonsAssetFlag: "F", registrationRole: i ? "Member" : "Lead (joint submission)" } })),
    { registrationDate: "2013-05-01", lastUpdatedDate: "2025-01-02", reachDossierInfo: { dossierSubtype: "Article 18 - intermediate", nonsAssetFlag: "T" } },
  ],
};

async function mocked() {
  check("CAS check digit: 64-17-5 valid, 64-17-6 not, 7647-01-0 valid", casIsValid("64-17-5") && !casIsValid("64-17-6") && casIsValid("7647-01-0"));
  check("detail text matches the parser (tests/test_eu_lists.py case)", detailText(
    { rmlId: "100.000.742", rmlEc: "200-815-3", tonnageBand: "10,000,000 - 100,000,000 tonnes" },
    { types: { "full registration (Art. 10)": 511 }, nons: 0, first_registered: "2010-08-09", last_updated: "2026-10-14" }, 511)
    === "EC 200-815-3; REACH registered — active registrations 511 (full registration (Art. 10) 511); total tonnage band 10,000,000 - 100,000,000 tonnes per annum; first registration 2010-08-09; latest dossier update 2026-10-14; ECHA CHEM https://chem.echa.europa.eu/100.000.742");

  const calls = [];
  globalThis.fetch = fakeEcha({ "64-17-5": ETHANOL, "7647-01-0": { status: 503 }, "50-00-0": { search: { items: [
    { substanceIndex: { rmlId: "a", rmlCas: "50-00-0", casNumber: ["50-00-0"] } }, { substanceIndex: { rmlId: "b", rmlCas: "50-00-0", casNumber: ["50-00-0"] } }] } } }, calls);
  const env = { DB: fakeDb() };

  const a = await call(env, "64-17-5");
  const e = a.body.entry || {};
  check("registered: status, registered:true, attribution", a.status === 200 && a.body.status === "registered" && a.body.registered === true
    && a.body.attribution === "Source: European Chemicals Agency, https://echa.europa.eu/", JSON.stringify(a.body).slice(0, 300));
  check("registered: entry fields", e.ec === "200-578-6" && e.active_registrations === 4 && e.nons === 1 && e.tonnage_band === "1,000,000 - 10,000,000 tonnes"
    && e.first_registered === "2010-07-26" && e.last_updated === "2025-01-02" && e.url === "https://chem.echa.europa.eu/100.000.526"
    && JSON.stringify(e.registration_types) === JSON.stringify({ "full registration (Art. 10)": 3, "transported isolated intermediate (Art. 18)": 1 }), JSON.stringify(e));
  check("registered: browser cache 1 day, D1 row 30 days", a.cc === REACH.BROWSER_CACHE.registered
    && env.DB.tables.reach_cache.get("64-17-5").expires_at - Math.floor(Date.now() / 1000) > 29 * 86400);
  check("every ECHA request names ChemIP in the user agent", calls.length === 3 && calls.every(c => /ChemIP/.test(c.ua || "")), String(calls.length));
  const n = calls.length;
  const b = await call(env, "64-17-5");
  check("second request: from cache, no ECHA call", b.body.cached === true && b.body.status === "registered" && calls.length === n);

  const c = await call(env, "1234-56-6"); // valid check digit, not in ECHA
  check("not registered: registered:false, cached 7 days", c.body.status === "not_registered" && c.body.registered === false && c.body.reason === "no_substance"
    && c.cc === REACH.BROWSER_CACHE.not_registered && env.DB.tables.reach_cache.get("1234-56-6").expires_at - Math.floor(Date.now() / 1000) <= 7 * 86400);

  const d = await call(env, "7647-01-0"); // ECHA 503
  check("upstream failure: unknown, not cached, no-store", d.body.status === "unknown" && d.body.registered === null && /upstream/.test(d.body.reason)
    && d.cc === "no-store" && !env.DB.tables.reach_cache.has("7647-01-0"), JSON.stringify(d.body));

  const f = await call(env, "50-00-0");
  check("two ECHA substances with that CAS: unknown (ambiguous), kept like not-registered", f.body.status === "unknown" && /^ambiguous/.test(f.body.reason) && reachTtl(f.body) === REACH.TTL_NONE_S);

  let bad = null;
  try { await call(env, "64-17-6"); } catch (err) { bad = err; }
  check("invalid check digit → 422 validation error", bad && bad.constructor.name === "ValidationError");

  const env2 = { DB: fakeDb() };
  let last = null;
  for (let i = 0; i <= REACH.UPSTREAM_MAX; i++) last = await call(env2, "7647-01-0"); // misses (503 → never cached)
  check(`more than ${REACH.UPSTREAM_MAX} misses a minute → 429 rate_limited`, last.status === 429 && last.body.reason === "rate_limited" && last.body.status === "unknown");

  const env3 = { DB: { prepare() { throw new Error("no such table: reach_cache"); } } };
  const g = await call(env3, "64-17-5");
  check("D1 missing (migration not applied): still answers from ECHA", g.body.status === "registered");
}

// The parser's saved ECHA answers → Worker code → must equal the bundled entries.
async function parity() {
  const days = fs.existsSync(RAW_DIR) ? fs.readdirSync(RAW_DIR).filter(d => /^20/.test(d)).sort() : [];
  if (!days.length || !fs.existsSync(LIST)) { console.log("skip  parity (no raw ECHA answers on this machine)"); return; }
  const raw = path.join(RAW_DIR, days[days.length - 1]);
  const read = f => JSON.parse(fs.readFileSync(path.join(raw, f), "utf8"));
  const casList = [...new Set(fs.readdirSync(raw).map(f => f.split("_")[0]))];
  const table = {};
  casList.forEach(cas => {
    const pages = fs.readdirSync(raw).filter(f => f.startsWith(`${cas}_dossiers_p`)).sort();
    table[cas] = {
      search: read(`${cas}_search.json`),
      substance: fs.existsSync(path.join(raw, `${cas}_substance.json`)) ? read(`${cas}_substance.json`) : {},
      dossiers: pages.flatMap(f => read(f).items || []),
    };
  });
  globalThis.fetch = fakeEcha(table, []);
  const bundled = Object.fromEntries(JSON.parse(fs.readFileSync(LIST, "utf8")).entries.map(x => [x.cas, x]));
  let same = 0, diff = [];
  for (const cas of casList) {
    const ans = await lookupReach(cas);
    const want = bundled[cas] || null;
    const got = ans.status === "registered" ? ans.entry : null;
    if (JSON.stringify(got) === JSON.stringify(want)) same += 1;
    else diff.push(`${cas}: ${ans.status} ${JSON.stringify(got).slice(0, 120)} vs ${JSON.stringify(want).slice(0, 120)}`);
  }
  check(`parity with EU_REACH_REGISTERED.json: ${same}/${casList.length} CAS give the same entry (or none)`, !diff.length, diff.slice(0, 3).join(" | "));
}

async function live(casList) {
  for (const cas of casList) {
    const t0 = Date.now();
    const a = await lookupReach(cas);
    const e = a.entry || {};
    console.log(`${cas}  ${a.status}${a.reason ? ` (${a.reason})` : ""}  ${Date.now() - t0} ms` +
      (a.entry ? `\n      ${e.name} · EC ${e.ec} · active ${e.active_registrations} ${JSON.stringify(e.registration_types)} · ${e.tonnage_band} · first ${e.first_registered} · last ${e.last_updated} · ${e.url}` : ""));
    await new Promise(r => setTimeout(r, 1500));
  }
}

const liveAt = process.argv.indexOf("--live");
if (liveAt >= 0) {
  await live(process.argv.slice(liveAt + 1));
} else {
  const realFetch = globalThis.fetch;
  await mocked();
  await parity();
  globalThis.fetch = realFetch;
  console.log(failed ? `${failed} failed` : "all passed");
  process.exitCode = failed ? 1 : 0;
}
