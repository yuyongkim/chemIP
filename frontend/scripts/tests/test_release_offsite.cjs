// 누출량(release)·장외 영향 사전 검토(offsite) 계산기와 KORA 입력 준비표 순수 함수 시험 — 화면 없이 Node vm.
// 불러오기는 test_calculators.cjs 의 loadCalcModules 와 같은 방식(test_fire_explosion.cjs 등과 같은 사본 — 공용 로더로 뽑을 후보).
// 사례 표시: [src] 출처에 인쇄된 값(EPA RMP OCA Guidance 예제 번호), [calc] 식으로 따로 손계산한 값(R4 조사·이 파일 안 독립 식).
//
//   node frontend/scripts/tests/test_release_offsite.cjs
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined }, compact: false, comments: false,
};
const PURE = /^calc_(?!view|nav|form|field|table_field|table_out|results|notes|unit_select|substance_link|out_table|chart(?!_scale))[a-z0-9_]+\.jsx$/;
const PURE_EXTRA = ["lang.jsx", "term_glossary.jsx", "term_glossary_en.jsx", "apl_terms.jsx",
  "facts_labels.jsx", "facts_labels_en.jsx", "chem_name_core.jsx", "facts_core.jsx", "kora_sheet_labels.jsx", "kora_sheet_labels_en.jsx", "kora_sheet_core.jsx"];
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));

function load(lang) {
  const html = fs.readFileSync(path.join(CHEMIP, "index.html"), "utf8");
  const files = [...html.matchAll(/<script type="text\/babel" src="([^"?]+)/g)].map(m => m[1]).filter(f => PURE.test(f) || PURE_EXTRA.includes(f));
  const sandbox = { console, URLSearchParams, location: { search: `?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of files) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return sandbox;
}

const W = load("ko");
const WE = load("en");
const HANGUL = /[가-힣ㄱ-ㆎ]/;
const results = [];
function check(name, ok, note = "") { results.push(Boolean(ok)); console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`); }
function near(name, got, want, tol) { check(name, Number.isFinite(got) && Math.abs(got - want) / Math.abs(want) <= tol, `${got} vs ${want} (허용 ${tol * 100}%)`); }

function runIn(win, key, over) {
  const def = win.calcFind(key);
  const st = win.calcInitialState(def, {});
  for (const [k, v] of Object.entries(over)) {
    const inp = def.inputs.find(i => i.key === k);
    if (!inp) throw new Error(`${key}: 칸 없음 ${k}`);
    if (inp.type === "choice") st[k] = v;
    else if (v && typeof v === "object") st[k] = { raw: String(v.raw), unit: v.unit };
    else st[k] = { ...st[k], raw: String(v) };
  }
  return win.calcEvaluate(def, st);
}
// ko·en 두 번 — 수치가 같고 en 문구(경고·오류·글자 출력)에 한글이 없어야 한다
function run(key, over = {}) {
  const ko = runIn(W, key, over), en = runIn(WE, key, over);
  const same = JSON.stringify(Object.entries(ko.outputs || {}).filter(([, v]) => typeof v === "number"))
    === JSON.stringify(Object.entries(en.outputs || {}).filter(([, v]) => typeof v === "number"))
    && (ko.warnings || []).length === (en.warnings || []).length && Boolean(ko.error) === Boolean(en.error);
  const enText = [en.error, ...(en.warnings || []), ...Object.values(en.outputs || {}).filter(v => typeof v === "string")].filter(Boolean);
  if (!same) check(`${key} ko·en 수치 같음 ${JSON.stringify(over)}`, false);
  const bad = enText.filter(t => HANGUL.test(t));
  if (bad.length) check(`${key} en 문구 한글 없음`, false, bad[0]);
  if (ko.error || !ko.outputs) check(`${key} 계산됨 ${JSON.stringify(over)}`, false, ko.error || JSON.stringify(ko.errors));
  return ko;
}

const LB = 0.45359237;
const lbmin = (kgs) => kgs / (LB / 60);   // kg/s → lb/min
const lb = (n) => ({ raw: n, unit: "lb" });
const inDia = (areaIn2) => ({ raw: Math.sqrt(4 * areaIn2 / Math.PI), unit: "in" });   // 구멍 면적(in²) → 지름 칸

