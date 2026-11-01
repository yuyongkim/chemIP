// 습공기 선도 그래프 자료(순수 함수) — 포화선(RH 100 %), 상대 습도 선, 상태점, 가열·냉각·혼합 과정선 → CalcChart 속성.
// 가로축 건구 온도 °C, 세로축 절대 습도 g/kg 건조 공기. 성질은 calc_psy_math.jsx.

const PSY_CHART_RH = [20, 40, 60, 80];   // 그래프 색 칸(CALC_CHART_SERIES_MAX 6) 안: 포화선 + RH 4개 + 과정선

// 온도 범위 [a, b] °C 에서 RH 일정 선 — 세로축 위(wMax g/kg)를 넘는 점은 거기서 끊는다.
function psyRhLine(rh, a, b, P, wMax, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = a + (b - a) * i / n;
    const pw = rh / 100 * calcWaterPsat(t + 273.15);
    if (pw >= P) break;
    const w = 1000 * psyHumidityRatio(pw, P);
    if (w > wMax) {
      const prev = pts[pts.length - 1];
      if (prev) pts.push([prev[0] + (t - prev[0]) * (wMax - prev[1]) / (w - prev[1]), wMax]);
      break;
    }
    pts.push([t, w]);
  }
  return pts;
}

const psyPt = (s) => [s.T - 273.15, 1000 * s.W];

// states: [{ s, label }] 상태점, path: [[t, w], …] 과정선(°C, g/kg). P 는 Pa
function psyChartProps(P, states, path, pathLabel) {
  const xs = states.map(x => x.s.T - 273.15), ws = states.map(x => 1000 * x.s.W);
  const tMin = Math.min(0, Math.floor(Math.min(...xs) / 5) * 5);
  const tMax = Math.max(40, Math.ceil((Math.max(...xs) + 5) / 5) * 5);
  const wMax = Math.max(25, Math.ceil((Math.max(...ws) * 1.15) / 5) * 5);
  return {
    x: { label: tr("건구 온도", "Dry-bulb temperature"), unit: "°C", min: tMin, max: tMax },
    y: { label: tr("절대 습도 W", "Humidity ratio W"), unit: tr("g/kg 건조 공기", "g/kg dry air"), min: 0, max: wMax },
    series: [
      { key: "sat", label: tr("포화선 (RH 100 %)", "Saturation (RH 100 %)"), points: psyRhLine(100, tMin, tMax, P, wMax), kind: "line" },
      ...PSY_CHART_RH.map(rh => ({ key: `rh${rh}`, label: `RH ${rh} %`, points: psyRhLine(rh, tMin, tMax, P, wMax), kind: "line", dashed: true })),
      ...(path && path.length > 1 ? [{ key: "process", label: pathLabel, points: path, kind: "line" }] : []),
    ],
    markers: states.map(x => { const [t, w] = psyPt(x.s); return { x: t, y: w, label: x.label }; }),
    height: 300,
    ariaLabel: tr("습공기 선도: 포화선·상대 습도 선과 상태점", "Psychrometric chart: saturation and relative-humidity lines with the state points"),
  };
}

// 코일 과정선: 이슬점 위 냉각·가열은 수평선, 이슬점 아래 냉각은 이슬점까지 수평 → 포화선을 따라 나가는 온도까지
function psyCoilPath(s1, s2, P) {
  const p1 = psyPt(s1), p2 = psyPt(s2);
  if (!(s2.W < s1.W) || s1.Td == null) return [p1, p2];
  const path = [p1, [s1.Td - 273.15, p1[1]]];
  const n = 12;
  for (let i = 1; i <= n; i++) {
    const t = (s1.Td - 273.15) + ((s2.T - 273.15) - (s1.Td - 273.15)) * i / n;
    path.push([t, 1000 * psySatW(t + 273.15, P)]);
  }
  return path;
}

Object.assign(window, { PSY_CHART_RH, psyRhLine, psyPt, psyChartProps, psyCoilPath });
