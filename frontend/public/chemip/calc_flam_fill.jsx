// 가연성 계산기 행 채우기의 순수 함수 — ChemIP 물성(f/<CAS>.json) → 표 행 값. React·fetch 없음(가져오기는 api_calc_fill_flam.jsx).
// 혼합 인화점(mix_flash_point): 인화점·분자량 + Antoine B·C(log₁₀, °C). B·C 는 사전 설정 물질(CoolProp 맞춤, calc_antoine_facts.jsx
//   calcAntoinePreset) → 증기압 한 점 + 끓는점 두 점 맞춤(calcAntoineFromFacts) → 끓는점만이면 Kistiakowsky 증발 엔트로피로 어림.
// 혼합 LFL(mix_lfl): LFL·UFL. 파일 형식: scripts/static_export/CONTRACT.md "f/<CAS>.json".

const CALC_FLAM_KIST_S = 36.1;   // J/(mol·K) — Kistiakowsky(1923) 끓는점 증발 엔트로피 ΔS = 36.1 + R ln T_b

// 물성 하나의 첫 수치 행(SI 단위 n) 또는 null
function calcFactsNum(facts, prop) {
  const rows = (facts && facts.props && facts.props[prop]) || [];
  const row = rows.find(r => r && typeof r.n === "number" && Number.isFinite(r.n));
  return row ? row.n : null;
}

// 끓는점만으로 log₁₀ P = A − B/(t + 273.15) 의 B (Clausius–Clapeyron + Kistiakowsky ΔS)
function calcKistiakowskyB(tbC) {
  const Tb = tbC + 273.15;
  return (CALC_FLAM_KIST_S / CALC_CONST.R + Math.log(Tb)) * Tb / Math.LN10;
}

// 표에 넣을 값: 유효숫자 6자리, 없으면 빈칸
function calcFlamCell(n) {
  return n == null || !Number.isFinite(n) ? "" : Number(n.toPrecision(6));
}

// (facts, preset|null) → { patch: { Tfp, B, C, M }, how: "preset"|"fit"|"kist"|"none" }
function calcFlashFillPatch(facts, preset) {
  let bc = null, how = "none";
  if (preset) { bc = calcAntoineConvert(preset, CALC_ANTOINE_SI_FORM, CALC_ANTOINE_BASE_FORM); how = "preset"; }
  if (!bc) { const fit = calcAntoineFromFacts(facts); if (fit) { bc = fit; how = "fit"; } }
  if (!bc) { const tb = calcFactsNum(facts, "boiling_point"); if (tb != null) { bc = { B: calcKistiakowskyB(tb), C: 273.15 }; how = "kist"; } }
  return {
    patch: { Tfp: calcFlamCell(calcFactsNum(facts, "flash_point")), B: calcFlamCell(bc && bc.B), C: calcFlamCell(bc && bc.C), M: calcFlamCell(calcFactsNum(facts, "molar_mass")) },
    how,
  };
}

// facts → { patch: { LFL, UFL } }
function calcFlamLimitsPatch(facts) {
  return { patch: { LFL: calcFlamCell(calcFactsNum(facts, "lfl")), UFL: calcFlamCell(calcFactsNum(facts, "ufl")) } };
}

// 채운 값이 하나라도 있는지
function calcFlamPatchHasData(patch) {
  return Object.values(patch).some(v => v !== "");
}

Object.assign(window, { calcFactsNum, calcKistiakowskyB, calcFlashFillPatch, calcFlamLimitsPatch, calcFlamPatchHasData });
