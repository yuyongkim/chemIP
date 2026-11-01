// 안전 도구(저장 혼촉 매트릭스·혼합물 GHS 분류) 순수 모듈 시험 — 화면·서버 없이.
//   (1) 파이썬과 같은 결과: tests/fixtures/safety_parse_cases.json(ghs_parse.py·reactive_groups.py 가 만든 답)을 JS 가 그대로 내는지
//   (2) 규칙 자료 점검: 격리표·혼재 기준 대칭, 짝 규칙의 분류·설명 key
//   (3) 짝 판정: 질산·아세톤·수산화나트륨·물 등
//   (4) 혼합물 분류: ECHA 「Guidance on the Application of the CLP Criteria」 예제 재현(급성 독성 예 11·12a, 피부 예 4·6, 눈 예 3·4·5,
//       과민성 예 10, 수생 예 A), CMR·STOT 농도 한계, 표지 요소 우선순위
//   node frontend/scripts/tests/test_safety_tools.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..", "..");
const CHEMIP = path.join(ROOT, "frontend", "public", "chemip");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const MODULES = [
  "lang.jsx", "safety_rules_data.jsx", "ghs_hazard_parse.jsx", "compat_core.jsx", "mixghs_core.jsx", "mixghs_sources.jsx",
  "mixghs_examples.jsx", "safety_tools_labels.jsx", "safety_tools_labels_en.jsx",
];

function load(lang) {
  const sandbox = { console, URLSearchParams, URL, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of MODULES) {
    const code = fs.readFileSync(path.join(CHEMIP, rel), "utf8");
    vm.runInContext(babel.transform(code, { ...BABEL_OPTIONS, filename: rel }).code, ctx, { filename: rel });
  }
  return sandbox;
}

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) pass += 1;
  else { fail += 1; console.log(`FAIL ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`); }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const plain = v => JSON.parse(JSON.stringify(v)); // vm 안 객체 → 이쪽 객체

const W = load("ko");

/* (1) 파이썬과 같은 결과 */
const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, "tests", "fixtures", "safety_parse_cases.json"), "utf8"));
FIX.kosha.forEach((c, i) => check(`parity kosha ${i}`, same(plain(W.ghpKoshaClassification(c.in)), c.out), plain(W.ghpKoshaClassification(c.in))));
FIX.clp.forEach((c, i) => check(`parity clp ${i}`, same(plain(W.ghpClpClassification(c.codes, c.h)), c.out), plain(W.ghpClpClassification(c.codes, c.h))));
FIX.scl.forEach((c, i) => check(`parity scl ${i}`, same(plain(W.ghpSclColumn(c.in)), c.out), plain(W.ghpSclColumn(c.in))));
FIX.m_factors.forEach((c, i) => check(`parity m ${i}`, same(plain(W.ghpMFactors(c.hazards, c.m)), c.out)));
FIX.reactive.forEach((c, i) => {
  const got = [
    ...W.cmKrClasses(c.s15).map(x => ["kr", x.code, x.basis]),
    ...W.cmUnClasses(c.s14).map(x => ["un", x.code, x.basis]),
    ...W.cmGhsGroups(c.hazards, c.names, c.ph, c.euh).map(x => ["ghs", x.code, x.basis]),
  ];
  check(`parity reactive ${i}`, same(plain(got), c.out), plain(got));
});

/* (2) 규칙 자료 */
const C = W.SAFETY_RULES.compat;
["kr", "un"].forEach(s => {
  const m = C.systems[s].matrix, n = C.systems[s].matrix_order.length;
  let sym = m.length === n;
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) if (m[i][j] !== m[j][i]) sym = false;
  check(`${s} matrix symmetric ${n}x${n}`, sym);
  m.flat().forEach(code => check(`${s} code known ${code}`, code === "-" || (C.systems[s].outcome_of ? code in C.systems[s].outcome_of : ["x", "o", "c"].includes(code))));
});
C.systems.ghs.pairs.forEach(([a, b, o, note]) => {
  check(`ghs pair classes ${a}-${b}`, a in C.systems.ghs.classes && b in C.systems.ghs.classes);
  check(`ghs pair outcome ${a}-${b}`, ["x", "c"].includes(o));
  check(`ghs pair note ${note}`, Boolean(C.systems.ghs.notes[note]?.ko && C.systems.ghs.notes[note]?.en));
});
Object.values(W.SAFETY_RULES.ghs.hazards).forEach(h => Object.values(h.cats || {}).forEach(([hc]) => check(`h text ${hc}`, Boolean(W.SAFETY_RULES.ghs.h_text[hc]))));

