// 계산기 Antoine 상수 채우기의 순수 함수 — 사전 설정 물질(CoolProp 맞춤 상수) 찾기, ChemIP 물성(f/<CAS>.json) → 추정 상수,
// 상수 꼴 바꾸기. React·fetch 없음(가져오기는 api_calc_fill.jsx).
// ChemIP 에는 Antoine 상수 자체가 없다. 증기압 한 점(MSDS 9항, Pa + 조건 온도)과 끓는점(°C, 1 atm 으로 본다) 두 점으로
// Clausius–Clapeyron 꼴 log₁₀ P[mmHg] = A − B / (T[°C] + 273.15)(C = 273.15)를 맞춘다. 두 점 사이 온도에서만 쓸 만하다.

const CALC_FACTS_P_ATM = 101325;
const CALC_FACTS_MIN_DT = 10;   // 두 점 온도 차가 이보다 작으면 기울기를 믿지 않는다(K)

// 조건 글자("20℃", "25 °C", "(at 20 C)") → °C 숫자 또는 null
function calcFactsTempC(text) {
  const m = /(-?\d+(?:\.\d+)?)\s*(?:℃|°\s*C|deg\s*C|C\b)/i.exec(String(text || ""));
  return m ? Number(m[1]) : null;
}

// f/<CAS>.json → { A, B, C (log₁₀·mmHg·°C), T1, P1 (Pa), Tb (°C) } 또는 null
function calcAntoineFromFacts(facts) {
  const props = facts && facts.props;
  if (!props) return null;
  const tb = (props.boiling_point || []).find(r => typeof r.n === "number" && r.u === "°C");
  if (!tb) return null;
  const Tb = tb.n;
  for (const r of props.vapor_pressure || []) {
    if (typeof r.n !== "number" || r.u !== "Pa" || !(r.n > 0) || r.n >= CALC_FACTS_P_ATM * 0.98) continue;
    const T1 = calcFactsTempC(r.c);
    if (T1 == null || Tb - T1 < CALC_FACTS_MIN_DT) continue;
    const l1 = Math.log10(r.n / 133.322387415), lb = Math.log10(760);
    const B = (lb - l1) / (1 / (T1 + 273.15) - 1 / (Tb + 273.15));
    const A = lb + B / (Tb + 273.15);
    if (!(B > 0)) continue;
    return { A, B, C: 273.15, T1, P1: r.n, Tb };
  }
  return null;
}

// Antoine 상수 꼴 바꾸기: from·to = { base: "log10"|"ln", pu: 압력 단위, tu: "C"|"K" } → { A, B, C }
// 가운데 꼴(ln, Pa, K)을 거친다: ln P[Pa] = A₀ − B₀ / (C₀ + T[K]).
const CALC_ANTOINE_BASE_FORM = { base: "log10", pu: "mmHg", tu: "C" };
const CALC_ANTOINE_SI_FORM = { base: "ln", pu: "Pa", tu: "K" };

function calcAntoineConvert(abc, from, to) {
  const k1 = from.base === "ln" ? 1 : Math.LN10, k2 = to.base === "ln" ? 1 : Math.LN10;
  const f1 = calcConvert("pressure", 1, from.pu, "Pa"), f2 = calcConvert("pressure", 1, to.pu, "Pa");
  const A0 = k1 * abc.A + Math.log(f1), B0 = k1 * abc.B, C0 = abc.C - (from.tu === "K" ? 0 : 273.15);
  return { A: (A0 - Math.log(f2)) / k2, B: B0 / k2, C: C0 + (to.tu === "K" ? 0 : 273.15) };
}

function calcAntoineToConv(abc, conv) {
  return calcAntoineConvert(abc, CALC_ANTOINE_BASE_FORM, conv);
}

function calcAntoineNorm(s) {
  return String(s || "").normalize("NFKC").toLowerCase().replace(/[\s\-_·,()]+/g, "");
}

// 사전 설정 물질(calc_vle_antoine_data.jsx, CoolProp 포화압력에 맞춘 상수 — 있으면) 찾기.
// cas 또는 이름(CoolProp 이름, 유체 이름 표 CALC_FLUID_NAMES 의 보이는 이름) → { id, A, B, C (ln·Pa·K), Tmin, Tmax, maxErr } 또는 null
function calcAntoinePreset(query, cas) {
  const data = typeof CALC_VLE_ANTOINE_DATA !== "undefined" ? CALC_VLE_ANTOINE_DATA : null;
  if (!data) return null;
  const fluids = typeof CALC_FLUID_DATA !== "undefined" ? CALC_FLUID_DATA : [];
  const names = typeof CALC_FLUID_NAMES !== "undefined" ? CALC_FLUID_NAMES : {};
  const q = calcAntoineNorm(query);
  const id = Object.keys(data).find(k => (cas && fluids.some(f => f.id === k && f.cas === cas))
    || (q && (calcAntoineNorm(k) === q || calcAntoineNorm(names[k]) === q || fluids.some(f => f.id === k && f.cas === query))));
  return id ? { id, ...data[id] } : null;
}

Object.assign(window, {
  calcFactsTempC, calcAntoineFromFacts, calcAntoineConvert, calcAntoineToConv, calcAntoinePreset, CALC_ANTOINE_BASE_FORM, CALC_ANTOINE_SI_FORM,
});