// ════ 1. 누출량(release) ════
let r = run("release", { phase: "liquid", dh: 25, Cd: 0.61, rho: 1000, h0: 5, Pg: 0, Dt: "" });
near("물 25 mm 구멍, 액위 5 m, C_d 0.61 → 2.97 kg/s [calc R4 §1a]", r.outputs.rate, 2.97, 0.005);
r = run("release", { phase: "liquid", dh: 25, Cd: 0.61, rho: 1000, h0: 5, Pg: { raw: 5, unit: "bar" }, Dt: "" });
near("같은 구멍 + 덮개 5 barg → 9.92 kg/s [calc R4 §1a]", r.outputs.rate, 9.92, 0.005);
r = run("release", { phase: "liquid", dh: 25, Cd: 0.61, rho: 1000, h0: 5, Pg: 0, Dt: 3 });
near("탱크 지름 3 m, 액위 5 m, 25 mm → 비는 시간 23,800 s [calc R4 §1b]", r.outputs.tEmpty, 23800, 0.005);
near("비는 동안 나간 양 = ρ·A_t·h₀ = 35,343 kg", r.outputs.mass, 1000 * Math.PI * 1.5 * 1.5 * 5, 1e-9);
{
  // 독립 확인: 같은 배출을 작은 시간 간격으로 직접 적분(Euler)해 비는 시간을 다시 구한다
  const At = Math.PI * 1.5 * 1.5, Ah = Math.PI * 0.025 ** 2 / 4;
  let h = 5, t = 0;
  const dt = 1;
  while (h > 0) { h -= 0.61 * Ah / At * Math.sqrt(2 * 9.80665 * h) * dt; t += dt; }
  near("비는 시간 — 직접 적분과 같음(±0.2 %)", r.outputs.tEmpty, t, 0.002);
  const def = W.calcFind("release");
  const ch = def.chart(r.values, r.outputs);
  check("액체 탱크 배출: 시간-누출률 그래프 61점, 처음 값 = 처음 누출률", ch && ch.series[0].points.length === 61 && Math.abs(ch.series[0].points[0][1] - r.outputs.rate) < 1e-9);
}
r = run("release", { phase: "gas", dh: 10, Cd: 1, Pv: 10, k: 1.31, T0: 20, mw: 16.04 });
near("메탄 10 barg, 20 °C, 10 mm, C_d 1 → 0.148 kg/s [calc R4 §1c]", r.outputs.rate, 0.148, 0.005);
near("임계 압력비 0.544 [calc R4 §1c]", r.outputs.crit, 0.544, 0.002);
check("막힘 흐름 판정", /Choked|막힘/.test(r.outputs.flow));
r = run("release", { phase: "gas", dh: inDia(5), Cd: 0.8, Pv: { raw: 30 - 14.696, unit: "psi" }, Pa: 101.325, k: 1.17, T0: 25, mw: 27.67 });
near("디보란 5 in², 30 psia, 298 K, C_d 0.8(GF 의 가정) → 148 lb/min [src EPA 예제 19, GF 반올림 차 3 % 안]", lbmin(r.outputs.rate), 148, 0.03);
r = run("release", { phase: "gas", dh: 10, Cd: 1, Pv: { raw: 0.5, unit: "bar" }, k: 1.4, T0: 20, mw: 28.96 });
check("공기 0.5 barg → 아음속(P_a/P₀ 0.67 > 0.528)", /Subsonic|아음속/.test(r.outputs.flow));
{
  // 아음속 식 독립 계산
  const p0 = 151325, pa = 101325, rr = pa / p0, k = 1.4, M = 0.02896, T = 293.15, A = Math.PI * 0.01 ** 2 / 4;
  const m = A * p0 * Math.sqrt(2 * M / (8.314462618 * T) * (k / (k - 1)) * (rr ** (2 / k) - rr ** ((k + 1) / k)));
  near("아음속 누출률 = 식 D-7 직접 계산", r.outputs.rate, m, 1e-9);
}
r = run("release", { phase: "gas", dh: 10, Cd: 1, Pv: 100, k: 1.31, T0: 20, mw: 16.04, V: 1 });
{
  // 등온 막힘 감압의 해석해 P = P₀ e^(−t/τ) (막힘 구간) 과 비교: 누출률이 처음의 10 % 가 되는 시간 = τ ln 10 (막힘이 끝나기 전이면)
  const p0 = 10101325, A = Math.PI * 0.01 ** 2 / 4, M = 0.01604, T = 293.15, R = 8.314462618, k = 1.31;
  const c = A * Math.sqrt(k * M / (R * T) * (2 / (k + 1)) ** ((k + 1) / (k - 1)));
  const tau = M * 1 / (R * T * c);
  const tChokeEnd = tau * Math.log(p0 / (101325 / 0.5439));
  const want = tau * Math.log(10);
  check("감압: 10 % 시점이 막힘 구간 안(해석해와 견줄 수 있음)", want < tChokeEnd, `${want} < ${tChokeEnd}`);
  near("감압 10 % 시간 = τ·ln10 (등온 막힘 해석해)", r.outputs.t10, want, 0.01);
  near("감압으로 나갈 수 있는 양 = (P₀−P_a)·M·V/(R·T)", r.outputs.mass, (p0 - 101325) * M / (R * T), 1e-9);
}
{
  const links = W.calcFind("release").links(r.values, r.outputs);
  check("누출량 → 가우스 플룸 링크(Q g/s)", links.some(l => l.calc === "gaussian_plume" && Math.abs(l.values.Q - r.outputs.rate * 1000) < 1e-9));
  check("누출량 → 장외 영향 링크(대안·누출률 직접 입력)", links.some(l => l.calc === "offsite" && l.values.alt === "rate" && l.values.Qd === r.outputs.rate));
  const rl = run("release", { phase: "liquid", Dt: 3, mwl: 92.14 });
  const ll = W.calcFind("release").links(rl.values, rl.outputs);
  check("액체 → 증발 링크(1 cm 웅덩이 면적 = 양/(ρ·0.01))", ll.some(l => l.calc === "evaporation" && Math.abs(l.values.A - rl.outputs.mass / 10) < 1e-6 && l.values.mw === 92.14));
}