/* (3) 짝 판정 */
const sub = (hazards, names, ph, s14, s15, euh) => [
  ...W.cmKrClasses(s15).map(x => ({ system: "kr", ...x })),
  ...W.cmUnClasses(s14).map(x => ({ system: "un", ...x })),
  ...W.cmGhsGroups(hazards, names, ph, euh || []).map(x => ({ system: "ghs", ...x })),
];
const nitric = sub(["ox_liq:1", "skin:1", "acute_inh:1"], ["질산"], null, "8", "6류 질산 (300kg)");
const acetone = sub(["flam_liq:2", "eye:2"], ["아세톤"], null, "3", "제4류 제1석유류(수용성액체) (400ℓ)");
const naoh = sub(["skin:1", "met_corr:1"], ["수산화나트륨"], 14, "8", "해당없음");
const water = sub([], ["물"], 7, "해당없음", "해당없음");
const sodium = sub(["water_react:1"], ["나트륨"], null, "4.3", "3류 나트륨 (10kg)");
const p1 = W.cmPair(nitric, acetone);
check("nitric x acetone = x", p1.outcome === "x", plain(p1));
check("nitric x acetone kr 6-4", p1.reasons.some(r => r.system === "kr" && r.outcome === "x"));
check("nitric x acetone ghs OX-FL", p1.reasons.some(r => r.system === "ghs" && [r.a, r.b].sort().join() === "FL,OX"));
check("nitric x acetone un 8-3 no rule", !p1.reasons.some(r => r.system === "un"));
check("nitric x naoh = x (acid-base)", W.cmPair(nitric, naoh).reasons.some(r => r.system === "ghs" && [r.a, r.b].sort().join() === "AC,BA"));
check("acetone x naoh = o", W.cmPair(acetone, naoh).outcome === "o", plain(W.cmPair(acetone, naoh)));
check("water = unknown", W.cmPair(water, nitric).outcome === "unknown");
check("sodium x nitric = x (wr-acid, kr 3-6)", W.cmPair(sodium, nitric).outcome === "x");
check("sodium x acetone kr 3-4 ok, ghs c", W.cmPair(sodium, acetone).outcome === "c", plain(W.cmPair(sodium, acetone)));
check("un 4.3 x 5.1 separated", W.cmRule("un", "4.3", "5.1").outcome === "x" && W.cmRule("un", "4.3", "5.1").code === "2");
check("un 3 x 2.2 away from = c", W.cmRule("un", "3", "2.2").outcome === "c");
const pairs = W.cmMatrix([{ classes: nitric }, { classes: acetone }, { classes: naoh }, { classes: water }]);
check("matrix 4 -> 6 pairs", pairs.length === 6);
check("ranked first is x", W.cmRankedPairs(pairs)[0].outcome === "x");
check("table classes read", same(plain(W.cmClassesFromTable({ source_ids: ["s"], classes: { "1-1-1": [["kr", "4", "b", 0]] } }, "1-1-1")), [{ system: "kr", code: "4", basis: "b", source: "s" }]));
const detail = { sections: [
  { section_seq: 2, content: [{ msdsItemCode: "B02", itemDetail: "산화성 액체 : 구분1|피부 부식성/피부 자극성 : 구분1" }] },
  { section_seq: 14, content: [{ msdsItemCode: "N06", itemDetail: "8" }] },
  { section_seq: 15, content: [{ msdsItemCode: "O06", itemDetail: "6류 질산 (300kg)" }] },
] };
const fromDetail = W.cmClassesFromDetail(detail, ["질산"], [{ name: "nitric acid", hazards: ["ox_liq:3", "skin:1A"], euh: [] }]);
check("detail -> kr 6, un 8, OX, AC (+clp)", same(plain(fromDetail.map(c => `${c.system}:${c.code}:${c.source}`)),
  ["kr:6:kosha_msds_s15", "un:8:kosha_msds_s14", "ghs:OX:kosha_msds_s2", "ghs:AC:kosha_msds_s2", "ghs:OX:clp_annex6", "ghs:AC:clp_annex6"]), plain(fromDetail));

/* (4) 혼합물 분류 — ECHA 지침 예제 */
const rowsToComps = rows => rows.map(r => W.mgRowComponent({ ...r, source: "typed" }, { detail: null, annexEntries: null }).comp);
const classify = rows => W.mgClassify(rowsToComps(rows));
const findStep = (res, pred) => res.steps.find(pred);
const has = (res, key, cat) => res.classes.some(k => k.key === key && k.cat === cat);
const hasKey = (res, key) => res.classes.some(k => k.key === key);

