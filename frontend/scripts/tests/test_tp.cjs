// 온도별 물성(public/chemip/tp_*.jsx · api_tp.jsx) 시험 — 화면 없이 순수 함수, 내보낸 v1/tp/ 파일(있으면).
//   [calc] 다른 구현과 대조: chemicals(Caleb Bell, MIT) dippr EQ100–EQ116·Chemsep_16 로 계산한 기준값
//          (scripts/portal_build/tp_crosscheck.py → fixtures/tp_crosscheck.json), NASA-9 H(298.15 K) = ΔHf(298.15 K)(b1 정의).
//   [src]  공개 표값: IAPWS-IF97 (IAPWS R7-97(2012)) 표 35 포화압력 검증값, 물 25 °C 밀도·100 °C 증발열(IAPWS-95).
//   그 밖: 단위 바꾸기, 범위 밖 null, 그래프 속성, 분리 계산기용 tpPsatFn/loadTpPsatFn, 라이선스 허용 목록.
//
//   node frontend/scripts/tests/test_tp.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const TP_OUT = process.env.CHEMIP_TP_OUT || "E:/dev-cache/chemip-static/out/v1/tp";
const SOURCES = path.join(__dirname, "..", "..", "..", "scripts", "portal_build", "tp_sources.json");
const FIXTURE = path.join(__dirname, "fixtures", "tp_crosscheck.json");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined }, compact: false, comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const FILES = ["lang.jsx", "calc_units.jsx", "calc_physics.jsx", "calc_labels.jsx", "calc_labels_en.jsx", "calc_engine.jsx", "calc_link.jsx",
  "static_config.jsx", "tp_forms.jsx", "tp_props.jsx", "tp_labels.jsx", "tp_labels_en.jsx", "tp_helpers.jsx", "api_tp.jsx"];

function readTp(cas) {
  const p = path.join(TP_OUT, `${cas}.json`);
  if (!fs.existsSync(p)) return null;
  const b = fs.readFileSync(p);
  return JSON.parse((b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b).toString("utf8"));
}