// ════ 2. 장외 영향(offsite) — 미국 기준, EPA RMP OCA Guidance 예제 ════
const US = { basis: "us" };
const DIB = "19287-45-7", EO = "75-21-8", ACN = "107-13-1", BR = "7726-95-6", AA = "107-18-6", CL2 = "7782-50-5";
r = run("offsite", { ...US, scn: "worst", cat: "toxic", sub_t: DIB, QS: lb(2500), mit: "none", topo: "urban" });
near("예제 1 디보란 2,500 lb → 250 lb/min [src]", lbmin(r.outputs.rate), 250, 1e-9);
check("예제 13 디보란 250 lb/min ÷ 0.0011 → 참조표 3 → 8.1 mi [src]", r.outputs.distMi === 8.1 && /Table 3|참조표 3/.test(r.outputs.table), `${r.outputs.distMi} · ${r.outputs.table}`);
r = run("offsite", { ...US, scn: "worst", cat: "toxic", sub_t: DIB, QS: lb(2500), mit: "building", topo: "urban" });
near("예제 2 건물 안 디보란 → 138 lb/min [src]", lbmin(r.outputs.rate), 137.5, 1e-9);
r = run("offsite", { ...US, scn: "worst", cat: "toxic", sub_t: EO, QS: lb(10000), mit: "none", topo: "rural" });
check("예제 14 산화에틸렌 1,000 lb/min, 끝점 0.09 → 참조표 5(0.1 열) → 3.6 mi [src]", r.outputs.distMi === 3.6, `${r.outputs.distMi} · ${r.outputs.table}`);
r = run("offsite", { ...US, scn: "worst", cat: "toxic", sub_t: ACN, QS: lb(20000), mit: "none", T: 25, topo: "urban" });
near("예제 4 아크릴로니트릴 20,000 lb 25 °C → 307 lb/min [src]", lbmin(r.outputs.rate), 307, 0.002);
near("예제 4 지속 시간 65 분 [src]", r.outputs.minutes / 60, 65, 0.01);
check("예제 15 → 참조표 8(0.075 열, 250 lb/min 행) → 2.9 mi [src]", r.outputs.distMi === 2.9, `${r.outputs.distMi} · ${r.outputs.table}`);
r = run("offsite", { ...US, scn: "worst", cat: "toxic", sub_t: ACN, QS: lb(20000), mit: "none", T: 60, topo: "urban" });
near("예제 5 고온 아크릴로니트릴(LFB) → 1,880 lb/min [src]", lbmin(r.outputs.rate), 1880, 0.002);
near("예제 5 지속 시간 11 분 [src]", r.outputs.minutes / 60, 11, 0.04);
r = run("offsite", { ...US, scn: "worst", cat: "toxic", sub_t: BR, QS: lb(20000), mit: "dike", dikeA: { raw: 100, unit: "ft2" }, T: 25, topo: "rural" });
near("예제 6 브롬 방류벽 100 ft² → 10 lb/min [src, 1.4×0.073×100 = 10.2]", lbmin(r.outputs.rate), 10.22, 0.001);
near("예제 6 지속 시간 ≈ 2,000 분 [src, 20,000/10]", r.outputs.minutes / 60, 20000 / 10.22, 0.001);
r = run("offsite", { ...US, scn: "worst", cat: "toxic", sub_t: BR, QS: lb(20000), mit: "building", dikeA: { raw: 100, unit: "ft2" }, T: 25, topo: "rural" });
near("예제 7 브롬 창고 바닥 100 ft² × 0.1 → 1 lb/min [src]", lbmin(r.outputs.rate), 1.022, 0.001);
r = run("offsite", { ...US, scn: "worst", cat: "toxic", sub_t: BR, QS: lb(20000), mit: "dike", dikeA: { raw: 100, unit: "ft2" }, T: 35, topo: "rural" });
near("예제 9 브롬 35 °C TCF 1.5 → 15 lb/min [src]", lbmin(r.outputs.rate), 15.33, 0.001);
near("예제 9 지속 시간 ≈ 1,300 분 [src]", r.outputs.minutes / 60, 1300, 0.01);
r = run("offsite", { ...US, scn: "alt", cat: "toxic", sub_t: DIB, alt: "hole", dh: inDia(5), Pt: { raw: 30, unit: "psi" }, Tt: 25, QS: lb(2500), mit: "none", topo: "urban" });
near("예제 19 디보란 5 in², 30 psia, 298 K, GF 17 → 148 lb/min [src]", lbmin(r.outputs.rate), 148, 0.003);
r = run("offsite", { ...US, scn: "alt", cat: "toxic", sub_t: AA, alt: "hole", dh: inDia(5), LH: { raw: 23, unit: "in" }, tstop: 10, QS: lb(20000), mit: "none", T: 25, topo: "rural" });
near("예제 21 알릴알코올 5 in², 액위 23 in, LLF 41 → 983 lb/min [src]", lbmin(r.outputs.liq), 983, 0.001);
near("예제 23 9,830 lb 웅덩이 증발 → 63 lb/min [src]", lbmin(r.outputs.rate), 63, 0.005);
check("예제 25 63 ÷ 0.036 = 1,750 → 참조표 15(60분, 개활지, 중립) → 0.4 mi [src]", r.outputs.distMi === 0.4 && /15/.test(r.outputs.table), `${r.outputs.distMi} · ${r.outputs.table}`);
r = run("offsite", { ...US, scn: "alt", cat: "toxic", sub_t: CL2, alt: "rate", Qd: { raw: 500, unit: "lbmin" }, dur: 10, topo: "urban" });
check("예제 24 염소 500 lb/min, 도시 → 참조표 24 → 0.4 mi [src]", r.outputs.distMi === 0.4 && /24/.test(r.outputs.table), `${r.outputs.distMi} · ${r.outputs.table}`);
r = run("offsite", { ...US, scn: "worst", cat: "flam", sub_f: "74-98-6", QS: lb(50000) });
near("예제 16 프로판 50,000 lb → 1 psi 0.3 mi [src, 식 C-2 = 0.297]", r.outputs.distMi, 0.297, 0.005);
check("예제 16 표기 0.3 mi 로 반올림", Math.round(r.outputs.distMi * 10) / 10 === 0.3);
r = run("offsite", { ...US, scn: "alt", cat: "flam", sub_f: "74-98-6", event: "vce", QS: lb(50000), Qcloud: "" });
near("예제 30 프로판 대안: 증기운 2 × 0.38 × 50,000 = 38,000 lb [src]", r.outputs.cloud / LB, 38000, 1e-9);
near("예제 30 수율 3 % 식 C-2 → 0.18 mi [calc] (지침은 표 13 × 0.67 = 0.2 mi)", r.outputs.distMi, 0.0081 * Math.cbrt(0.03 * 38000 * 46333 / 4680), 1e-9);
check("예제 30 표기 0.2 mi 로 반올림", Math.round(r.outputs.distMi * 10) / 10 === 0.2);
r = run("offsite", { ...US, scn: "alt", cat: "flam", sub_f: "60-29-7", event: "pool", QS: lb(15000), mit: "none" });
near("예제 29 에틸에테르 15,000 lb 웅덩이 면적 10,350 ft² [src 10,400]", r.outputs.area / 0.09290304, 10350, 0.001);
near("예제 29 웅덩이 화재 5 kW/m² → 440 ft [src]", r.outputs.distMi * 5280, 440, 0.01);
r = run("offsite", { ...US, scn: "alt", cat: "flam", sub_f: "74-85-1", event: "vcf", alt: "hole", dh: inDia(5), Pt: { raw: 728, unit: "psi" }, Tt: { raw: 282, unit: "K" }, QS: lb(50000), topo: "rural" });
near("예제 26 에틸렌 5 in², 728 psia, 282 K, GF 18 → 3,900 lb/min [src]", lbmin(r.outputs.rate), 3900, 0.002);
check("예제 27 3,900 ÷ 31 = 126 → 참조표 26 → 0.2 mi [src]", r.outputs.distMi === 0.2 && /26/.test(r.outputs.table), `${r.outputs.distMi} · ${r.outputs.table}`);
r = run("offsite", { ...US, scn: "alt", cat: "flam", sub_f: "60-29-7", event: "vcf", alt: "hole", dh: inDia(3.1), LH: { raw: 24, unit: "in" }, tstop: 10, QS: lb(20000), T: 25, topo: "rural" });
near("예제 28 에틸에테르 3.1 in², 액위 24 in, LLF 34 → 520 lb/min [src]", lbmin(r.outputs.liq), 520, 0.015);
near("예제 28 웅덩이 증발 950 lb/min > 누출률 → 대기 누출률 = 520 lb/min [src]", lbmin(r.outputs.rate), 520, 0.015);
check("예제 28 LFL 57 → 60 열, 1,500 lb/min 미만 → 참조표 28 → < 0.1 mi [src]", r.outputs.distMi === 0.1 && /28/.test(r.outputs.table), `${r.outputs.distMi} · ${r.outputs.table}`);
r = run("offsite", { ...US, scn: "alt", cat: "flam", sub_f: "74-98-6", event: "bleve", QS: lb(50000) });
check("화구(BLEVE) 프로판 50,000 lb → 참조표 30 의 값 그대로", r.outputs.distMi === W.CALC_RMP_DATA.tables["30"].dist["74-98-6"][5] && W.CALC_RMP_DATA.tables["30"].quantities[5] === 50000, `${r.outputs.distMi}`);