// 급성 독성 예 11
let r = classify(W.MIXGHS_EXAMPLES.acute);
let s = findStep(r, x => x.kind === "acute" && x.route === "oral");
check("ECHA acute ex11 corrected", s && s.corrected && s.unknown === 92, s && plain(s));
check("ECHA acute ex11 sum 0.054", s && near(s.sum, 0.054, 1e-9), s && s.sum);
check("ECHA acute ex11 ATEmix 148", s && near(s.ateMix, 148.15, 0.01), s && s.ateMix);
check("ECHA acute ex11 Cat 3", has(r, "acute_oral", "3"), plain(r.classes));
check("ECHA acute ex11 ingredient 5 (0.2 %, Cat 2) kept", s && s.rows.some(x => x.name === "Ingredient 5"));
let lab = W.mgLabel(r.classes);
check("ECHA acute ex11 label", same(plain(lab), { pictograms: ["GHS06"], signal: "danger", h: ["H301"] }), plain(lab));
check("ECHA acute ex11 note unknown", r.notes.some(n => n.k === "unknownAcute" && n.pct === 92));

// 급성 독성 예 12a (미스트로만 노출)
r = classify([
  { name: "Ingredient 1", c: "6", typed: "급성 독성(흡입: 분진/미스트) : 구분4" },
  { name: "Ingredient 2", c: "11", typed: "inhalation: ATE = 0.6 mg/L dusts or mists" },
  { name: "Ingredient 3", c: "10", typed: "" },
  { name: "Ingredient 4", c: "40", typed: "급성 독성(흡입: 분진/미스트) : 구분4" },
  { name: "Ingredient 5", c: "33", typed: "" },
]);
s = findStep(r, x => x.kind === "acute" && x.route === "dust");
check("ECHA acute ex12a sum 49", s && near(s.sum, 49, 1e-9), s && s.sum);
check("ECHA acute ex12a ATEmix 2.04", s && near(s.ateMix, 2.04, 0.005), s && s.ateMix);
check("ECHA acute ex12a Cat 4 (dust/mist)", has(r, "acute_inh_dust", "4"), plain(r.classes));

// 피부 예 4
r = classify(W.MIXGHS_EXAMPLES.skin);
let skin = r.steps.filter(x => x.kind === "sum" && x.hazard === "skin");
check("ECHA skin ex4 corr sum 0.94", skin[0] && skin[0].target === "1" && near(skin[0].total, 0.94, 1e-9) && !skin[0].met, skin[0] && plain(skin[0]));
check("ECHA skin ex4 irrit sum 3.46", skin[1] && skin[1].target === "2" && near(skin[1].total, 3.46, 1e-9) && skin[1].met, skin[1] && plain(skin[1]));
check("ECHA skin ex4 Skin Irrit. 2", has(r, "skin", "2"));

// 피부 예 6
r = classify([
  { name: "Surfactant C", c: "0.4", typed: "Skin Irrit. 2" },
  { name: "Substance G", c: "3.0", typed: "Skin Irrit. 2" },
  { name: "Substance A", c: "0.7", typed: "Skin Irrit. 2" },
  { name: "Substance H", c: "3.0", typed: "Skin Corr. 1A\nSkin Corr. 1A; H314: C ≥ 70 %\nSkin Corr. 1B; H314: 50 % ≤ C < 70 %\nSkin Irrit. 2; H315: 35 % ≤ C < 50 %" },
  { name: "Substance D", c: "2", typed: "" },
  { name: "Water", c: "90.9", typed: "" },
]);
skin = r.steps.filter(x => x.kind === "sum" && x.hazard === "skin");
check("ECHA skin ex6 corr 3/50", skin[0] && near(skin[0].total, 0.06, 1e-9), skin[0] && plain(skin[0]));
check("ECHA skin ex6 irrit 0.39", skin[1] && near(skin[1].total, 3 / 35 + 0.3, 1e-9) && !skin[1].met, skin[1] && plain(skin[1]));
check("ECHA skin ex6 not classified", !hasKey(r, "skin"));

