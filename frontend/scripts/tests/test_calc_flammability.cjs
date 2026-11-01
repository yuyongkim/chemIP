// 가연성·불활성화 계산기 시험 — mix_flash_point · loc_moc · purge · static_charge, 그리고 행 채우기 flash_point·flam_limits
// (calc_flam_fill.jsx 순수 함수, api_calc_fill_flam.jsx — 검색·물성 받기는 가짜 함수). 화면 없이 순수 함수만 Node vm 에 올린다(번역은 빌드와 같은 vendored Babel).
// 계산기 등록 목록(calc_registry.jsx)은 다른 계산기 작업과 엮이지 않도록 올리지 않고, 이 묶음 정의로 작은 목록을 만든다.
// 사례 표시: [src] 출처에 인쇄된 값, [calc] 손계산·해석해(교과서 문제 조건을 쓴 것 포함, 인쇄 답은 대조하지 않음).
//
//   node frontend/scripts/tests/test_calc_flammability.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = { presets: ["react", "env"], plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"], targets: { browsers: undefined }, comments: false };
const PURE = /^calc_(?!view|nav|form|field|table_field|results|notes|unit_select|substance_link|registry|chart(?!_scale))[a-z0-9_]+\.jsx$/;
const EXTRA = ["lang.jsx", "term_glossary.jsx", "term_glossary_en.jsx", "usearch_core.jsx", "usearch_provider_calculators.jsx", "calc_table_field_fill.jsx", "api_calc_fill_flam.jsx"];
const MINE = ["calc_flam_fill.jsx", "api_calc_fill_flam.jsx", "calc_mix_lfl.jsx", "calc_stoich_air.jsx", "calc_mix_flash_point.jsx", "calc_loc_moc.jsx", "calc_purge.jsx", "calc_static_charge.jsx"];
const KEYS = ["mix_lfl", "stoich_air", "mix_flash_point", "loc_moc", "purge", "static_charge"];
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const HANGUL = /[가-힣ㄱ-ㆎ]/;