// ════ 3. 표 읽기 규칙(지침 4장·10장) ════
{
  const t5 = W.calcRmpTable(5);
  const g = W.calcRmpGridLookup(t5, 0.0875, 1000);    // 0.075 와 0.1 의 정확히 가운데 → 작은 쪽(0.075)
  check("고밀도 표: 끝점이 가운데면 작은 값(왼쪽) 열", g.key[0] === 0.075, JSON.stringify(g.key));
  const g2 = W.calcRmpGridLookup(t5, 0.1, 1750);      // 1,500 과 2,000 의 가운데 → 큰 쪽
  check("고밀도 표: 누출률이 가운데면 큰 값(아래) 행", g2.rate[0] === 2000, JSON.stringify(g2.rate));
  const t1 = W.calcRmpTable(1);
  check("중립 표: 범위 끝(347,000) 너머 → 25 mi, 표 끝 표시", W.calcRmpRatioLookup(t1, 400000).miles === 25 && W.calcRmpRatioLookup(t1, 400000).beyond === true);
  check("중립 표 1: 0–4.4 → 0.1 mi, 4.4–37 → 0.2 mi(지침 표 그대로)", W.calcRmpRatioLookup(t1, 3).miles === 0.1 && W.calcRmpRatioLookup(t1, 10).miles === 0.2);
  const t22 = W.calcRmpTable(22);
  check("물질별 표 22: '<10' 행은 10 미만에만", W.calcRmpChemLookup(t22, 5, "rural").rate === 10 && W.calcRmpTable(22).rows[0][3] === 1);
  check("표 29 의 '>40' 열은 LFL 이 40 을 넘을 때만", W.calcRmpGridLookup(W.calcRmpTable(29), 52, 6000).key[1] === 1 && W.calcRmpGridLookup(W.calcRmpTable(29), 39, 6000).key[0] === 40);
  // 생성 자료의 표 모양 — 지침 표의 행·열 수
  const n = (k) => W.calcRmpTable(k);
  check("참조표 1–4·14–17 은 48 범위 + 끝, 5–8·18–21 은 끝점 16 × 누출률 27", [1, 2, 3, 4, 14, 15, 16, 17].every(k => n(k).rows.length === 48 && n(k).over) && [5, 6, 7, 8, 18, 19, 20, 21].every(k => n(k).keys.length === 16 && n(k).rates.length === 27 && n(k).dist.every(row => row.every(c => c > 0))));
  check("지침 부록 자료: 독성 기체 23 · 독성 액체 51 · 인화성 기체 45 · 인화성 액체 18 종", W.CALC_RMP_DATA.toxic.filter(s => s.state === "gas").length === 23 && W.CALC_RMP_DATA.toxic.filter(s => s.state === "liquid").length === 51
    && W.CALC_RMP_DATA.flammable.filter(s => s.state === "gas").length === 45 && W.CALC_RMP_DATA.flammable.filter(s => s.state === "liquid").length === 18);
  const cl = W.calcRmpToxic(CL2), am = W.calcRmpToxic("7664-41-7");
  check("Exhibit B-1 값 대조: 염소 LFB 0.19 · 끝점 0.0087 mg/L(3 ppm), 암모니아 DF 0.71 · GF 14 [src]", cl.lfb === 0.19 && cl.ep === 0.0087 && cl.epPpm === 3 && am.df === 0.71 && am.gf === 14);
}