// 눈 예 3
r = classify([
  { name: "Substance A", c: "1.8", typed: "Eye Dam. 1" },
  { name: "Substance B", c: "0.5", typed: "Eye Irrit. 2" },
  { name: "Substance C", c: "5.4", typed: "Eye Dam. 1" },
  { name: "Substance D", c: "4.0", typed: "" },
  { name: "Acid E", c: "2.0", typed: "Skin Corr. 1A" },
  { name: "Water", c: "86.3", typed: "" },
]);
let eye = r.steps.filter(x => x.kind === "sum" && x.hazard === "eye");
check("ECHA eye ex3 Eye Dam. 1 (9.2 % / 3)", eye[0] && near(eye[0].total, 9.2 / 3, 1e-9) && has(r, "eye", "1"), eye[0] && plain(eye[0]));
check("ECHA eye ex3 B below 1 % left out", eye.every(st => !st.rows.some(x => x.name === "Substance B")));

// 눈 예 4
r = classify([
  { name: "Substance A", c: "2.0", typed: "Eye Dam. 1" },
  { name: "Substance B", c: "0.5", typed: "Eye Irrit. 2" },
  { name: "Substance C", c: "5.4", typed: "Skin Corr. 1B\nSkin Corr. 1B; H314: C ≥ 10 %\nEye Irrit. 2; H319: 5 % ≤ C < 10 %" },
  { name: "Substance D", c: "4.0", typed: "" },
  { name: "Substance E", c: "2.0", typed: "Skin Corr. 1B" },
  { name: "Water", c: "86.1", typed: "" },
]);
eye = r.steps.filter(x => x.kind === "sum" && x.hazard === "eye");
check("ECHA eye ex4 sum 1.9", eye[0] && near(eye[0].total, 2 / 3 + 0.54 + 2 / 3, 1e-9) && near(eye[0].total, 1.87, 0.01), eye[0] && plain(eye[0]));
check("ECHA eye ex4 Eye Dam. 1", has(r, "eye", "1"));

// 눈 예 5
r = classify([
  { name: "Substance B", c: "0.7", typed: "Eye Dam. 1" },
  { name: "Substance C", c: "74.9", typed: "Eye Irrit. 2" },
  { name: "Substance D", c: "8.5", typed: "Eye Dam. 1\nEye Dam. 1; H318: C ≥ 25 %\nEye Irrit. 2; H319: 10 % ≤ C < 25 %" },
  { name: "Substance E", c: "15.9", typed: "" },
]);
eye = r.steps.filter(x => x.kind === "sum" && x.hazard === "eye");
check("ECHA eye ex5 dam 8.5/25 not met", eye[0] && near(eye[0].total, 0.34, 1e-9) && !eye[0].met, eye[0] && plain(eye[0]));
check("ECHA eye ex5 irrit 8.5/10 + 74.9/10", eye[1] && near(eye[1].total, 0.85 + 7.49, 1e-9) && eye[1].met);
check("ECHA eye ex5 Eye Irrit. 2", has(r, "eye", "2"));

// 과민성 예 10 (9 g/L ≈ 0.9 % 의 Skin Sens. 1B → 분류 안 함, EUH208)
r = classify([{ name: "Substance X", c: "0.9", typed: "Skin Sens. 1B" }, { name: "Solvent", c: "99.1", typed: "" }]);
check("ECHA sens ex10 not classified", !hasKey(r, "skin_sens"));
check("ECHA sens ex10 EUH208", r.notes.some(n => n.k === "euh208" && n.name === "Substance X"));
r = classify([{ name: "S", c: "0.12", typed: "Skin Sens. 1A" }]);
check("skin sens 1A at 0.12 % -> Skin Sens. 1", has(r, "skin_sens", "1"));

// 수생 예 A
r = classify(W.MIXGHS_EXAMPLES.aquatic);
s = findStep(r, x => x.kind === "aq_acute");
check("ECHA aquatic exA acute 13", s && near(s.total, 13, 1e-9) && !s.met, s && plain(s));
s = findStep(r, x => x.kind === "aq_chronic");
check("ECHA aquatic exA chronic step1 10, step2 113", s && near(s.tests[0].value, 10, 1e-9) && near(s.tests[1].value, 113, 1e-9), s && plain(s));
check("ECHA aquatic exA Chronic 2 only", same(plain(r.classes), [{ key: "aq_chronic", cat: "2" }]), plain(r.classes));
lab = W.mgLabel(r.classes);
check("ECHA aquatic exA label GHS09 H411 no signal", same(plain(lab), { pictograms: ["GHS09"], signal: null, h: ["H411"] }), plain(lab));

