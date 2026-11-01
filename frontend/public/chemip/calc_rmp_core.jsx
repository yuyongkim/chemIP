// 장외 영향 스크리닝(calc_offsite.jsx)의 순수 함수 — EPA RMP Offsite Consequence Analysis Guidance(EPA 550-B-99-009)의 식과
// 참조표 읽는 법. React 없음. 자료는 CALC_RMP_DATA(calc_rmp_data.jsx, 생성 파일). 지침이 쓰는 단위(lb, lb/min, ft², in, psia,
// mi)로 계산하고, 화면 단위(SI)와의 환산은 CALC_RMP_SI 한 곳에서 한다. 식 번호는 지침의 번호다.

const CALC_RMP_SI = {
  lb: 0.45359237,            // kg
  ft: 0.3048,                // m
  inch: 0.0254,              // m
  mi: 1609.344,              // m
  psi: 6894.757293168,       // Pa
  vmL: 24.5,                 // L/mol — 지침 Exhibit B-1 주 a 의 ppm ↔ mg/L 환산(Endpoint_ppm = mg/L × 1000 × 24.5 / MW)
  windWorst: 1.4,            // 1.5 m/s 의 풍속 계수 1.5^0.78 (식 3-3)
  windAlt: 2.4,              // 3.0 m/s 의 풍속 계수 3.0^0.78 (식 7-8)
  bldGas: 0.55,              // 건물 안 기체 누출 완화 계수 (식 3-2, 부록 D.1.2)
  bldLiqWorst: 0.1,          // 건물 안 액체 웅덩이, 최악 (3.2.3절, 부록 D.2.4)
  bldLiqAlt: 0.05,           // 건물 안 액체 웅덩이, 대안 (7.2.3절)
  tnt: 4680,                 // kJ/kg — TNT 폭발열 (식 C-1)
  yieldWorst: 0.1,           // 최악 증기운 폭발 수율 (5장)
  yieldAlt: 0.03,            // 대안 증기운 폭발 수율 (10.4절)
  aeglShort: 7,              // min — 이보다 짧은 누출은 AEGL-2 10분 값, 이 값 이상 aeglMid 이하는 30분 값(국내 끝점 선정 관행)
  aeglMid: 25,
};

const CALC_RMP_CHEM_TABLES = {   // 물질별 참조표(지침 Exhibit 3·5): CAS → { worst, alt } 표 번호
  "7782-50-5": { worst: 11, alt: 24 },
  "7446-09-5": { worst: 12, alt: 25 },
};
const CALC_RMP_AMMONIA = "7664-41-7";
const CALC_RMP_AMMONIA_TABLES = { pressure: { worst: 9, alt: 22 }, refrig: { worst: 10, alt: 23 } };
// 일반 참조표 번호(Exhibit 2·4·6): 시나리오 → 밀도 → 지형 → 지속 시간(분)
const CALC_RMP_GENERIC = {
  worst: { buoyant: { rural: { 10: 1, 60: 2 }, urban: { 10: 3, 60: 4 } }, dense: { rural: { 10: 5, 60: 6 }, urban: { 10: 7, 60: 8 } } },
  alt: { buoyant: { rural: { 10: 14, 60: 15 }, urban: { 10: 16, 60: 17 } }, dense: { rural: { 10: 18, 60: 19 }, urban: { 10: 20, 60: 21 } } },
  lfl: { buoyant: { rural: 26, urban: 27 }, dense: { rural: 28, urban: 29 } },
};

function calcRmpToxic(cas) {
  return CALC_RMP_DATA.toxic.find(s => s.cas === cas) || null;
}

function calcRmpFlammable(cas) {
  return CALC_RMP_DATA.flammable.find(s => s.cas === cas) || null;
}

function calcRmpTable(n) {
  return CALC_RMP_DATA.tables[String(n)] || null;
}

// 지침이 고르는 "가장 가까운 값" — 가운데면 tieUp 쪽(true = 큰 값). 칸에 붙은 표시(above ">x", below "<x")는 그 쪽에서만 고른다.
function calcRmpNearest(list, x, tieUp) {
  const flagged = list.map((e, i) => ({ v: e[0], f: e[1], i }));
  const above = flagged.find(e => e.f && e.v < x && flagged.every(o => o === e || o.v <= e.v));
  if (above && x > above.v) return above.i;
  const below = flagged.find(e => e.f && x < e.v && flagged.every(o => o === e || o.v >= e.v));
  if (below) return below.i;
  let best = null;
  for (const e of flagged) {
    if (e.f) continue;
    const d = Math.abs(e.v - x);
    if (!best || d < best.d - 1e-12 || (Math.abs(d - best.d) <= 1e-12 && (tieUp ? e.v > best.v : e.v < best.v))) best = { ...e, d };
  }
  return best ? best.i : 0;
}

// 표 하나 읽기 → { miles, beyond?: true(표 끝 너머), row?: 읽은 칸 설명 }
function calcRmpRatioLookup(t, ratio) {
  const row = t.rows.find(r => ratio >= r[0] && ratio <= r[1]);
  if (row) return { miles: row[2], range: [row[0], row[1]] };
  if (t.over && ratio > t.over[0]) return { miles: t.over[1], beyond: true, range: [t.over[0], null] };
  const last = t.rows[t.rows.length - 1];
  return { miles: last[2], beyond: true, range: [last[1], null] };
}