// ════ 4. 한국 끝점 사다리 ════
{
  const kr = (cas, minutes) => W.calcRmpEndpoint(W.calcRmpToxic(cas), "kr", minutes);
  const c10 = kr(CL2, 10), c60 = kr(CL2, 60), c5 = kr(CL2, 5);
  check("한국: 염소는 DOE PAC 경유 ERPG 가 없어 AEGL-2 — 10분 누출은 30분 값 2.8 ppm, 60분 이상은 1시간 2.0 ppm, 7분 미만은 10분 값",
    c10.kind === "aegl2" && c10.ppm === 2.8 && c60.ppm === 2.0 && c5.window === 0, `${JSON.stringify(c10)} ${JSON.stringify(c60)}`);
  near("AEGL-2 ppm → mg/L (24.5 L/mol, 지침 Exhibit B-1 주 a)", c10.mgL, 2.8 * W.calcRmpToxic(CL2).kr.mw / 24500, 1e-12);
  const withErpg = W.CALC_RMP_DATA.toxic.find(s => s.kr && s.kr.erpg2);
  check("한국: DOE PAC 이 ERPG 로 준 물질은 ERPG-2 가 먼저", withErpg && W.calcRmpEndpoint(withErpg, "kr", 10).kind === "erpg2", withErpg && withErpg.name);
  const pacOnly = W.CALC_RMP_DATA.toxic.find(s => s.kr && !s.kr.erpg2 && !s.kr.aegl2 && s.kr.pac2);
  check("한국: ERPG·AEGL 이 없으면 PAC-2", !pacOnly || W.calcRmpEndpoint(pacOnly, "kr", 10).kind === "pac2", pacOnly && pacOnly.name);
  check("미국: 40 CFR 68 부록 A 값", W.calcRmpEndpoint(W.calcRmpToxic(CL2), "us", 10).mgL === 0.0087);
  r = run("offsite", { basis: "kr", scn: "worst", cat: "toxic", sub_t: CL2, QS: 1000, topo: "rural" });
  check("한국 기준 염소: 물질별 표 대신 일반 고밀도 표(끝점이 지침 표와 달라서)", /Table 5|참조표 5/.test(r.outputs.table) && r.outputs.epAegl === 2.8, `${r.outputs.table} ${r.outputs.epAegl}`);
  r = run("offsite", { basis: "kr", scn: "worst", cat: "toxic", sub_t: CL2, QS: 1000, topo: "rural", epUser: 3 });
  check("끝점 직접 입력(3 ppm)이 목록 값을 대신함", r.outputs.epOther === 3);
}

