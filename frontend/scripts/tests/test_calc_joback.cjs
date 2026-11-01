// Joback 기여도법(calc_joback*.jsx) 시험 — 화면 없이 순수 모듈.
//   [src]  위키백과 "Joback method" 아세톤 풀이 예(표값, 2026-10-31 확인), Poling et al. 6판(Elliott, Diky, Knotts & Wilding 2023)
//          o-크레졸 예(실측 Tb = 464.15 K → Tc 692.64 K, Pc 50.30 bar, Vc 285.5 cm³/mol; 값은 thermo.Joback 설명서에 옮겨 적힌 것 — 책 원문은 직접 보지 못함).
//   [calc] thermo.group_contribution.Joback(Caleb Bell, MIT) + RDKit 으로 ChemSep 자료의 SMILES 552개를 나눈 개수·추정값
//          (scripts/portal_build/joback_crosscheck.py → fixtures/joback_crosscheck.json)과 같은지.
//
//   node frontend/scripts/tests/test_calc_joback.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const FIXTURE = path.join(__dirname, "fixtures", "joback_crosscheck.json");
const BABEL_OPTIONS = { presets: ["react", "env"], plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined }, compact: false, comments: false };
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const FILES = ["lang.jsx", "calc_units.jsx", "calc_labels.jsx", "calc_labels_en.jsx", "calc_engine.jsx", "calc_chart_scale.jsx",
  "calc_joback_groups.jsx", "calc_joback_smiles.jsx", "calc_joback.jsx"];

function load(lang) {
  const sandbox = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of FILES) {
    vm.runInContext(babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code, ctx, { filename: rel });
  }
  return sandbox;
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));
function near(name, got, want, tol) { check(name, Number.isFinite(got) && rel(got, want) <= tol, `${got} vs ${want} (tol ${tol})`); }

const W = load("ko");
const D = W.CALC_DEF_JOBACK;
const run = (v) => D.compute({ mode: "groups", T: 298.15, TbKnown: null, ...v });

/* ── 표 ── */
check("원자단 41개, 번호 1–41, 코드 겹침 없음", W.JOBACK_GROUPS.length === 41 && W.JOBACK_GROUPS.every((g, i) => g.id === i + 1)
  && new Set(W.JOBACK_GROUPS.map(g => g.code.toLowerCase())).size === 41);
check("코드 찾기: 코드·표기·번호·대소문자", W.jobackFindGroup("ch3").id === 1 && W.jobackFindGroup(">C=O (nonring)").id === 24 && W.jobackFindGroup("27").code === "COOH"
  && W.jobackFindGroup("xyz") === null && W.jobackFindGroup("") === null);

/* ── [src] 위키백과 아세톤 풀이 예 ── */
const ac = run({ groups: [{ g: "CH3", n: 2 }, { g: "C=O", n: 1 }], T: 300 });
[["Tb", 322.11], ["Tm", 173.5], ["Tc", 500.5590], ["Vc", 209.5], ["Hf", -217.83], ["Gf", -154.54], ["cp", 75.3264], ["Hfus", 5.125], ["Hvap", 29.018]]
  .forEach(([k, v]) => near(`[src] acetone ${k} = ${v} (Wikipedia worked example)`, ac[k], v, 1e-6));
near("[src] acetone Pc = 48.0250 bar", ac.Pc / 1e5, 48.025, 1e-5);
check("[calc] acetone 원자 수 10, 분자량 58.08", ac.nA === 10 && Math.abs(ac.mw - 58.08) < 0.01, `${ac.nA} ${ac.mw}`);

/* ── [src] Poling 6판 o-크레졸(실측 Tb 사용) ── */
const oc = D.compute({ mode: "smiles", smi: [{ smiles: "Cc1ccccc1O" }], TbKnown: 464.15, T: 298.15 });
near("[src] o-cresol Tc = 692.64 K with Tb = 464.15 K (Poling et al. 6th ed., via thermo docs)", oc.Tc, 692.64, 5e-5);
near("[src] o-cresol Pc = 50.30 bar", oc.Pc / 1e5, 50.30, 5e-4);
near("[src] o-cresol Vc = 285.5 cm³/mol", oc.Vc, 285.5, 1e-9);