function load(lang, files = {}) {
  const fetched = [];
  const sandbox = {
    console, URLSearchParams, URL, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` },
    CHEMIP_STATIC: { base: "http://static.test", version: "v1" },
    staticGetJson: async (url) => { fetched.push(url); return Object.prototype.hasOwnProperty.call(files, url) ? files[url] : null; },
    useApi: () => ({ data: null, loading: false, error: null }),
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of FILES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { W: sandbox, fetched };
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));

async function main() {
  const { W } = load("ko");
  const water = readTp("7732-18-5");
  const haveOut = Boolean(water);
  if (!haveOut) console.log(`NOTE no exported files in ${TP_OUT} — run run_all.py --steps tp; file-based checks skipped`);

  /* ── [calc] 상관식 함수 하나씩: chemicals 구현과 대조 ── */
  const fx = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  if (haveOut) {
    const byForm = {};
    let worst = { r: 0 };
    for (const c of fx.cases) {
      const file = c.cas === "7732-18-5" ? water : readTp(c.cas);
      const v = W.tpEval(file.curves[c.i], c.T);
      const r = v == null ? Infinity : Math.abs(v - c.y) / Math.max(1e-12, Math.abs(c.y));
      byForm[c.form] = byForm[c.form] || { n: 0, bad: 0 };
      byForm[c.form].n += 1;
      if (!(r < 1e-9)) byForm[c.form].bad += 1;
      if (r > worst.r) worst = { r, c };
    }
    Object.entries(byForm).forEach(([form, s]) => check(`[calc] ${form}: ${s.n} points = chemicals ${fx.chemicals_version} (rel 1e-9)`, s.bad === 0, s.bad ? `${s.bad} off, worst ${JSON.stringify(worst)}` : ""));
    let nasaBad = 0;
    for (const c of fx.nasa_h298) {
      const rec = readTp(c.cas).curves[c.i];
      const h = W.tpNasa9(rec, 298.15, "h");
      if (!(Math.abs(h - c.hf298) <= 1e-5 * Math.abs(c.hf298) + 1)) nasaBad += 1;   // J/mol: rel 1e-5 + 1 J/mol (rounding of b1)
    }
    check(`[calc] nasa9: H(298.15 K) = ΔHf(298.15 K) for ${fx.nasa_h298.length} species (rel 1e-5 + 1 J/mol)`, fx.nasa_h298.length > 10 && nasaBad === 0, `${nasaBad} off`);
  }
  // ChemSep Book coefficients for n-hexane liquid k (eq16) at 300 K, as evaluated in chemicals' Chemsep_16 docstring
  const k16 = W.TP_FORMS.eq16([-0.12682, -1.5015, -1.0467, -0.00088709, -9.3679E-07], 300);
  check("[calc] eq16 n-hexane k_l(300 K) = 0.11924904787869 W/(m·K) (ChemSep Book coefficients; chemicals Chemsep_16)", rel(k16, 0.11924904787869) < 1e-12, String(k16));

  /* ── [src] 물: IAPWS 값과 대조(ChemSep 상관식이 맞춘 범위 안) ── */
  if (haveOut) {
    const psat = W.tpPsatFromFile(water);
    // IAPWS R7-97(2012) Table 35: ps(300 K) = 0.353658941e-2 MPa, ps(500 K) = 0.263889776e1 MPa, ps(600 K) = 0.123443146e2 MPa
    [[300, 3536.58941], [500, 2638897.76], [600, 12344314.6]].forEach(([T, p]) => {
      const v = psat.fn(T);
      check(`[src] water Psat(${T} K) vs IAPWS-IF97 Table 35 ${p} Pa (±1 %)`, rel(v, p) < 0.01, `${v.toFixed(2)} Pa, ${(100 * (v / p - 1)).toFixed(3)} %`);
    });
    check("[calc] water Psat: ChemSep vs this site's IF97 (calcWaterPsat) at 25/100/200 °C (±1 %)",
      [298.15, 373.15, 473.15].every(T => rel(psat.fn(T), W.calcWaterPsat(T)) < 0.01));
    const rho = W.tpConvert("density", W.tpEval(W.tpCurves(water, "rho_l")[0], 298.15), "mass", W.tpMw(water));
    check("[src] water ρL(25 °C) vs IAPWS-95 997.05 kg/m³ (±0.5 %)", rel(rho, 997.05) < 0.005, `${rho.toFixed(2)} kg/m³`);
    const hv = W.tpEval(W.tpCurves(water, "hvap")[0], 373.124);
    check("[src] water ΔHvap(373.124 K) vs IAPWS-95 2256.5 kJ/kg × 18.015 = 40.65 kJ/mol (±1 %)", rel(hv, 40651) < 0.01, `${(hv / 1000).toFixed(3)} kJ/mol`);
    const tb = W.tpPsatInverse(psat, 101325);
    check("[calc] water: Psat⁻¹(101 325 Pa) = 373.1 K (±0.3 K)", Math.abs(tb - 373.124) < 0.3, String(tb));
    const cpN2 = W.tpCurves(readTp("7727-37-9"), "cp_ig");
    const nasaN2 = cpN2.find(r => r.src === "nasa_cea"), csN2 = cpN2.find(r => r.src === "chemsep_lite");
    check("[calc] N2 ideal-gas Cp(298.15 K): NASA CEA vs ChemSep agree (±1 %)", nasaN2 && csN2 && rel(W.tpEval(csN2, 298.15), W.tpEval(nasaN2, 298.15)) < 0.01,
      `${W.tpEval(nasaN2, 298.15)} / ${W.tpEval(csN2, 298.15)}`);

    // whole-databank sanity: Psat at the file's own Tb ≈ 1 atm
    const all = fs.readdirSync(TP_OUT).filter(f => /^\d+-\d\d-\d\.json$/.test(f));
    let n = 0, ok = 0;   // ChemSep's own Tb and Psat fit are separate entries; a few (decomposing acids, heavy esters) disagree
    const allowed = new Set(JSON.parse(fs.readFileSync(SOURCES, "utf8")).sources.filter(s => s.allow === true).map(s => s.source_id));
    let licBad = 0, formBad = 0, curves = 0;
    for (const f of all) {
      const file = readTp(f.replace(/\.json$/, ""));
      const srcs = [...(file.curves || []), ...(file.const || [])].map(r => r.src).concat(Object.keys(file.sources || {}));
      if (srcs.some(s => !allowed.has(s))) licBad += 1;
      (file.curves || []).forEach(c => { curves += 1; if (!W.TP_FORMS[c.form]) formBad += 1; });
      const ps = W.tpPsatFromFile(file), Tb = W.tpConst(file, "Tb");
      if (ps && Tb && Tb >= ps.Tmin && Tb <= ps.Tmax) { n += 1; if (rel(ps.fn(Tb), 101325) < 0.03) ok += 1; }
    }
    check(`licence: every record and source of ${all.length} files is on the allow list (tp_sources.json)`, licBad === 0, `${licBad} files`);
    check(`format: every one of ${curves} curves uses a form in TP_FORMS`, formBad === 0, `${formBad}`);
    check(`[calc] databank consistency: Psat(Tb) within 3 % of 101 325 Pa for ≥ 85 % of ${n} substances`, n > 300 && ok / n >= 0.85, `${ok}/${n}`);
  }

  /* ── 범위·단위·표시 ── */
  const rec = { p: "psat", form: "eq10", c: [23.401, 3987.3, -37.161], Tmin: 273.1, Tmax: 573.15, f: 1, src: "chemsep_lite" };
  check("범위 밖은 null(외삽 없음)", W.tpEval(rec, 200) === null && W.tpEval(rec, 600) === null && W.tpEval(rec, 373.15) > 1e5);
  check("모르는 식은 null", W.tpEval({ ...rec, form: "eq999" }, 300) === null);
  check("단위: Pa → kPa, mol/m³ → kg/m³(분자량), J/mol → kJ/kg",
    W.tpConvert("pressure", 101325, "molar", null) === 101.325 && rel(W.tpConvert("density", 55345, "mass", 18.015), 997.04) < 1e-4
      && rel(W.tpConvert("energy", 40650, "mass", 18.015), 2256.45) < 1e-3 && W.tpConvert("density", 1, "mass", null) === null);
  check("온도: K ↔ °C, 잘못된 글자 null", W.tpParseT("25", "mass") === 298.15 && W.tpParseT("300", "molar") === 300 && W.tpParseT("abc", "molar") === null && W.tpParseT("-300", "mass") === null);
  if (haveOut) {
    const L = W.TP_LABELS;
    const props = W.tpAvailableProps(water).map(p => p.k);
    check("물: 묶음 psat·rho_l·cp·hvap·mu·k·sigma", ["psat", "rho_l", "cp", "hvap", "mu", "k", "sigma"].every(k => props.includes(k)), props.join(","));
    const cp = W.tpChartProps(water, W.TP_PROPS.find(p => p.k === "cp"), "mass", 298.15, L);
    check("그래프 Cp: 이상기체(ChemSep·NASA)·액체 계열, 단위 kJ/(kg·K)", cp && cp.series.length >= 3 && cp.y.unit === "kJ/(kg·K)" && cp.markers.length >= 2,
      cp && cp.series.map(s => s.label).join(" | "));
    const ps = W.tpChartProps(water, W.TP_PROPS.find(p => p.k === "psat"), "mass", 298.15, L);
    check("그래프 증기압: 로그 축, 1 atm 선, Tb 세로선(°C)", ps.y.log && ps.hlines[0].y === 101.325 && Math.abs(ps.vlines[0].x - 100) < 1);
    const rows = W.tpPointRows(water, 255, "molar", L);   // below the Psat fit (263.15 K)
    check("고른 온도 표: 범위 밖 줄은 null, NASA H°·S° 줄", rows.some(r => r.value == null) && rows.some(r => r.label === L.curves.h_ig) && rows.some(r => r.label === L.curves.s_ig));
    const consts = W.tpConstRows(water, "molar", L);
    check("상수 표: Tc 에 출처 여럿(ChemSep·CoolProp·Wikidata)", consts.find(r => r.k === "Tc").items.length >= 2, JSON.stringify(consts.find(r => r.k === "Tc")));
    const ant = W.tpAntoineLink(water);
    check("Antoine 계산기 딥링크 값(ln, Pa, K)", ant && ant.base === "ln" && ant.pu === "Pa" && ant.tu === "K" && ant.A === 23.401);
  }

  /* ── 분리 계산기용 증기압 찾기 ── */
  const url = "http://static.test/v1/tp/7732-18-5.json";
  const sample = water || { cas: "7732-18-5", name: "Water", curves: [rec], const: [] };
  const { W: W2, fetched } = load("en", { [url]: sample });
  check("tpPsatFn: 받기 전에는 null(요청 없음)", W2.tpPsatFn("7732-18-5") === null && fetched.length === 0);
  const fn = await W2.loadTpPsatFn("7732-18-5");
  check("loadTpPsatFn: 파일 주소 STATIC_LAYOUT.pages.tp.cas, 함수 반환", fetched[0] === url && fn && fn.fn(373.15) > 1e5 && fn.src === "chemsep_lite");
  check("tpPsatFn: 받은 뒤에는 동기로 같은 값", W2.tpPsatFn("7732-18-5").fn(350) === fn.fn(350));
  check("loadTpPsatFn: 자료 없음·CAS 모양 아님 → null", (await W2.loadTpPsatFn("50-00-0")) === null && (await W2.loadTpPsatFn("water")) === null);
  check("en 문구: 단위 이름·제목", W2.TP_LABELS.heading.en === "Properties vs temperature" && W2.TP_LABELS.unit.mass === "°C · mass basis");

  const failed = results.filter(r => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
