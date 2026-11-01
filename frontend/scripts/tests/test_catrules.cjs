// 물질 상세 "분류로 걸리는 규제"(catrule_*.jsx)와 국가별 규제 정리(intl_merge.jsx) 순수 모듈 시험 — 화면·서버 없이 Node vm 에서.
//   (1) catEvaluate: 손으로 만든 입력 → 한국 PSM 제1·2호(APL_PSM.flam)·별표 13 지명 물질·산안규칙 별표 9·위험물·OSHA PSM·Seveso 1부
//       기준값은 원문(catrule_data.jsx 머리 주석의 출처)에서 옮긴 값: 5,000/200,000 kg, 50 m³, 400 L, 10,000 lb, 10/50 t, 5000/50000 t
//   (2) 정적 자료(있으면): 에틸렌·프로필렌·메탄·벤젠·암모니아 f/<CAS>.json·g/clp_annex6.json·KOSHA MSDS 2·15항으로 같은 판정
//   (3) intlDedupe·intlNamedItems·intlCombine: Ethene/Ethylene 한 목록 한 번, 형태별(암모니아) forms, 별칭 줄, 옛·새 모양 같은 결과
//   (4) 영어 화면: 제목·수량·근거 문구에 한글이 없는지
//   node frontend/scripts/tests/test_catrules.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const STATIC = "E:/dev-cache/chemip-static/out/v1";
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined }, compact: false, comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const MODULES = [
  "lang.jsx", "safety_rules_data.jsx", "ghs_hazard_parse.jsx",
  "apl_units.jsx", "apl_psm_data.jsx", "apl_hazmat_data.jsx", "apl_cites.jsx", "apl_psm_core.jsx", "apl_hazmat_core.jsx",
  "catrule_data.jsx", "catrule_core.jsx", "catrule_labels.jsx", "catrule_labels_en.jsx", "intl_merge.jsx",
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
const HANGUL = /[가-힣]/;
const keys = rs => rs.map(r => `${r.key}:${r.status}`).sort();

function readStatic(rel) {
  try {
    const b = fs.readFileSync(path.join(STATIC, rel));
    return JSON.parse((b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b).toString("utf8"));
  } catch (e) { return null; }
}

function run(W, lang) {
  const E = W.catEvaluate;
  // ── (1) hand-made inputs ──
  // ethylene: gas, LFL 2.7 / UFL 36 (KOSHA MSDS 9항), KOSHA 인화성 가스 1, CLP Flam. Gas 1, named on 산안규칙 별표 9 제5호다
  const eth = { cas: "74-85-1", flash: -136, bp: -104, mp: -169.2, lfl: 2.7, ufl: 36, kosha: ["flam_gas:1", "press_gas:"],
    clp: ["flam_gas:1", "press_gas:", "stot_se:3N"], lists: ["KR_OSH_DANGEROUS_SUBSTANCES", "CAA_112R"], s15: ["해당없음"] };
  const re = E(eth);
  check(`${lang} ethylene rules`, JSON.stringify(keys(re)) === JSON.stringify(["kr_psm_gas:applies", "seveso_P2:applies", "us_psm_flam:applies"]), keys(re));
  const psm = re.find(r => r.key === "kr_psm_gas");
  check(`${lang} ethylene PSM 5,000/200,000 kg [src 별표 13 제1호]`, psm && psm.ref.handle === 5000 && psm.ref.store === 200000);
  const p2 = re.find(r => r.key === "seveso_P2");
  check(`${lang} ethylene Seveso P2 10/50 t + liquefied note [src Annex I Part 1]`, p2 && p2.ref.lower === 10 && p2.ref.upper === 50 && p2.notes.includes("liquefied"));
  const us = re.find(r => r.key === "us_psm_flam");
  check(`${lang} ethylene OSHA PSM 10,000 lb [src 1910.119(a)(1)(ii)]`, us && us.ref.lb === 10000 && us.ref.kg === 4535.9 && us.basis.length === 2);
  // same gas but not on the 별표 9 named list (propylene) → 제5호아 50 m³
  const pro = { ...eth, cas: "115-07-1", lfl: 2.4, ufl: 10.3, kosha: [], clp: ["flam_gas:1", "press_gas:"], lists: [] };
  const rp = E(pro);
  const b9 = rp.find(r => r.key === "b9_5h");
  check(`${lang} propylene 별표 9 제5호아 50 m³`, b9 && b9.ref.q === 50 && b9.ref.unit === "m³" && b9.status === "applies", keys(rp));
  check(`${lang} propylene US PSM via CLP only`, rp.some(r => r.key === "us_psm_flam" && r.status === "applies"));
  // benzene: liquid FP -11 °C, BP 80 °C, MSDS 15항 제1석유류 비수용성 200 L, CLP Flam. Liq. 2
  const bz = { cas: "71-43-2", flash: -11, bp: 80, mp: 5.5, lfl: 1.2, ufl: 8, kosha: ["flam_liq:2", "carc:1B", "aq_chronic:2"],
    clp: ["flam_liq:2", "carc:1A"], lists: [], s15: ["제4류 인화성액체 제1석유류 비수용성액체 (200L)"] };
  const rb = E(bz);
  check(`${lang} benzene rules`, JSON.stringify(keys(rb)) === JSON.stringify(["b9_4b:applies", "kr_hazmat:msds", "kr_psm_liquid:applies", "seveso_P5c:applies", "us_psm_flam:applies"]), keys(rb));
  check(`${lang} benzene 별표 9 제4호나 400 L`, rb.find(r => r.key === "b9_4b").ref.q === 400);
  check(`${lang} benzene 위험물 제1석유류 비수용성 200 L`, (() => { const h = rb.find(r => r.key === "kr_hazmat"); return h && h.ref.k === "c4_p1" && h.ref.qty === 200; })());
  check(`${lang} benzene Seveso P5c 5000/50000 t (CLP, not KOSHA aquatic)`, (() => { const s = rb.find(r => r.key === "seveso_P5c"); return s && s.ref.lower === 5000 && s.ref.upper === 50000 && !rb.some(r => r.key === "seveso_E2"); })());
  // ammonia: named in Annex 13 (제6호 10,000 kg) and Seveso Part 2; KOSHA flam gas 1 vs CLP flam gas 2 → US PSM check
  const am = { cas: "7664-41-7", flash: null, bp: -33.35, mp: -78, lfl: 33.6, ufl: 15, kosha: ["flam_gas:1", "acute_inh:3"],
    clp: ["flam_gas:2", "press_gas:", "acute_inh:3*", "skin:1B", "aq_acute:1"], lists: ["EU_SEVESO_III", "US_OSHA_PSM"], s15: [] };
  const ra = E(am);
  check(`${lang} ammonia rules`, JSON.stringify(keys(ra)) === JSON.stringify(["kr_psm_named:named", "seveso_named:named", "us_psm_flam:check"]), keys(ra));
  check(`${lang} ammonia 별표 13 제6호 10,000 kg`, (() => { const n = ra.find(r => r.key === "kr_psm_named"); return n && n.ref.no === 6 && n.ref.q === 10000; })());
  check(`${lang} ammonia US PSM notes`, ra.find(r => r.key === "us_psm_flam").notes.includes("sourcesDiffer") && ra.find(r => r.key === "us_psm_flam").notes.includes("alsoAppendixA"));
  // swapped flammability limits are not used; classification only → check
  const sw = E({ cas: "1-11-1", bp: -50, lfl: 30, ufl: 10, kosha: ["flam_gas:1"], clp: null, lists: [] });
  check(`${lang} swapped limits → check`, sw.some(r => r.key === "kr_psm_gas" && r.status === "check" && r.notes.includes("limitsSwapped")), keys(sw));
  check(`${lang} no CLP → Seveso from KOSHA as check`, sw.some(r => r.key === "seveso_P2" && r.status === "check" && r.notes.includes("noClp")));
  // non-flammable liquid with high flash point → nothing flammable
  const water = E({ cas: "7732-18-5", flash: null, bp: 100, mp: 0, kosha: [], clp: null, lists: [] });
  check(`${lang} water → no rules`, water.length === 0, keys(water));
  // 별표 9 제4호다 (23–60 °C) and 4가 (FP < 23, BP ≤ 35)
  check(`${lang} 별표 9 제4호다`, E({ cas: "1-1-1", flash: 40, bp: 140, kosha: [], clp: null, lists: [] }).some(r => r.key === "b9_4c" && r.ref.q === 1000));
  check(`${lang} 별표 9 제4호가`, E({ cas: "1-1-1", flash: -45, bp: 34.6, kosha: [], clp: null, lists: [] }).some(r => r.key === "b9_4a" && r.ref.q === 200));
  check(`${lang} US PSM liquid FP 40 °C not covered`, !E({ cas: "1-1-1", flash: 40, bp: 140, kosha: [], clp: null, lists: [] }).some(r => r.key === "us_psm_flam"));

  // labels render for every rule, no Hangul in English
  const all = [...re, ...rp, ...rb, ...ra, ...sw];
  const L = W.CATRULE_LABELS;
  for (const r of all) {
    const title = r.src === "kr_b9" ? L.titles.b9(r.ref) : r.key.startsWith("seveso_") && r.key !== "seveso_named" ? L.titles.seveso(r.ref) : L.titles[r.key](r.ref);
    const basis = r.basis.filter(b => b.k !== "s15").map(b => L.basis[b.k](b.v)).join(" "); // s15 = MSDS 원문 인용(한국어 자료)
    const notes = r.notes.map(k => (typeof L.notes[k] === "function" ? L.notes[k]() : L.notes[k])).join(" ");
    check(`${lang} label ${r.key}`, title && L.status[r.status] && r.notes.every(k => L.notes[k]), r.notes);
    if (lang === "en") check(`en no Hangul ${r.key}`, !HANGUL.test(title + basis + notes + L.status[r.status]), title + basis + notes);
  }
  check(`${lang} hazard name clp`, W.catHazardName("flam_gas:1", "clp") === "Flam. Gas 1" && W.catHazardName("stot_se:3N", "clp") === "STOT SE 3" && W.catHazardName("press_gas:", "clp") === "Press. Gas");

  // ── (3) intl merge ──
  const raw = {
    US: [
      { regulation: "CAA_112R", list: "CAA", detail: "Threshold Quantity: 10,000 lb", source: "EPA", name: "Ethene", quantity: { kind: "inventory", kg: 4535.924 } },
      { regulation: "CAA_112R", list: "CAA", detail: "Threshold Quantity: 10,000 lb", source: "EPA", name: "Ethylene", quantity: { kind: "inventory", kg: 4535.924 } },
      { regulation: "EPCRA_313", list: "TRI", detail: "TRI listed under another name on this list", source: "EPA", name: "Ethene" },
      { regulation: "EPCRA_313", list: "TRI", detail: "TRI listed", source: "EPA", name: "Ethylene" },
    ],
    VN: [{ regulation: "VN_DECREE24_APP_I", list: "VN", detail: "x", source: "VN", name: "Ethylene" }],
  };
  const d = W.intlDedupe(raw);
  check("dedupe US two lists", d.US.length === 2, d.US);
  check("dedupe CAA one item, primary Ethylene, aka Ethene", d.US[0].name === "Ethylene" && JSON.stringify(d.US[0].aka) === '["Ethene"]' && d.US[0].detail === "Threshold Quantity: 10,000 lb");
  check("dedupe TRI real detail kept", d.US[1].detail === "TRI listed" && d.US[1].name === "Ethylene" && JSON.stringify(d.US[1].aka) === '["Ethene"]');
  check("dedupe idempotent", JSON.stringify(W.intlDedupe(d)) === JSON.stringify(d));
  const amRaw = { US: [
    { regulation: "CAA_112R", detail: "Threshold Quantity: 20,000 lb", name: "Ammonia (conc 20% or greater)", quantity: { kind: "inventory", kg: 9071.8 } },
    { regulation: "CAA_112R", detail: "Threshold Quantity: 10,000 lb", name: "Ammonia (anhydrous)", quantity: { kind: "inventory", kg: 4535.9 } },
  ] };
  const da = W.intlDedupe(amRaw);
  check("dedupe forms kept", da.US.length === 1 && da.US[0].forms.length === 2 && da.US[0].quantity.kg === 4535.9, da.US);
  check("dedupe forms idempotent", JSON.stringify(W.intlDedupe(da)) === JSON.stringify(da));
  const named = W.intlNamedItems([
    { list_id: "US_TSCA_INVENTORY", entries: [{ cas: "74-85-1", name: "Ethene", detail: "ACTIVE" }] },
    { list_id: "AU_AIIC_INVENTORY", entries: [{ cas: "74-85-1", name: "Ethene", detail: "CR No. 851" }] },
    { list_id: "CA_DSL", entries: [] },
  ], { US_TSCA_INVENTORY: { jurisdiction: "US", title: "TSCA", law: "TSCA" }, AU_AIIC_INVENTORY: { jurisdiction: "AU", title: "AIIC", law: "ICA" }, CA_DSL: { jurisdiction: "CA" } });
  const c = W.intlCombine({ cas_no: "74-85-1", count: 5, jurisdictions: raw, thresholds: [] }, named);
  check("combine counts lists once", c.count === 5 && c.named === 2 && Object.keys(c.jurisdictions).sort().join(",") === "AU,US,VN", c);
  check("combine named flag", c.jurisdictions.US.some(x => x.regulation === "US_TSCA_INVENTORY" && x.named_list));
  check("combine null", W.intlCombine(null, null) === null);
}

for (const lang of ["ko", "en"]) run(load(lang), lang);

// ── (2) static data, when the export folder exists ──
{
  const W = load("ko");
  const annex6 = readStatic("g/clp_annex6.json");
  const prop = (f, k, lo, hi) => { const xs = (f && f.props && f.props[k]) || []; const h = xs.find(x => Number.isFinite(x.n) && x.n >= lo && x.n <= hi); return h ? h.n : null; };
  const EXPECT = {
    "74-85-1": ["kr_psm_gas:applies", "seveso_P2:applies", "us_psm_flam:applies"],
    "115-07-1": ["b9_5h:applies", "kr_psm_gas:applies", "seveso_P2:applies", "us_psm_flam:applies"],
    "74-82-8": ["kr_psm_gas:applies", "seveso_P2:applies", "us_psm_flam:applies"],
    "71-43-2": ["b9_4b:applies", "kr_hazmat:msds", "kr_psm_liquid:applies", "seveso_P5c:applies", "us_psm_flam:applies"],
    "7664-41-7": ["kr_psm_named:named", "seveso_named:named", "us_psm_flam:check"],
  };
  if (!annex6) console.log("SKIP static cases (no export folder)");
  else for (const [cas, want] of Object.entries(EXPECT)) {
    const f = readStatic(`f/${cas}.json`);
    const page = readStatic(`p/${cas}.json`);
    const kosha = f && f.link && f.link !== cas ? readStatic(`p/${f.link}.json`) : null;
    const det = (kosha && kosha.detail) || { sections: [] };
    const s2 = W.ghpMsdsItems(det, 2), s15 = W.ghpMsdsItems(det, 15);
    const lists = [...((page.trade.import.substance || {}).list_codes || []), ...Object.values(page.intl.jurisdictions).flat().map(x => x.regulation)];
    const input = { cas, flash: prop(f, "flash_point", -273, 600), bp: prop(f, "boiling_point", -273, 1500), mp: prop(f, "melting_point", -273, 3500),
      lfl: prop(f, "lfl", 0, 100), ufl: prop(f, "ufl", 0, 100), kosha: W.ghpKoshaClassification(s2.B02 || ""),
      clp: annex6.entries[cas] ? annex6.entries[cas].flatMap(r => r.hazards) : null, lists, s15: s15.O06 ? [s15.O06] : [] };
    const got = keys(W.catEvaluate(input));
    check(`static ${cas}`, JSON.stringify(got) === JSON.stringify(want), got);
  }
}

console.log(`${fail ? "FAIL" : "PASS"} catrules + intl merge: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
