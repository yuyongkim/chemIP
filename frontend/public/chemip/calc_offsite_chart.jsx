// 장외 영향 스크리닝 그래프 — 풀이 한 벌(calcOffsiteRun) → CalcChart 속성. React 없음.
// 독성·증기운 화재: 쓴 참조표의 "누출률 → 끝점 거리" 계단(이 끝점의 열), 증기운 폭발: 식 C-2 의 "증기운 양 → 1 psi 거리".
// 축은 SI(kg/min, km), 지침 표 단위(lb/min, mi)에서 바꾼다. 지금 계산한 점을 표시(markers)한다.

const CALC_OFFSITE_KG_MIN = CALC_RMP_SI.lb;           // lb/min → kg/min
const CALC_OFFSITE_KM = CALC_RMP_SI.mi / 1000;          // mi → km

// 표 한 장 → [[누출률 lb/min, 거리 mi]] (이 끝점 기준)
function calcOffsiteCurve(dist, ep) {
  const t = calcRmpTable(dist.table);
  if (!t) return [];
  if (t.kind === "ratio") return t.rows.filter(r => r[1] > 0).map(r => [r[1] * ep, r[2]]);
  if (t.kind === "chem") return t.rows.filter(r => !r[3]).map(r => [r[0], dist.topoUrban ? r[2] : r[1]]);
  if (t.kind === "grid") {
    const k = t.keys.findIndex(x => x[0] === dist.key[0] && x[1] === dist.key[1]);
    return t.rates.map((r, i) => [r[0], t.dist[k][i], r[1]]).filter(p => !p[2] && p[1] != null).map(p => [p[0], p[1]]);
  }
  return [];
}

function calcOffsiteChart(run, topo) {
  if (!run || run.error) return null;
  const L = { rate: tr("대기 누출률", "Release rate to air"), dist: tr("끝점까지 거리", "Distance to endpoint"), now: tr("이 계산", "This case") };
  if (run.kind === "vce") {
    const w0 = run.cloudLb;
    const pts = [];
    for (let e = -1; e <= 1.0001; e += 0.1) {
      const w = w0 * 10 ** e;
      pts.push([w * CALC_RMP_SI.lb, calcRmpVceMiles(w, run.sub.hc_kJkg, run.yieldFrac) * CALC_OFFSITE_KM]);
    }
    return {
      x: { label: tr("증기운 속 양", "Quantity in the cloud"), unit: "kg", log: true },
      y: { label: tr("1 psi 거리", "Distance to 1 psi"), unit: "km", log: true },
      series: [{ key: "vce", label: tr(`식 C-2, 수율 ${run.yieldFrac * 100}%`, `Eq. C-2, ${run.yieldFrac * 100}% yield`), points: pts }],
      markers: [{ x: w0 * CALC_RMP_SI.lb, y: run.dist.miles * CALC_OFFSITE_KM, label: L.now }],
      height: 240,
      ariaLabel: tr("증기운 양에 따른 1 psi 과압 거리", "Distance to 1 psi overpressure versus quantity in the cloud"),
    };
  }
  if (run.kind !== "toxic" && run.kind !== "vcf") return null;
  const ep = run.kind === "toxic" ? run.ep.mgL : run.sub.lfl_mgL;
  const curve = calcOffsiteCurve({ ...run.dist, topoUrban: topo === "urban" }, ep);
  if (curve.length < 2) return null;
  return {
    x: { label: L.rate, unit: "kg/min", log: true },
    y: { label: L.dist, unit: "km", log: true },
    series: [{ key: "table", label: calcRmpTableLabel(run.dist.table), kind: "step",
      points: curve.map(([r, mi]) => [r * CALC_OFFSITE_KG_MIN, mi * CALC_OFFSITE_KM]) }],
    markers: [{ x: run.rateLb * CALC_OFFSITE_KG_MIN, y: run.dist.miles * CALC_OFFSITE_KM, label: L.now }],
    height: 240,
    ariaLabel: tr("누출률에 따른 끝점 거리(참조표)", "Distance to endpoint versus release rate (reference table)"),
  };
}

Object.assign(window, { calcOffsiteCurve, calcOffsiteChart });
