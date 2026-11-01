// 비상대응 기준(public/chemip/el_*.jsx · api_el.jsx · usearch_answer_el.jsx) 시험 — 화면 없이 순수 함수와 바로 답.
// 실제 내보낸 파일(E:\dev-cache\chemip-static\out\v1\el, scripts/portal_build/emergency_limits.py)이 있으면 그 값을 원문과 대조한다:
//   [src] EPA AEGL 염소 페이지: AEGL-2 = 2.8 / 2.8 / 2.0 / 1.0 / 0.71 ppm, AEGL-3 10분 50 ppm
//   [src] EPA AEGL 부탄 페이지 주석: AEGL-2 10분 "*** 24,000 ppm", AEGL-3 10분 "*** 77,000 ppm" (표에는 별표만)
//   [src] DOE PAC Rev. 29 Table 2: 아세트산 PAC 5 / 35 / 250 ppm, 근거 "ERPG-1, ERPG-2, ERPG-3" → ERPG via DOE PAC
//   [src] DOE PAC Rev. 29 Table 2: 염소 0.5 / 2 / 20 ppm(AEGL 근거), Table 4 1.4 / 5.8 / 58 mg/m³
//   [src] RIVM 염소: a −13.7, b 1.93, n 1.04
// 물질 검색·파일 받기는 가짜 함수. ko·en 두 벌.
//
//   node frontend/scripts/tests/test_emergency_limits.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const OUT = process.env.CHEMIP_STATIC_EXPORT_DIR || "E:\\dev-cache\\chemip-static\\out\\v1";
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const FILES = [
  "lang.jsx", "calc_units.jsx", "calc_physics.jsx", "calc_link.jsx", "static_config.jsx",
  "facts_labels.jsx", "facts_labels_en.jsx", "chem_name_core.jsx", "facts_core.jsx",
  "oel_labels.jsx", "oel_labels_en.jsx", "oel_helpers.jsx",
  "el_labels.jsx", "el_labels_en.jsx", "el_helpers.jsx", "api_el.jsx",
];

function readOut(rel) {
  const p = path.join(OUT, ...rel.split("/"));
  if (!fs.existsSync(p)) return null;
  let b = fs.readFileSync(p);
  if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b);
  return JSON.parse(b.toString("utf8"));
}

const SAMPLE = {
  v: 1, cas: "7782-50-5", name: "Chlorine", exported_at: "2026-10-31", mw: 70.906,
  aegl: { status: "Final", unit: "ppm", times: ["10min", "30min", "60min", "4h", "8h"],
    v: { 1: [0.5, 0.5, 0.5, 0.5, 0.5], 2: [2.8, 2.8, 2.0, 1.0, 0.71], 3: [50, 28, 20, 10, 7.1] },
    f: { 1: ["", "", "", "", ""], 2: ["", "", "", "", ""], 3: ["", "", "", "", ""] }, page: "https://www.epa.gov/aegl/chlorine-results-aegl-program", tsd: "" },
  pac: { rev: "29", unit: "ppm", v: [0.5, 2, 20], f: ["", "", ""], mg: [1.4, 5.8, 58], basis: "AEGL-1, AEGL-2, AEGL-3", tiers: ["AEGL", "AEGL", "AEGL"] },
  erpg: null,
  probit: { a: -13.7, b: 1.93, n: 1.04, status: "inhoudelijk vastgesteld", established: "15-03-2018", page: "https://www.rivm.nl/chloor", doc: "", c_unit: "mg/m3", t_unit: "min" },
  src: ["epa_aegl", "doe_pac_rev29", "rivm_probit"],
};
const ACETIC = {
  v: 1, cas: "64-19-7", name: "Acetic acid", mw: 60.05, aegl: null,
  pac: { rev: "29", unit: "ppm", v: [5, 35, 250], f: ["", "", ""], mg: [12, 86, 610], basis: "ERPG-1, ERPG-2, ERPG-3", tiers: ["ERPG", "ERPG", "ERPG"] },
  erpg: { unit: "ppm", v: [5, 35, 250], via: "doe_pac_rev29", surrogate: false }, probit: null, src: ["doe_pac_rev29"],
};
const ITEMS = {
  "염소": [{ chem_id: "7782-50-5", cas_no: "7782-50-5", name: "염소", name_en: "Chlorine" }],
  chlorine: [{ chem_id: "7782-50-5", cas_no: "7782-50-5", name: "염소", name_en: "Chlorine" }],
  "아세트산": [{ chem_id: "64-19-7", cas_no: "64-19-7", name: "아세트산", name_en: "Acetic acid" }],
  "acetic acid": [{ chem_id: "64-19-7", cas_no: "64-19-7", name: "아세트산", name_en: "Acetic acid" }],
};

