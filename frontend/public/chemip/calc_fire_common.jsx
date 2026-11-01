// 화재·폭발 계산기 공용(순수 함수·데이터, React 없음) — pool_fire·bleve·vce·probit_harm 이 함께 쓴다.
// 문구(참고용 스크리닝 안내·끝점 이름)와 기준값(복사열 단계)은 여기 한 곳에만 둔다.

// 복사열 단계 [kW/m²] — 그래프 가로선·끝점 거리 출력이 이 목록만 읽는다.
//   4: 20초 노출 시 통증(피부 보호 없음), 5: RMP·국내 장외영향 복사열 끝점(40초 노출 기준),
//   12.5: 목재 유도 착화·플라스틱 녹음, 37.5: 공정 설비 손상. 세계은행 Technica(1988)·HSE 목록으로 널리 인용되는 값.
const CALC_FIRE_FLUX_LEVELS = [
  { key: "4", q: 4, label: tr("4 kW/m² · 20초 통증", "4 kW/m² · pain in 20 s") },
  { key: "5", q: 5, label: tr("5 kW/m² · 복사열 끝점", "5 kW/m² · thermal endpoint") },
  { key: "12_5", q: 12.5, label: tr("12.5 kW/m² · 목재 착화", "12.5 kW/m² · wood ignition") },
  { key: "37_5", q: 37.5, label: tr("37.5 kW/m² · 설비 손상", "37.5 kW/m² · equipment damage") },
];

// 과압 단계 [kPa] — 1 psi(6.9 kPa) 는 RMP·국내 장외영향 과압 끝점, 3.5·8 psi 는 NOAA ALOHA 기본 관심 수준(Baker 1983 인용).
const CALC_BLAST_LEVELS = [
  { key: "1psi", p: 6.894757, label: tr("1 psi · 과압 끝점(유리 파손)", "1 psi · overpressure endpoint (glass breakage)") },
  { key: "3_5psi", p: 24.13165, label: tr("3.5 psi · 고막 손상·비산물 부상", "3.5 psi · eardrum injury, flying debris") },
  { key: "8psi", p: 55.15806, label: tr("8 psi · 건물 붕괴·폐 손상", "8 psi · building collapse, lung injury") },
];

const CALC_FIRE_NOTES = {
  screening: tr("참고용 스크리닝 · 사전 검토용입니다. 법정 장외영향평가(화학사고예방관리계획서)는 화학물질안전원(NICS)의 KORA 로 해야 하며, 이 결과로 대신할 수 없습니다.",
    "Screening only (preliminary review). The statutory Korean off-site consequence assessment (chemical accident prevention plan) must be done with NICS KORA; these results cannot replace it."),
  endpoint: tr("국내·미국 RMP 끝점: 과압 1 psi(6.9 kPa), 복사열 5 kW/m²(40초). 화구처럼 40초보다 짧은 화재는 같은 열량(I^(4/3)·t)으로 비교합니다.",
    "Korean and US RMP endpoints: overpressure 1 psi (6.9 kPa), radiant heat 5 kW/m² (40 s). For fires shorter than 40 s, such as fireballs, compare the equivalent dose (I^(4/3)·t)."),
};

// 물의 증기 분압 [Pa] — 상대습도 RH [%] × 포화 증기압(IAPWS-IF97, calc_physics.jsx). 0 °C 아래는 0 °C 값으로 둔다(보수적으로 투과율이 낮아지지 않게).
function calcFireVapourPa(T, RH) {
  return (RH / 100) * calcWaterPsat(Math.max(T, 273.16));
}

// 감소 함수 f(r) 가 target 이 되는 거리 — 로그 이분법. f(rMin) < target 이면 null(어디서도 도달 안 함), f(rMax) > target 이면 Infinity.
function calcSolveDistance(f, target, rMin, rMax) {
  if (!(f(rMin) >= target)) return null;
  if (f(rMax) > target) return Infinity;
  let lo = Math.log(rMin), hi = Math.log(rMax);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(Math.exp(mid)) >= target) lo = mid; else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}

// 유한 거리만 출력으로 넘긴다(null·Infinity → undefined, 결과 줄을 숨김)
function calcFiniteOrUndef(v) {
  return Number.isFinite(v) ? v : undefined;
}

Object.assign(window, { CALC_FIRE_FLUX_LEVELS, CALC_BLAST_LEVELS, CALC_FIRE_NOTES, calcFireVapourPa, calcSolveDistance, calcFiniteOrUndef });