/* ── SMILES 읽기 ── */
const G = (s) => W.jobackGroupsFromSmiles(s);
const same = (s, want, atoms) => {
  const r = G(s);
  const ok = !r.error && JSON.stringify(Object.entries(r.counts).sort()) === JSON.stringify(Object.entries(want).sort()) && (atoms == null || r.atoms === atoms);
  check(`SMILES ${s} → ${JSON.stringify(want)}`, ok, JSON.stringify(r));
};
same("c1ccccc1", { "r=CH": 6 }, 12);
same("CCO", { CH3: 1, CH2: 1, OH: 1 }, 9);
same("CC(=O)O", { CH3: 1, COOH: 1 }, 8);
same("CCOC(C)=O", { CH3: 2, CH2: 1, COO: 1 }, 14);
same("c1ccccc1[N+](=O)[O-]", { "r=CH": 5, "r=C": 1, NO2: 1 }, 14);
same("c1ccccc1N(=O)=O", { "r=CH": 5, "r=C": 1, NO2: 1 }, 14);
same("c1ccncc1", { "r=CH": 5, "r-N=": 1 }, 11);
same("c1cc[nH]c1", { "r=CH": 4, rNH: 1 }, 10);
same("c1ccoc1", { "r=CH": 4, rO: 1 }, 9);
same("C1CCCCC1", { rCH2: 6 }, 18);
same("C[C@@H](O)CC", { CH3: 2, CH: 1, OH: 1, CH2: 1 }, 15);
same("C1CC%10CCC1C%10", { rCH2: 5, rCH: 2 }, 19);   // two-digit ring closure (%10): bicyclo[3.1.1]heptane, hand count
check("SMILES 점(.) → error dot", G("CC.O").error === "dot");
check("SMILES 괄호 짝 틀림 → error syntax", G("CC(C").error === "syntax" && G("C1CC").error === "syntax");
check("SMILES 원자단 없는 원소(Si) → error element", G("C[Si](C)(C)C").error === "element");
same("CC#N", { CH3: 1, CN: 1 }, 6);
same("CC=O", { CH3: 1, CHO: 1 }, 7);
same("C=CC=C", { "=CH2": 2, "=CH": 2 }, 10);
same("CCS", { CH3: 1, CH2: 1, SH: 1 }, 9);
same("CN(C)C", { CH3: 3, N: 1 }, 13);
same("ClC(Cl)Cl", { Cl: 3, CH: 1 }, 5);
same("C1CCC(=O)CC1", { rCH2: 5, "rC=O": 1 }, 17);

/* ── 입력 검사·값 없는 원자단 ── */
check("모르는 원자단 → 오류", Boolean(run({ groups: [{ g: "XYZ", n: 1 }] }).error));
check("개수 1.5 → 오류", Boolean(run({ groups: [{ g: "CH3", n: 1.5 }] }).error));
const nh = run({ groups: [{ g: "CH3", n: 1 }, { g: "=CH", n: 1 }, { g: "=NH", n: 1 }] });
check("=NH(Tc·Pc 값 없음) → Tc·Pc 없음 + 경고, Tb 는 계산", nh.Tc == null && nh.Pc == null && nh.Tb > 0 && nh.warnings.some(w => /Tc/.test(w)));
const cpOut = run({ groups: [{ g: "CH3", n: 2 }, { g: "C=O", n: 1 }], T: 1500 });
check("Cp 범위(273–1000 K) 밖 → 경고", cpOut.warnings.some(w => /273/.test(w)));
const ch = W.calcJobackChart({ mode: "groups", groups: [{ g: "CH3", n: 2 }, { g: "C=O", n: 1 }], T: 300, TbKnown: null }, ac);
check("그래프: Cp°(T) 273–1000 K 한 줄 + 계산점", ch && ch.series[0].points.length === 61 && ch.markers.length === 1);

/* ── [calc] thermo + RDKit 과 대조(ChemSep SMILES) ── */
const fx = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
let cntOk = 0, estOk = 0, estN = 0;
const misses = [];
for (const c of fx.cases) {
  const r = G(c.smiles);
  const okCounts = !r.error && JSON.stringify(Object.entries(r.counts).sort()) === JSON.stringify(Object.entries(c.counts).sort()) && r.atoms === c.atoms;
  if (!okCounts) { misses.push(c.smiles); continue; }
  cntOk += 1;
  const e = W.calcJobackEstimate(r.counts, r.atoms, null);
  const pairs = [["Tb", c.est.Tb], ["Tc", c.est.Tc], ["Pc", c.est.Pc], ["Vc", c.est.Vc == null ? null : c.est.Vc * 1e6], ["Hf", c.est.Hf == null ? null : c.est.Hf / 1000],
    ["Gf", c.est.Gf == null ? null : c.est.Gf / 1000], ["Tm", c.est.Tm], ["Hvap", c.est.Hvap == null ? null : c.est.Hvap / 1000], ["Hfus", c.est.Hfus == null ? null : c.est.Hfus / 1000]];
  estN += 1;
  const okEst = pairs.every(([k, want]) => (want == null ? e[k] == null : e[k] != null && Math.abs(e[k] - want) <= 1e-9 * Math.max(1, Math.abs(want))))
    && (c.cp_coeffs == null ? e.cp == null : e.cp && e.cp.every((x, i) => Math.abs(x - c.cp_coeffs[i]) <= 1e-9 * Math.max(1e-6, Math.abs(c.cp_coeffs[i]))));
  if (okEst) estOk += 1;
}
check(`[calc] SMILES → group counts = thermo/RDKit for ≥ 551 of ${fx.cases.length} ChemSep molecules`, cntOk >= 551, `${cntOk}; differ: ${misses.join(" ")}`);
check(`[calc] estimates (Tb Tc Pc Vc Hf Gf Tm Hvap Hfus, Cp coeffs) = thermo ${fx.thermo_version} for all ${estN} matched`, estOk === estN, `${estOk}/${estN}`);

/* ── en ── */
const WE = load("en");
const en = WE.CALC_DEF_JOBACK.compute({ mode: "groups", groups: [{ g: "XYZ", n: 1 }], T: 300 });
check("en 오류 문구에 한글 없음", en.error && !/[가-힣]/.test(en.error), en.error);

const failed = results.filter(x => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