// ════ 5. 그래프·링크·준비표 ════
{
  const def = W.calcFind("offsite");
  r = run("offsite", { ...US, scn: "worst", cat: "toxic", sub_t: EO, QS: lb(10000), topo: "rural" });
  const ch = def.chart(r.values, r.outputs);
  check("독성 그래프: 쓴 표의 계단 곡선 + 이 계산 점", ch && ch.series[0].kind === "step" && ch.series[0].points.length > 10 && ch.markers.length === 1 && ch.x.log && ch.y.log);
  near("그래프 점 = 결과(1,000 lb/min → kg/min, 3.6 mi → km)", ch.markers[0].y, 3.6 * 1.609344, 1e-9);
  const links = def.links(r.values, r.outputs);
  check("장외 영향 → 가우스 플룸·누출량 링크", links.some(l => l.calc === "gaussian_plume") && links.some(l => l.calc === "release"));
  r = run("offsite", { ...US, scn: "worst", cat: "flam", sub_f: "74-98-6", QS: lb(50000) });
  const cv = def.chart(r.values, r.outputs);
  check("증기운 폭발 그래프: 식 C-2 곡선(양에 따른 1 psi 거리)", cv && cv.series[0].points.length >= 20 && cv.markers.length === 1);
  check("경고 첫 줄은 늘 '참고용 스크리닝 — KORA'", /KORA/.test(r.warnings[0]));
  check("계산기 패널: KORA 준비표", def.panel === "KoraSheetPanel");

  const facts = { names: { ko: ["염소"], en: ["Chlorine"] }, transport: [{ un: "1017", class: "2.3" }],
    props: { boiling_point: [{ t: "-34.05 ℃", n: -34.05, u: "°C" }], molar_mass: [{ t: "70.905", n: 70.905, u: "g/mol" }] } };
  const el = { mw: 70.906, aegl: { status: "Final", unit: "ppm", v: { 2: [2.8, 2.8, 2.0, 1.0, 0.71] } }, pac: { unit: "ppm", v: [0.5, 2.0, 20], tiers: ["AEGL", "AEGL", "AEGL"] }, erpg: null };
  for (const [win, lang] of [[W, "ko"], [WE, "en"]]) {
    const res = runIn(win, "offsite", { basis: "kr", scn: "worst", cat: "toxic", sub_t: CL2, QS: 1000, topo: "rural" });
    const m = win.koraSheetModel({ values: res.values, outputs: res.outputs, facts, el, lang });
    const keys = m.sections.map(s => s.key).join(",");
    check(`준비표(${lang}): 7절 — 사업장·물질·저장·시나리오·기상·지형·확인`, keys === "site,substance,storage,scenario,weather,terrain,checks", keys);
    const rows = m.sections.flatMap(s => s.rows);
    check(`준비표(${lang}): CAS·UN·AEGL-2 3값·PAC-2·스크리닝 거리 채움`, rows.some(r => r.value === CL2) && rows.some(r => /UN 1017/.test(r.value))
      && rows.some(r => /2\.8 · 2\.8 · 2/.test(r.value)) && rows.some(r => r.value === "2 ppm") && rows.some(r => /km/.test(r.value) && /mi/.test(r.value)));
    check(`준비표(${lang}): 사업장 이름·좌표·기상 관측소는 손으로 쓸 빈칸`, ["name", "coords"].every(k => rows.some(r => r.blank && r.label === win.KORA_SHEET.site[k])) && rows.some(r => r.blank && r.label === win.KORA_SHEET.weather.station));
    if (lang === "en") {
      const hangul = rows.filter(r => !r.sourceText && [r.label, r.value, r.source].some(t => HANGUL.test(String(t || ""))));
      check("준비표(en): 원문(MSDS) 칸 말고는 한글 없음", hangul.length === 0, hangul.map(r => r.label).join(", "));
    }
  }
  check("준비표 문구: 비공식·KORA 아님·법적 효력 없음", /KORA/.test(W.KORA_SHEET.disclaimer) && /서식이 아니며/.test(W.KORA_SHEET.disclaimer) && /not an NICS form/.test(WE.KORA_SHEET.disclaimer));
}

const failed = results.filter(x => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