// CMR·STOT 농도 한계
r = classify([{ name: "c", c: "0.1", typed: "Carc. 1B" }, { name: "r", c: "3", typed: "Repr. 2" }, { name: "m", c: "0.05", typed: "Muta. 1B" }]);
check("carc 1B at 0.1 %", has(r, "carc", "1B"));
check("repr 2 at 3 %", has(r, "repr", "2"));
check("muta 1B at 0.05 % not", !hasKey(r, "muta"));
r = classify([{ name: "t", c: "5", typed: "STOT RE 1" }]);
check("STOT RE 1 at 5 % -> Cat 2", has(r, "stot_re", "2") && !has(r, "stot_re", "1"));
r = classify([{ name: "t", c: "12", typed: "STOT SE 1" }, { name: "a", c: "15", typed: "STOT SE 3 H335" }, { name: "b", c: "10", typed: "STOT SE 3 H335" }]);
check("STOT SE 1 at 12 % -> Cat 1", has(r, "stot_se", "1"));
check("STOT SE 3 resp 25 % ≥ 20 -> 3R", has(r, "stot_se", "3R"));
r = classify([{ name: "t", c: "12", typed: "Asp. Tox. 1" }]);
check("aspiration 12 % -> Cat 1 + viscosity note", has(r, "asp", "1") && r.notes.some(n => n.k === "viscosity"));
check("aspiration excluded by viscosity", !hasKey(W.mgClassify(rowsToComps([{ name: "t", c: "12", typed: "Asp. Tox. 1" }]), { viscosityHigh: true }), "asp"));

// 표지 우선순위
lab = W.mgLabel([{ key: "acute_oral", cat: "3" }, { key: "acute_dermal", cat: "4" }, { key: "skin", cat: "1" }, { key: "eye", cat: "1" }]);
check("label: GHS07 dropped (acute 4 under GHS06), H318 under H314", same(plain(lab), { pictograms: ["GHS05", "GHS06"], signal: "danger", h: ["H301", "H312", "H314"] }), plain(lab));
lab = W.mgLabel([{ key: "acute_oral", cat: "4" }, { key: "stot_se", cat: "3N" }]);
check("label: GHS07 kept for STOT SE 3", same(plain(lab), { pictograms: ["GHS07"], signal: "warning", h: ["H302", "H336"] }), plain(lab));
lab = W.mgLabel([{ key: "aq_acute", cat: "1" }, { key: "aq_chronic", cat: "1" }]);
check("label: H410 covers H400", same(plain(lab.h), ["H410"]));

// 부속서 VI 항목을 출처로 쓴 행
const naohEntry = { name: "sodium hydroxide", hazards: ["skin:1A"], scl: [["skin", "1A", 5], ["skin", "1B", 2], ["skin", "2", 0.5], ["eye", "2", 0.5]], ate: {}, m: {}, euh: [] };
let rc = W.mgRowComponent({ name: "NaOH", c: "3", source: null }, { detail: null, annexEntries: [naohEntry] });
check("annex source chosen by default", rc.source === "annex" && same(plain(rc.options), ["annex", "typed"]));
r = W.mgClassify([rc.comp, { name: "water", c: "97", hazards: [] }]);
check("NaOH 3 % (SCL 1B ≥ 2 %) -> Skin Corr. 1", has(r, "skin", "1") && has(r, "eye", "1"), plain(r.classes));
rc = W.mgRowComponent({ name: "NaOH", c: "1", source: null }, { detail: null, annexEntries: [naohEntry] });
r = W.mgClassify([rc.comp]);
check("NaOH 1 % (SCL irrit ≥ 0.5 %) -> Skin Irrit. 2", has(r, "skin", "2"), plain(r.classes));
rc = W.mgRowComponent({ name: "x", c: "5", source: "kosha" }, { detail: { sections: [{ section_seq: 2, content: [{ msdsItemCode: "B02", itemDetail: "급성 독성(경구) : 구분3" }] }] }, annexEntries: null });
check("kosha source", rc.source === "kosha" && same(plain(rc.comp.hazards), ["acute_oral:3"]));
check("typed unknown lines", same(plain(W.ghpParseTyped("Skin Irrit. 2\nhello world").unknown), ["hello world"]));

/* 영어 화면: 같은 계산, 문구 함수 있음 */
const E = load("en");
const rEn = E.mgClassify(rowsToComps(W.MIXGHS_EXAMPLES.acute).map(x => x));
check("en same classes", same(plain(rEn.classes), plain(W.mgClassify(rowsToComps(W.MIXGHS_EXAMPLES.acute)).classes)));
check("en labels", E.SAFETY_LABELS.mix.title === "Mixture GHS classification" && typeof E.SAFETY_LABELS.mix.steps.acuteRow === "function");
check("ko labels", W.SAFETY_LABELS.mix.title === "혼합물 GHS 분류");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