function calcRmpGridLookup(t, key, rate) {
  const k = calcRmpNearest(t.keys, key, false);   // 끝점·LFL: 가운데면 작은 값(표의 왼쪽)
  const r = calcRmpNearest(t.rates, rate, true);  // 누출률: 가운데면 큰 값(표의 아래쪽)
  return { miles: t.dist[k][r], key: t.keys[k], rate: t.rates[r] };
}

function calcRmpChemLookup(t, rate, topo) {
  const rows = t.rows.map(r => [r[0], r[3] ? 1 : 0]);
  const i = calcRmpNearest(rows, rate, true);
  return { miles: topo === "urban" ? t.rows[i][2] : t.rows[i][1], rate: t.rows[i][0] };
}

// ── 누출률(lb/min) ──
function calcRmpGasWorst(qsLb, building) {                 // 식 3-1, 3-2
  return qsLb / 10 * (building ? CALC_RMP_SI.bldGas : 1);
}

function calcRmpGasHole(haIn2, ptPsia, ttK, gf) {          // 식 7-1 (막힘 흐름)
  return haIn2 * ptPsia * gf / Math.sqrt(ttK);
}

function calcRmpLiquidHole(haIn2, lhIn, llf) {             // 식 7-4 (대기압 탱크)
  return haIn2 * Math.sqrt(lhIn) * llf;
}

// 액체 온도 → 증발 계수: 25 °C 이하 LFA, 25–50 °C 는 LFA × TCF(위쪽 5 °C 칸, Exhibit B-4), 50 °C 초과·TCF 없음·"LFB" 칸은 LFB
function calcRmpLiquidFactor(sub, tC) {
  if (tC <= 25 && sub.lfa != null) return { f: sub.lfa, kind: "LFA" };
  const temps = [30, 35, 40, 45, 50];
  if (tC <= 50 && sub.lfa != null && sub.tcf) {
    const i = temps.findIndex(x => tC <= x);
    const c = sub.tcf[i];
    if (typeof c === "number") return { f: sub.lfa * c, kind: "LFA×TCF", tcf: c, tcfAt: temps[i] };
  }
  return { f: sub.lfb, kind: "LFB" };
}

// 웅덩이 증발(식 3-3·3-4·3-6·3-7·3-8, 대안 7-8~7-11): { qr(lb/min), areaFt2, maxAreaFt2, factor }
function calcRmpPool({ sub, qsLb, tC, scn, dikeFt2, building }) {
  const maxArea = qsLb * sub.df;                                   // 식 3-6 (깊이 1 cm)
  const area = dikeFt2 && dikeFt2 < maxArea ? dikeFt2 : maxArea;
  const factor = calcRmpLiquidFactor(sub, tC);
  const wind = scn === "alt" ? CALC_RMP_SI.windAlt : CALC_RMP_SI.windWorst;
  const bld = building ? (scn === "alt" ? CALC_RMP_SI.bldLiqAlt : CALC_RMP_SI.bldLiqWorst) : 1;
  return { qr: wind * factor.f * area * bld, areaFt2: area, maxAreaFt2: maxArea, diked: area < maxArea, factor };
}

// ── 독성 끝점 ──
// us: 40 CFR 68 부록 A. kr: ERPG-2(DOE PAC 경유) → AEGL-2(누출 시간으로 10분·30분·1시간 값) → DOE PAC-2 → 없으면 null.
// 자료는 sub.kr(calc_rmp_data.jsx — 비상대응 기준 파일 el/<CAS>.json 에서 생성). 값 단위 ppm 또는 mg/m3.
function calcRmpKrValue(sub, x) {
  const mw = sub.kr.mw || sub.mw;
  const mgL = x.unit === "ppm" ? calcRmpPpmToMgL(x.v, mw) : x.v / 1000;
  return { mgL, ppm: x.unit === "ppm" ? x.v : calcRmpMgLToPpm(mgL, mw) };
}

function calcRmpEndpoint(sub, basis, minutes) {
  if (basis === "us") return sub.ep != null ? { mgL: sub.ep, ppm: sub.epPpm, kind: "rmp", label: sub.basis } : null;
  const kr = sub.kr || {};
  if (kr.erpg2) return { ...calcRmpKrValue(sub, kr.erpg2), kind: "erpg2", label: "ERPG-2" };
  if (kr.aegl2) {
    const i = minutes < CALC_RMP_SI.aeglShort ? 0 : minutes <= CALC_RMP_SI.aeglMid ? 1 : 2;
    const v = kr.aegl2.v[i];
    if (v != null) return { ...calcRmpKrValue(sub, { v, unit: kr.aegl2.unit }), kind: "aegl2", label: `AEGL-2 ${["10 min", "30 min", "60 min"][i]}`, window: i };
  }
  if (kr.pac2) return { ...calcRmpKrValue(sub, kr.pac2), kind: "pac2", label: "PAC-2" };
  return null;
}