function load(lang) {
  const calls = { search: [], fetched: [] };
  const files = { "el/7782-50-5.json": SAMPLE, "el/64-19-7.json": ACETIC, "el/index.json": { v: 1, cas: ["64-19-7", "7782-50-5"], sources: {} } };
  const sandbox = {
    console, URLSearchParams, URL, location: { search: `?lang=${lang}` },
    CHEMIP_STATIC: { base: "http://static.test", version: "v1" },
    fetchChemicalSearch: async (q) => { calls.search.push(q); return { items: ITEMS[String(q).toLowerCase()] || ITEMS[q] || [] }; },
    staticGetJson: async (url) => { calls.fetched.push(url); return files[url.replace("http://static.test/v1/", "")] || null; },
    useApi: () => ({}),
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of FILES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { W: sandbox, calls };
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
const HANGUL = /[가-힣]/;

(async () => {
  const { W, calls } = load("ko");
  const { W: WE } = load("en");

  // ── 표 모양 ──
  const rows = W.elAeglRows(SAMPLE);
  check("AEGL 표 3줄 × 5칸", rows.length === 3 && rows.every(r => r.cells.length === 5));
  check("AEGL-2 60분 = 2 ppm, mg/m³ ≈ 5.8 (분자량 70.906, 24.45 L/mol)", rows[1].cells[2].v.text === "2" && rows[1].cells[2].v.mg.derived
    && Math.abs(Number(rows[1].cells[2].v.mg.text) - 2 * 70.906 / 24.45) < 0.05, JSON.stringify(rows[1].cells[2].v));
  const pac = W.elPacRows(SAMPLE);
  check("PAC 표 3줄, mg/m³ 은 DOE Table 4 값(5.8)", pac.length === 3 && pac[1].pacMg === "5.8" && pac[1].family === "AEGL");
  check("ERPG 없음(염소는 DOE 가 AEGL 근거)", pac.every(r => r.erpg === null));
  const pacA = W.elPacRows(ACETIC);
  check("아세트산: ERPG via DOE PAC 5 / 35 / 250", pacA.map(r => r.erpg && r.erpg.text).join("/") === "5/35/250");

  // ── 독성 끝점: ERPG-2 → AEGL-2 60분 → PAC-2 ──
  const ep1 = W.elEndpoint(SAMPLE), ep2 = W.elEndpoint(ACETIC);
  check("끝점: 염소 = AEGL-2 60분 2 ppm", ep1 && ep1.via === "aegl" && ep1.value === 2);
  check("끝점: 아세트산 = ERPG-2 35 ppm (mg 86)", ep2 && ep2.via === "erpg" && ep2.value === 35 && ep2.mg === 86);
  check("끝점: PAC 만 있으면 PAC-2", W.elEndpoint({ pac: { unit: "mg/m3", v: [1, 2, 3], mg: [1, 2, 3] } }).via === "pac");

  // ── 노출기준과 견주기 ──
  const oel = { rows: [{ j: "US", src: "us_niosh_npg", kind: "IDLH", value: 10, unit: "ppm" }, { j: "KR", src: "kr_moel_notice", kind: "TWA", value: 0.5, unit: "ppm" }] };
  const chips = W.elOelCompare(SAMPLE, oel, W.EL_LABELS, s => W.OEL_LABELS.sources[s] || s);
  check("견주기 칩: KR TWA · IDLH · AEGL-2 · PAC-2", chips.map(c => c.k).join(",") === "twa,idlh,aegl2,pac2", chips.map(c => `${c.label} ${c.text}`).join(" | "));

  // ── 검색어 읽기 ──
  const P = (q, w = W) => w.elParseQuery(q, [w.EL_LABELS_KO, w.EL_LABELS_EN]);
  check("'염소 AEGL' → aegl·염소", JSON.stringify(P("염소 AEGL")) === JSON.stringify({ kind: "aegl", substance: "염소" }));
  check("'ammonia ERPG-2' → erpg·ammonia", JSON.stringify(P("ammonia ERPG-2")) === JSON.stringify({ kind: "erpg", substance: "ammonia" }));
  check("'PAC 황화수소' → pac", P("PAC 황화수소")?.kind === "pac" && P("PAC 황화수소").substance === "황화수소");
  check("'염소 비상대응 기준' → all", P("염소 비상대응 기준")?.kind === "all");
  check("'benzene flash point' → 답 없음", P("benzene flash point") === null);
  check("'AEGL' 낱말만 → 답 없음", P("AEGL") === null);

  // ── 바로 답 ──
  const a1 = await W.fetchElAnswer("염소 AEGL");
  check("염소 AEGL 답: 60분 줄 0.5 / 2 / 20 ppm", a1 && a1.lines[0].text === "0.5 / 2 / 20 ppm" && /anchor=el/.test(a1.href), JSON.stringify(a1 && a1.lines));
  check("염소 AEGL 답: AEGL-2 시간별 줄", a1 && a1.lines[1].text === "2.8 / 2.8 / 2 / 1 / 0.71 ppm");
  const a2 = await W.fetchElAnswer("염소 ERPG");
  check("염소 ERPG 답: ERPG 없음 안내 + PAC 줄", a2 && a2.note === W.EL_LABELS.answer.noErpg && /0\.5 \/ 2 \/ 20/.test(a2.lines[0].text));
  const a3 = await WE.fetchElAnswer("acetic acid ERPG");
  check("en: acetic acid ERPG 답 5 / 35 / 250 ppm, 한글 없음", a3 && a3.lines[0].text === "5 / 35 / 250 ppm"
    && !HANGUL.test(JSON.stringify({ t: a3.title, l: a3.lines, s: a3.source })), JSON.stringify(a3));
  const a4 = W.elAnswer(SAMPLE, "aegl", { cas_no: "7782-50-5", name: "Chlorine (dichlorine)" }, W.EL_LABELS, "ko", "염소");
  check("ko: 검색 결과 이름에 한글이 없으면 물어본 이름 '염소' 를 제목에", a4 && a4.title === "염소 · AEGL", a4 && a4.title);
  const before = calls.search.length;
  check("물성 질문은 요청하지 않음", (await W.fetchElAnswer("염소 끓는점")) === null && calls.search.length === before);

  // ── 문구: ko·en 같은 모양, en 에 한글 없음 ──
  const leaves = (o, pre = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? leaves(v, `${pre}${k}.`) : [[`${pre}${k}`, v]]));
  const koKeys = leaves(W.EL_LABELS_KO).map(([k]) => k).filter(k => !k.startsWith("query."));
  const enMap = new Map(leaves(WE.EL_LABELS_EN));
  const missing = koKeys.filter(k => !enMap.has(k));
  const txt = v => (typeof v === "function" ? v(...Array(v.length).fill("x")) : Array.isArray(v) ? v.join(" ") : v);
  const hangul = [...enMap].filter(([k, v]) => !k.startsWith("query.") && k !== "heading.ko" && HANGUL.test(String(txt(v))));
  check("EL_LABELS_EN: 빠짐·한글 없음", missing.length === 0 && hangul.length === 0, [...missing, ...hangul.map(([k]) => k)].join(", "));

  // ── 실제 내보낸 파일(있으면) — 원문 대조 ──
  const cl = readOut("el/7782-50-5.json"), bu = readOut("el/106-97-8.json"), ac = readOut("el/64-19-7.json"), idx = readOut("el/index.json");
  if (!cl || !idx) {
    console.log(`SKIP 내보낸 파일 없음 (${OUT}\\el) — python -I -B scripts/portal_build/emergency_limits.py`);
  } else {
    check("[src] EPA 염소 AEGL-2 = 2.8/2.8/2.0/1.0/0.71 ppm", JSON.stringify(cl.aegl.v["2"]) === JSON.stringify([2.8, 2.8, 2, 1, 0.71]) && cl.aegl.unit === "ppm");
    check("[src] EPA 염소 AEGL-3 10분 50 ppm, 최종(Final)", cl.aegl.v["3"][0] === 50 && cl.aegl.status === "Final");
    check("[src] DOE PAC Rev.29 염소 0.5/2/20 ppm · 1.4/5.8/58 mg/m³", JSON.stringify(cl.pac.v) === "[0.5,2,20]" && JSON.stringify(cl.pac.mg) === "[1.4,5.8,58]");
    check("[src] RIVM 염소 a −13.7 b 1.93 n 1.04", cl.probit && cl.probit.a === -13.7 && cl.probit.b === 1.93 && cl.probit.n === 1.04);
    check("[src] EPA 부탄 주석 값: AEGL-2 10분 24,000 · AEGL-3 10분 77,000 ppm (***)", bu && bu.aegl.v["2"][0] === 24000 && bu.aegl.v["3"][0] === 77000
      && bu.aegl.f["3"][0] === "***");
    check("[src] DOE PAC 아세트산 ERPG 5/35/250 ppm via DOE PAC", ac && JSON.stringify(ac.erpg.v) === "[5,35,250]" && ac.erpg.via === "doe_pac_rev29");
    check(`목록 ${idx.count}개 CAS, AEGL ${idx.counts.aegl} · PAC ${idx.counts.pac} · ERPG ${idx.counts.erpg} · probit ${idx.counts.probit}`,
      idx.count > 3000 && idx.counts.aegl > 250 && idx.counts.erpg > 50 && idx.cas.includes("7782-50-5"));
    check("실제 파일로 표·끝점 만들기", W.elAeglRows(cl).length === 3 && W.elEndpoint(ac).via === "erpg");
  }

  const failed = results.filter(x => !x).length;
  console.log(`\n${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