const results = [];
function check(name, ok, note = "") { results.push(Boolean(ok)); console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`); }
function near(name, got, want, tol) { check(name, Number.isFinite(got) && Math.abs(got - want) <= tol, `${got} vs ${want} (±${tol})`); }
function rel(name, got, want, tol) { check(name, Number.isFinite(got) && Math.abs(got - want) / Math.abs(want) <= tol, `${got} vs ${want} (±${tol * 100}%)`); }

function load(lang) {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const files = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1]).filter(f => PURE.test(f) || EXTRA.includes(f));
  const sb = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sb.window = sb;
  const ctx = vm.createContext(sb);
  const failed = [];
  for (const rel of files) {
    try { vm.runInContext(babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code, ctx, { filename: rel }); }
    catch (e) { failed.push(`${rel}: ${e.message}`); }
  }
  const defs = [sb.CALC_DEF_MIX_LFL, sb.CALC_DEF_STOICH_AIR, sb.CALC_DEF_MIX_FLASH_POINT, sb.CALC_DEF_LOC_MOC, sb.CALC_DEF_PURGE, sb.CALC_DEF_STATIC_CHARGE];
  return { W: sb, files, failed, defs };
}

const K = load("ko");
const E = load("en");
const W = K.W;
check("이 묶음 파일 모두 index.html 에 있음", MINE.every(f => K.files.includes(f)), MINE.filter(f => !K.files.includes(f)).join(", "));
const myFail = K.failed.filter(f => MINE.some(m => f.startsWith(m)));
check("이 묶음 파일 모두 오류 없이 올라감", myFail.length === 0, myFail.join(" | "));
if (K.failed.length) console.log(`  (다른 작업 파일 올리기 오류 ${K.failed.length}건 — 이 시험과 무관: ${K.failed.map(f => f.split(":")[0]).join(", ")})`);
check("정의 6개 있음", K.defs.every(Boolean) && E.defs.every(Boolean));

const defOf = (win, key) => [win.CALC_DEF_MIX_LFL, win.CALC_DEF_STOICH_AIR, win.CALC_DEF_MIX_FLASH_POINT, win.CALC_DEF_LOC_MOC, win.CALC_DEF_PURGE, win.CALC_DEF_STATIC_CHARGE].find(d => d && d.key === key);

// 화면과 같은 길: 기본 상태 → 덮어쓰기(show 단위 글자, { raw, unit } 이면 단위도) → calcEvaluate. ko·en 결과 수치가 같아야 한다.
const enBad = [];
function runIn(win, key, over = {}, tables = {}) {
  const def = defOf(win, key);
  const st = win.calcInitialState(def, {});
  for (const [k, v] of Object.entries(over)) {
    const i = def.inputs.find(x => x.key === k);
    if (!i) throw new Error(`${key}: no input ${k}`);
    if (i.type === "choice") st[k] = v;
    else if (v && typeof v === "object") st[k] = { raw: String(v.raw), unit: v.unit };
    else st[k] = { ...st[k], raw: String(v) };
  }
  for (const [k, rows] of Object.entries(tables)) st[k] = rows.map(r => Object.fromEntries(Object.entries(r).map(([c, x]) => [c, x == null ? "" : String(x)])));
  return win.calcEvaluate(def, st);
}
function run(key, over, tables) {
  const a = runIn(W, key, over, tables), b = runIn(E.W, key, over, tables);
  for (const [k, v] of Object.entries(a.outputs || {})) if (typeof v === "number" && !Object.is(v, b.outputs?.[k])) enBad.push(`${key}.${k}`);
  [b.error, ...(b.warnings || []), ...Object.values(b.outputs || {}).filter(x => typeof x === "string")].filter(t => t && HANGUL.test(t)).forEach(t => enBad.push(`${key}: ${t.slice(0, 30)}`));
  return a;
}
const K2C = (k) => k - 273.15;

// ════ 1. 혼합물 인화점 (Liaw, 이상 용액) ════
// [src] Oh & In (2015) Fire Sci. Eng. 29(5):1–6, 표 2 Antoine(log₁₀ mmHg, °C), 표 1 순성분 인화점(this work), 표 4 Raoult 계산치(K)
const MEOH = { name: "MeOH", cas: "67-56-1", Tfp: 283.45 - 273.15, B: 1582.27, C: 239.726, M: 32.04 };
const ETOH = { name: "EtOH", cas: "64-17-5", Tfp: 284.75 - 273.15, B: 1592.86, C: 226.184, M: 46.07 };
const BUOH = { name: "BuOH", cas: "71-36-3", Tfp: 308.65 - 273.15, B: 1617.52, C: 203.296, M: 74.12 };
const fp = (a, b, x1, basis = "mol") => run("mix_flash_point", { basis }, { rows: [{ ...a, x: x1 }, { ...b, x: Number((1 - x1).toFixed(6)) }] });
for (const [x1, want] of [[0.0505, 306.55], [0.2007, 301.02], [0.5001, 292.62], [0.9000, 284.96]]) {
  near(`[src] 메탄올(1)+1-부탄올 x1=${x1} → ${want} K (Oh & In 2015 표 4 Raoult)`, fp(MEOH, BUOH, x1).outputs?.Tmix, want, 0.01);
}
for (const [x1, want] of [[0.0508, 306.36], [0.5001, 292.90], [0.8997, 286.08]]) {
  near(`[src] 에탄올(1)+1-부탄올 x1=${x1} → ${want} K (Oh & In 2015 표 4 Raoult)`, fp(ETOH, BUOH, x1).outputs?.Tmix, want, 0.01);
}
near("[src] 메탄올+1-부탄올 x1=0.5001 실측 292.45 K 와 1 K 안 (Oh & In 2015 표 4 Exp.)", fp(MEOH, BUOH, 0.5001).outputs?.Tmix, 292.45, 1.0);
let r = run("mix_flash_point");
near("기본값 = Oh & In 메탄올+1-부탄올 x1=0.5001 → 292.62 K", r.outputs?.Tmix, 292.62, 0.01);
check("기본값 GHS: 19.5 °C → 구분 1 또는 2", /구분 1 또는 2/.test(r.outputs?.ghs || ""), r.outputs?.ghs);
// [calc] R4 6a: 메탄올/물 50/50 mol, T_fp 11 °C, Antoine B 1582.271 C 239.726 → 23.6 °C (이상 용액 손계산)
r = run("mix_flash_point", {}, { rows: [{ name: "MeOH", x: 0.5, Tfp: 11, B: 1582.271, C: 239.726 }, { name: "Water", x: 0.5 }] });
near("[calc] 메탄올/물 50/50 mol → 23.56 °C (R4 6a)", K2C(r.outputs?.Tmix), 23.559, 0.01);
check("불연성 성분이 있으면 이상 용액 경고", (r.warnings || []).some(w => /불연성/.test(w)));
near("가연성 몰분율 합 = 0.5", r.outputs?.xFlam, 0.5, 1e-12);
r = run("mix_flash_point", {}, { rows: [{ name: "A", x: 1, Tfp: 21, B: 1819.57, C: 205 }] });
near("[calc] 한 성분만 → 그 성분 인화점 21 °C", K2C(r.outputs?.Tmix), 21, 1e-9);
// 질량분율: 메탄올 32.04·1-부탄올 74.12 g/mol, 몰분율 0.5 ↔ 질량분율 32.04/(32.04+74.12)
{
  const w1 = 32.04 / (32.04 + 74.12);
  const a = fp(MEOH, BUOH, 0.5).outputs?.Tmix, b = run("mix_flash_point", { basis: "mass" }, { rows: [{ ...MEOH, x: w1 }, { ...BUOH, x: 1 - w1 }] }).outputs?.Tmix;
  near("[calc] 질량분율 기준 = 같은 몰 조성의 몰분율 결과", b, a, 1e-9);
}
r = run("mix_flash_point", {}, { rows: [{ name: "A", x: 0.6, Tfp: 21, B: 1819.57, C: 205 }, { name: "B", x: 0.6, Tfp: 49, B: 1929.3, C: 236.43 }] });
check("조성 합 1.2 → 맞춰 계산 + 경고", r.outputs && (r.warnings || []).some(w => /합 1/.test(w)));
r = run("mix_flash_point", {}, { rows: [{ name: "A", x: 1, Tfp: 21 }] });
check("인화점만 있고 B·C 없음 → 오류", /Antoine B·C/.test(r.error || ""), r.error);
r = run("mix_flash_point", {}, { rows: [{ name: "W", x: 1 }] });
check("인화점 있는 성분 없음 → 오류", /하나 이상/.test(r.error || ""), r.error);
r = run("mix_flash_point", { basis: "mass" }, { rows: [{ name: "A", x: 1, Tfp: 21, B: 1819.57, C: 205 }] });
check("질량분율인데 분자량 없음 → 오류", /분자량/.test(r.error || ""), r.error);
check("GHS 30 °C → 구분 3, 70 °C → 4, 100 °C → 해당 없음", W.calcFpGhs(30) === "구분 3" && W.calcFpGhs(70) === "구분 4" && /해당 없음/.test(W.calcFpGhs(100)));
{
  const ch = W.CALC_DEF_MIX_FLASH_POINT.chart(fp(MEOH, BUOH, 0.5001).values, fp(MEOH, BUOH, 0.5001).outputs);
  const pts = ch.series[0].points;
  check("그래프: 2성분 곡선 41점, 양 끝 = 순성분 인화점", pts.length === 41 && Math.abs(pts[0][1] - BUOH.Tfp) < 1e-6 && Math.abs(pts[40][1] - MEOH.Tfp) < 1e-6, `${pts.length}점`);
  check("그래프: 표시점 = 계산 결과", Math.abs(ch.markers[0].y - (292.62 - 273.15)) < 0.01);
  const three = run("mix_flash_point", {}, { rows: [{ ...MEOH, x: 0.3 }, { ...ETOH, x: 0.3 }, { ...BUOH, x: 0.4 }] });
  check("그래프: 3성분이면 없음", W.CALC_DEF_MIX_FLASH_POINT.chart(three.values, three.outputs) === null);
}

// ════ 2. 행 채우기 (calc_flam_fill.jsx 순수 함수 + api_calc_fill_flam.jsx, CalcRowFill 안내 줄) ════
// f/<CAS>.json 모양(CONTRACT.md) — 값은 data/portal_facts.db 의 메탄올(67-56-1) 행과 같다
const FACTS_MEOH = { v: 1, cas: "67-56-1", names: { ko: ["메탄올"], en: ["Methanol"] }, props: {
  flash_point: [{ t: "11.11 ℃", n: 11.11, u: "°C" }], boiling_point: [{ t: "65 ℃", n: 65, u: "°C" }],
  vapor_pressure: [{ t: "127 ㎜Hg(25℃)", n: 16931.894, u: "Pa", c: "25℃" }], molar_mass: [{ t: "32.04", n: 32.04, u: "g/mol" }],
  lfl: [{ t: "6 %", n: 6, u: "%" }], ufl: [{ t: "50 %", n: 50, u: "%" }] } };
const FACTS_TB_ONLY = { v: 1, props: { flash_point: [{ t: "< 0 ℃", n: null }], boiling_point: [{ n: 100, u: "°C" }] } };
{
  let p = W.calcFlashFillPatch(FACTS_MEOH, null);
  const Bfit = (Math.log10(760) - Math.log10(16931.894 / 133.322387415)) / (1 / 298.15 - 1 / 338.15);
  check("채우기(두 점 맞춤): 인화점 11.11·분자량 32.04·C 273.15", p.how === "fit" && p.patch.Tfp === 11.11 && p.patch.M === 32.04 && p.patch.C === 273.15, JSON.stringify(p));
  rel("[calc] 채우기 B = (log₁₀760 − log₁₀P₂₅)/(1/298.15 − 1/338.15)", p.patch.B, Bfit, 1e-5);
  p = W.calcFlashFillPatch(FACTS_TB_ONLY, null);
  rel("[calc] 끓는점만 → Kistiakowsky B = (36.1/R + ln Tb)·Tb/ln10", p.patch.B, (36.1 / 8.314462618 + Math.log(373.15)) * 373.15 / Math.LN10, 1e-5);
  check("범위 표기(n=null) 인화점은 빈칸, how = kist", p.patch.Tfp === "" && p.how === "kist");
  const pre = W.CALC_VLE_ANTOINE_DATA && W.CALC_VLE_ANTOINE_DATA.Methanol;
  if (pre) {
    p = W.calcFlashFillPatch(FACTS_MEOH, pre);
    rel("사전 설정(CoolProp ln·Pa·K) → log₁₀·°C: B = B₀/ln10", p.patch.B, pre.B / Math.LN10, 1e-5);
    near("사전 설정 → C = C₀ + 273.15", p.patch.C, pre.C + 273.15, 1e-3);
  }
  check("채울 값 없음 판정", !W.calcFlamPatchHasData(W.calcFlamLimitsPatch({ props: {} }).patch) && W.calcFlamPatchHasData(W.calcFlamLimitsPatch(FACTS_MEOH).patch));
  const lim = W.calcFlamLimitsPatch(FACTS_MEOH).patch;
  check("mix_lfl 채우기: LFL 6, UFL 50", lim.LFL === 6 && lim.UFL === 50);
  // 채운 메탄올 한 성분 → 11.11 °C
  const fp1 = W.calcFlashFillPatch(FACTS_MEOH, null).patch;
  r = run("mix_flash_point", {}, { rows: [{ name: "MeOH", x: 1, ...fp1 }] });
  near("채운 메탄올 한 성분 → 11.11 °C", K2C(r.outputs?.Tmix), 11.11, 1e-9);
  check("표 정의 rowFill: mix_flash_point = flash_point, mix_lfl = flam_limits",
    W.CALC_DEF_MIX_FLASH_POINT.inputs.find(i => i.key === "rows").rowFill === "flash_point" && W.CALC_DEF_MIX_LFL.inputs.find(i => i.key === "rows").rowFill === "flam_limits");
}
// API 층 채우기 함수(가짜 검색·물성)
async function fillCases() {
  W.fetchCalcFillCandidates = async (q) => (q === "메탄올" || q === "67-56-1" ? [{ cas: "67-56-1", name: q === "67-56-1" ? q : "메탄올" }] : q === "nodata" ? [{ cas: "50-00-0", name: "X" }] : []);
  W.fetchFacts = async (cas) => (cas === "67-56-1" ? FACTS_MEOH : null);
  const realPreset = W.calcAntoinePreset;
  W.calcAntoinePreset = () => null;   // 두 점 맞춤 길을 본다(사전 설정 길은 아래에서 따로)
  let f = await W.fetchCalcFlashPointFill({ name: "메탄올" });
  check("API 채우기 flash_point: 메탄올 → patch(이름·인화점·B·C·분자량)", f.patch && f.patch.name === "메탄올" && f.patch.Tfp === 11.11 && f.info.source === "props_flash" && f.info.cas === "67-56-1", JSON.stringify(f).slice(0, 120));
  f = await W.fetchCalcFlamLimitsFill({ name: "67-56-1" });
  check("API 채우기 flam_limits: CAS 로 검색 → 이름 칸은 입력 그대로", f.patch && f.patch.LFL === 6 && f.patch.name === "67-56-1" && f.info.source === "props_limits");
  check("빈 칸 → empty, 없는 물질 → notFound, 파일 없음 → noData",
    (await W.fetchCalcFlashPointFill({ name: " " })).error === "empty" && (await W.fetchCalcFlashPointFill({ name: "zzz" })).error === "notFound"
    && (await W.fetchCalcFlamLimitsFill({ name: "nodata" })).error === "noData");
  const L = { ...W.CALC_LABELS.rowFill, ...W.CALC_LABELS.rowFill.kinds.flash_point };
  const note = W.calcRowFillNote(L, 2, await W.fetchCalcFlashPointFill({ name: "메탄올" }));
  check("안내 줄: 출처·맞춤 방법", note.ok && /MSDS 9항/.test(note.text) && /두 점/.test(note.text), note.text);
  W.calcAntoinePreset = (q, cas) => (cas === "67-56-1" && W.CALC_VLE_ANTOINE_DATA ? { id: "Methanol", ...W.CALC_VLE_ANTOINE_DATA.Methanol } : null);
  const viaPreset = await W.fetchCalcFlashPointFill({ name: "메탄올" });
  check("사전 설정 물질이 있으면 그 상수(CoolProp) — 안내 줄", viaPreset.info?.how === "preset" && /CoolProp/.test(W.calcRowFillNote(L, 1, viaPreset).text));
  W.calcAntoinePreset = realPreset;
  const LE = { ...E.W.CALC_LABELS.rowFill, ...E.W.CALC_LABELS.rowFill.kinds.flam_limits };
  check("en 안내 줄·종류별 단추 문구 한글 없음", !HANGUL.test(E.W.calcRowFillNote(LE, 1, { patch: {}, info: { source: "props_limits", name: "Methanol", cas: "67-56-1" } }).text)
    && !HANGUL.test(LE.button(1)) && !HANGUL.test(LE.hint));
}

// ════ 3. LOC / MOC ════
r = run("loc_moc");
near("[calc] n-부탄 z = 6.5", r.outputs?.z, 6.5, 1e-12);
near("[calc] n-부탄 LOC = 6.5 × 1.6 = 10.4 % (C&L 6장 부탄 예와 같은 식, 인쇄값 대조 안 함)", r.outputs?.locEst, 10.4, 1e-9);
near("관리 목표 = 10.4 − 2 = 8.4 %", r.outputs?.target, 8.4, 1e-9);
near("N₂/공기 = 20.95/8.4 − 1", r.outputs?.n2PerAir, 20.95 / 8.4 - 1, 1e-9);
r = run("loc_moc", { m: 1, x: 4, y: 0, lfl: 5, ufl: 15 });
near("[calc] 메탄 LOC = 2 × 5 = 10 % (R4 6b)", r.outputs?.locEst, 10, 1e-9);
near("[calc] 메탄 OSFC = 5/(1 − 2·5/20.95) = 9.566 % (Mashuga & Crowl 1998 꼴)", r.outputs?.osfc, 5 / (1 - 10 / 20.95), 1e-9);
near("[calc] 메탄 ISOC = 2·5/(1 − 5/100) = 10.526 % (Mashuga & Crowl 1998 꼴)", r.outputs?.isoc, 10 / 0.95, 1e-9);
r = run("loc_moc", { m: 1, x: 4, y: 0, lfl: 5, ufl: 15, locMeas: 12 });
check("실측 LOC 12 % → 판단에 씀, 경고 없음", r.outputs?.locUsed === 12 && r.outputs?.target === 10 && /실측/.test(r.outputs?.basis) && !(r.warnings || []).some(w => /어림입니다/.test(w)));
r = run("loc_moc", { m: 6, x: 14, y: 0, lfl: "", ufl: "" });
near("[src] 헥산 Cst 2.16 % (C&L 예제 6-4) — stoich_air 와 같은 식", r.outputs?.cst, 2.16, 0.005);
near("헥산 LFL 어림 0.55 Cst = 1.19 % (C&L 예제 6-4)", r.outputs?.lflUsed, 1.19, 0.005);
check("loc_moc Cst = stoich_air Cst", Math.abs(r.outputs.cst - run("stoich_air").outputs.cst) < 1e-12);
r = run("loc_moc", { margin: 15 });
check("여유 > LOC → 오류", /여유/.test(r.error || ""), r.error);
r = run("loc_moc", { lfl: 9, ufl: 8 });
check("UFL ≤ LFL → 오류", /UFL/.test(r.error || ""), r.error);
{
  const res = run("loc_moc", { m: 1, x: 4, y: 0, lfl: 5, ufl: 15 });
  const ch = W.CALC_DEF_LOC_MOC.chart(res.values, res.outputs);
  const zone = ch.series.find(s => s.key === "zone").points;
  check("도표: 연소 범위 다각형 닫힘·꼭지점 = (LOC/z, LOC)", zone.length === 4 && zone[0].join() === zone[3].join() && Math.abs(zone[1][0] - 5) < 1e-9 && Math.abs(zone[1][1] - 10) < 1e-9);
  check("도표: 공기선 (0, 20.95) 에서 시작, 축 O₂ 0–25", ch.series.find(s => s.key === "air").points[0][1] === 20.95 && ch.y.max === 25);
}

// ════ 4. 퍼지 ════
// [src] Kinsley (2001) CEP 97(2) 예제 3: 20,000 gal, 공기 → O₂ 2 %, K = 0.25 → 25,148 ft³ N₂
r = run("purge", { mode: "sweep", V: { raw: 20000, unit: "gal" }, y0: 21, target: 2, K: 0.25 });
rel("[src] Kinsley 2001 예제 3 스위프: 25,148 ft³", r.outputs?.sweepVol / 0.028316846592, 25148, 5e-4);
// [src] Kinsley (2001) 예제 1: 5,000 gal, 75 °F, 25 mmHg → 1 atm, 21 % → 2 %: k = 0.69 → 1 회, N₂ 1.66 lb-mol
r = run("purge", { mode: "vacuum", V: { raw: 5000, unit: "gal" }, T: { raw: 75, unit: "F" }, vPL: 25, vPH: 760, y0: 21, target: 2 });
near("[src] Kinsley 2001 예제 1 진공: k = 0.69", r.outputs?.jExact, 0.69, 0.005);
check("[src] Kinsley 2001 예제 1 진공: 1 회", r.outputs?.cycles === 1);
rel("[src] Kinsley 2001 예제 1 진공: N₂ 1.66 lb-mol (= 753 mol)", r.outputs?.nTotal / 453.59237, 1.66, 0.005);
// [calc] Crowl & Louvar 3판 예제 7-1 문제 조건: 1,000 gal, 1 ppm, 20 mmHg ↔ 760 mmHg, 75 °F → j = 3.37 → 4 회
r = run("purge", { mode: "vacuum", V: { raw: 1000, unit: "gal" }, T: { raw: 75, unit: "F" }, vPL: 20, vPH: 760, y0: 21, target: 0.0001 });
near("[calc] C&L 예제 7-1 조건 진공: j = ln(10⁻⁶/0.21)/ln(20/760) = 3.37", r.outputs?.jExact, Math.log(1e-6 / 0.21) / Math.log(20 / 760), 1e-9);
check("[calc] C&L 예제 7-1 조건 진공: 4 회", r.outputs?.cycles === 4);
near("[calc] C&L 예제 7-1 조건: 4회 Δn = 4·(740/760 atm)·V/RT", r.outputs?.nTotal, 4 * (740 * 133.322387415) * 1000 * 3.785411784e-3 / (8.314462618 * ((75 + 459.67) * 5 / 9)), 1e-6);
// [calc] C&L 예제 7-2 문제 조건: 80 psig 질소, 14.7 psia → j = 6.57 → 7 회
r = run("purge", { mode: "pressure", V: { raw: 1000, unit: "gal" }, T: { raw: 75, unit: "F" }, pPH: { raw: 94.7, unit: "psi" }, pPL: { raw: 14.7, unit: "psi" }, y0: 21, target: 0.0001 });
near("[calc] C&L 예제 7-2 조건 압력: j = ln(10⁻⁶/0.21)/ln(14.7/94.7) = 6.58", r.outputs?.jExact, Math.log(1e-6 / 0.21) / Math.log(14.7 / 94.7), 1e-9);
check("[calc] C&L 예제 7-2 조건 압력: 7 회", r.outputs?.cycles === 7);
// [calc] R4 6c 사례
r = run("purge", { mode: "vacuum", vPL: 20, vPH: 760, y0: 21, target: 0.6 });
near("[calc] 진공 760 → 20 mmHg 1 회: 21 → 0.553 %", r.outputs?.yFinal, 21 * 20 / 760, 1e-9);
r = run("purge", { mode: "vacuum", vPL: 20, vPH: 760, y0: 21, target: 0.02 });
near("[calc] 2 회: 0.01454 %", r.outputs?.yFinal, 21 * (20 / 760) ** 2, 1e-12);
r = run("purge", { mode: "pressure", pPH: { raw: 94.7, unit: "psi" }, pPL: { raw: 14.7, unit: "psi" }, y0: 21, target: 1 });
check("[calc] 압력 0 ↔ 80 psig: 2 회로 0.51 % (R4)", r.outputs?.cycles === 2 && Math.abs(r.outputs.yFinal - 21 * (14.7 / 94.7) ** 2) < 1e-12, `${r.outputs?.yFinal}`);
r = run("purge", { mode: "sweep", V: 10, y0: 21, target: 1, K: 1, Q: { raw: 60, unit: "m3h" } });
near("[calc] 스위프 10 m³, 21 → 1 %: 10·ln 21 = 30.45 m³ (R4)", r.outputs?.sweepVol, 10 * Math.log(21), 1e-9);
near("스위프 시간 30.45 m³ ÷ 60 m³/h = 30.4 min", r.outputs?.time / 60, 10 * Math.log(21), 1e-9);
r = run("purge", { mode: "vacuum", vPL: 20, vPH: 760, y0: 21, yN: 0.5, target: 1 });
check("[calc] 질소 속 O₂ 0.5 %, 목표 1 %: 2 회, y₂ = 0.5 + 20.5·(20/760)²", r.outputs?.cycles === 2 && Math.abs(r.outputs.yFinal - (0.5 + 20.5 * (20 / 760) ** 2)) < 1e-12, `${r.outputs?.cycles} ${r.outputs?.yFinal}`);
r = run("purge", { yN: 1, target: 1 });
check("목표 ≤ 질소 속 O₂ → 오류", /목표/.test(r.error || ""), r.error);
r = run("purge", { mode: "vacuum", vPL: 800, vPH: 760 });
check("P_L ≥ P_H → 오류", /P_H/.test(r.error || ""), r.error);
r = run("purge", { target: 25 });
check("목표 ≥ 처음 → 0 회, 경고", r.outputs?.cycles === 0 && (r.warnings || []).length > 0);
{
  const res = run("purge", { mode: "vacuum", vPL: 20, vPH: 760, y0: 21, target: 0.0001 });
  const ch = W.CALC_DEF_PURGE.chart(res.values, res.outputs);
  check("그래프: 진공 퍼지 계단 5점(0–4 회), 로그 축", ch.series[0].kind === "step" && ch.series[0].points.length === 5 && ch.y.log === true);
  const sw = run("purge", { mode: "sweep" });
  check("그래프: 스위프 곡선", W.CALC_DEF_PURGE.chart(sw.values, sw.outputs).series[0].points.length === 41);
}

// ════ 5. 정전기 ════
r = run("static_charge");
near("[calc] εr 2, κ 1 pS/m → τ = 17.7 s (R4 6d)", r.outputs?.tau, 8.8541878128e-12 * 2 / 1e-12, 1e-12);
near("[calc] 200 pF, 10 kV → W = 10 mJ (R4 6d)", r.outputs?.W, 10, 1e-9);
near("W/MIE(0.25 mJ) = 40", r.outputs?.ratio, 40, 1e-9);
near("Q = CV = 2 µC", r.outputs?.Q, 2, 1e-12);
check("판정: MIE 이상", /MIE 이상/.test(r.outputs?.verdict || ""));
check("저도전성 경고", (r.warnings || []).length === 1);
r = run("static_charge", { kappa: 0.1 });
near("[calc] κ 0.1 pS/m → τ = 177 s", r.outputs?.tau, 177.08, 0.01);
r = run("static_charge", { kappa: 50, C: 10, V: 1 });
check("50 pS/m → 중도전성, 10 pF·1 kV = 0.005 mJ < MIE", /중도전성/.test(r.outputs?.cls) && /MIE 미만/.test(r.outputs?.verdict) && Math.abs(r.outputs.W - 0.005) < 1e-12);
check("49.9 → 저, 1e4 → 고", /저도전성/.test(W.calcStaticClass(49.9)) && /고도전성/.test(W.calcStaticClass(1e4)) && /중도전성/.test(W.calcStaticClass(9999)));
near("1 % 까지 = τ·ln100", run("static_charge").outputs?.t1, 17.7083756256 * Math.log(100), 1e-6);

// ════ 6. 모든 정의: 기본값·용어·영어 ════
const G = W.TERM_GLOSSARY_KO, GE = E.W.TERM_GLOSSARY_EN;
for (const key of KEYS) {
  const def = defOf(W, key);
  const res = run(key);
  check(`${key}: 기본값 계산 OK`, res.outputs && !res.error && Object.values(res.outputs).every(v => typeof v !== "number" || Number.isFinite(v)));
  check(`${key}: 묶음 = flammability`, def.group === "flammability");
  const terms = [];
  def.inputs.forEach(i => { if (i.term) terms.push(i.term); (i.columns || []).forEach(c => c.term && terms.push(c.term)); });
  def.outputs.forEach(o => o.term && terms.push(o.term));
  const missing = terms.filter(t => !G[t] || !GE[t]);
  check(`${key}: 용어 ${terms.length}개 모두 용어집(한·영)에 있음`, missing.length === 0, missing.join(", "));
  if (!["mix_lfl", "stoich_air"].includes(key)) {
    const noTerm = [...def.inputs.filter(i => !i.term).map(i => i.key), ...def.outputs.filter(o => !o.term).map(o => o.key)];
    check(`${key}: 모든 칸·결과에 용어`, noTerm.length === 0, noTerm.join(", "));
    const chart = W.calcChartFor(def, res);
    check(`${key}: 기본값 그래프 있음`, Boolean(chart && chart.series && chart.series.length), chart ? "" : "null");
  }
  const de = defOf(E.W, key);
  const texts = [de.title, de.summary, ...de.formula, ...de.notes, ...de.reference];
  de.inputs.forEach(i => { texts.push(i.label, i.hint, i.unit); (i.options || []).forEach(o => texts.push(o.label)); (i.columns || []).forEach(c => texts.push(c.label, c.unit)); (i.rows || []).forEach(rw => (i.columns || []).filter(c => c.text).forEach(c => texts.push(rw[c.key]))); });
  de.outputs.forEach(o => texts.push(o.label, o.unit));
  const bad = texts.filter(t => t && HANGUL.test(String(t)));
  check(`${key}: en 정의 글자 한글 없음`, bad.length === 0, bad.slice(0, 2).join(" | "));
}
check("ko·en 수치 같음·en 문구 한글 없음", enBad.length === 0, enBad.slice(0, 4).join(" | "));
check("묶음 이름 ko·en", W.CALC_LABELS_KO.groups.flammability?.name === "가연성·불활성화" && E.W.CALC_LABELS_EN.groups.flammability?.name === "Flammability & inerting");
check("행 채우기 종류별 문구 ko·en 같은 key", ["flash_point", "flam_limits"].every(k => Object.keys(W.CALC_LABELS_KO.rowFill.kinds[k]).join() === Object.keys(E.W.CALC_LABELS_EN.rowFill.kinds[k]).join()));

// ════ 7. 통합 검색: 계산기 문서(제목·용어 이름)로 이 묶음이 맨 위 ════
{
  const docs = W.usCalcDocs(K.defs, G, GE, W.CALC_LABELS_KO.groups);
  const top = (q) => (W.usRankDocs(q, docs)[0] || {}).id;
  for (const [q, want] of [["혼합물 인화점", "mix_flash_point"], ["mixture flash point", "mix_flash_point"], ["퍼지", "purge"], ["purge", "purge"], ["질소 사용량", "purge"],
    ["최소 산소 농도", "loc_moc"], ["OSFC", "loc_moc"], ["정전기", "static_charge"], ["완화시간", "static_charge"], ["relaxation time", "static_charge"], ["Le Chatelier", "mix_lfl"]]) {
    check(`통합 검색 "${q}" → ${want}`, top(q) === `c:${want}`, top(q));
  }
}

fillCases().then(() => {
  const failed = results.filter(x => !x).length;
  console.log(`
${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
}, (e) => { console.error(e); process.exit(1); });