function calcRmpPpmToMgL(ppm, mw) {
  return ppm * mw / (1000 * CALC_RMP_SI.vmL);
}

function calcRmpMgLToPpm(mgL, mw) {
  return mgL * 1000 * CALC_RMP_SI.vmL / mw;
}

// ── 거리 ──
// 독성: 물질별 표(암모니아·염소·이산화황, 그 표의 끝점일 때만) 또는 일반 표 → { miles, table, ... }
function calcRmpToxicDistance({ sub, rate, epMgL, scn, topo, minutes, nh3 }) {
  let chem = CALC_RMP_CHEM_TABLES[sub.cas];
  if (sub.cas === CALC_RMP_AMMONIA) chem = CALC_RMP_AMMONIA_TABLES[nh3 === "refrig" ? "refrig" : "pressure"];
  const sameEndpoint = sub.ep != null && Math.abs(epMgL - sub.ep) <= 1e-9 * sub.ep;
  if (chem && sameEndpoint) {
    const n = chem[scn];
    return { table: n, ...calcRmpChemLookup(calcRmpTable(n), rate, topo), how: "chem" };
  }
  const density = sub.ref[scn] || sub.ref.worst || "dense";
  const mins = minutes <= 10 ? 10 : 60;
  const n = CALC_RMP_GENERIC[scn][density][topo][mins];
  const t = calcRmpTable(n);
  if (t.kind === "ratio") return { table: n, ratio: rate / epMgL, ...calcRmpRatioLookup(t, rate / epMgL), how: "ratio", density, mins };
  return { table: n, ...calcRmpGridLookup(t, epMgL, rate), how: "grid", density, mins };
}

// 증기운 화재(대안, LFL 끝점): 참조표 26–29
function calcRmpLflDistance({ sub, rate, topo }) {
  const density = sub.ref.alt || "dense";
  const n = CALC_RMP_GENERIC.lfl[density][topo];
  const t = calcRmpTable(n);
  if (t.kind === "ratio") return { table: n, ratio: rate / sub.lfl_mgL, ...calcRmpRatioLookup(t, rate / sub.lfl_mgL), how: "ratio", density };
  return { table: n, ...calcRmpGridLookup(t, sub.lfl_mgL, rate), how: "grid", density };
}

// 증기운 폭발 1 psi(식 C-2 의 수율을 바꿔 쓴 꼴): D[mi] = 0.0081 · (수율 · W[lb] · ΔHc / 4680)^(1/3)
function calcRmpVceMiles(wLb, hcKJkg, yieldFrac) {
  return 0.0081 * Math.cbrt(yieldFrac * wLb * hcKJkg / CALC_RMP_SI.tnt);
}

// 웅덩이 화재 5 kW/m²(식 10-1): d[ft] = PFF · √A[ft²]
function calcRmpPoolFireFt(areaFt2, pff) {
  return pff * Math.sqrt(areaFt2);
}

// 화구(BLEVE, 참조표 30): 물질 칸, 가장 가까운 양(가운데면 큰 쪽) → { miles, qLb, durationS }
function calcRmpBleve(cas, qsLb) {
  const t = calcRmpTable(30);
  const col = t.dist[cas];
  if (!col) return null;
  const i = calcRmpNearest(t.quantities.map(q => [q, 0]), qsLb, true);
  return { miles: col[i], qLb: t.quantities[i], durationS: t.duration_s[i], table: 30 };
}

// 화면용 표 설명 한 줄(번호·밀도·지형·시간·기상)
function calcRmpTableLabel(n) {
  const t = calcRmpTable(n);
  if (!t) return "";
  const dens = { buoyant: tr("중립 부력", "neutrally buoyant"), dense: tr("고밀도", "dense") }[t.density] || "";
  const topo = { rural: tr("개활지", "rural"), urban: tr("도시", "urban") }[t.topography] || tr("개활지·도시", "rural/urban");
  const time = t.minutes ? tr(`${t.minutes}분`, `${t.minutes} min`) : "";
  const met = t.stability ? `${t.stability}, ${t.wind_ms} m/s` : "";
  const what = { ratio: tr("누출률 ÷ 끝점", "release rate ÷ endpoint"), grid: tr("끝점 × 누출률", "endpoint × release rate"),
    chem: tr("물질별", "chemical-specific"), bleve: tr("화구 양", "fireball quantity") }[t.kind];
  return [tr(`참조표 ${n}`, `Reference Table ${n}`), what, dens, topo, time, met].filter(Boolean).join(" · ");
}

Object.assign(window, {
  CALC_RMP_SI, calcRmpToxic, calcRmpFlammable, calcRmpTable, calcRmpNearest, calcRmpRatioLookup, calcRmpGridLookup, calcRmpChemLookup,
  calcRmpGasWorst, calcRmpGasHole, calcRmpLiquidHole, calcRmpLiquidFactor, calcRmpPool, calcRmpEndpoint, calcRmpPpmToMgL, calcRmpMgLToPpm,
  calcRmpToxicDistance, calcRmpLflDistance, calcRmpVceMiles, calcRmpPoolFireFt, calcRmpBleve, calcRmpTableLabel,
});
