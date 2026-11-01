// McCabe–Thiele 순수 함수 — 2성분 평형 곡선(상대 휘발도 α 또는 Raoult 쌍), q 선, 최소 환류비, 계단 작도(단 수·급액단).
// React 없음. 쓰는 곳: calc_mccabe.jsx(정의·그래프). 몰분율은 저비점(경) 성분 기준.

// 평형 곡선 = { y(x), x(y) }
function calcMcCabeAlphaEq(alpha) {
  return {
    y: (x) => alpha * x / (1 + (alpha - 1) * x),
    x: (y) => y / (alpha - (alpha - 1) * y),
  };
}

// Raoult 쌍(K 모형 calc_sep_vle.jsx, 성분 0 = 경 성분) + 압력 P (Pa)
function calcMcCabeRaoultEq(model, P) {
  return {
    y: (x) => {
      if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
      const T = calcSepBubbleT(model, [x, 1 - x], P);
      return x * model.s(T)[0] / P;
    },
    x: (y) => {
      if (y <= 0 || y >= 1) return y <= 0 ? 0 : 1;
      const T = calcSepDewT(model, [y, 1 - y], P);
      return y * P / model.s(T)[0];
    },
  };
}

// q 선과 평형 곡선의 교점 (x', y') — 최소 환류 핀치
function calcMcCabePinch(eq, xF, q) {
  if (Math.abs(q - 1) < 1e-9) return { x: xF, y: eq.y(xF) };
  const line = (x) => (q / (q - 1)) * x - xF / (q - 1);
  const g = (x) => eq.y(x) - line(x);
  const x = q > 1 ? calcSepBisect(g, xF, 1) : calcSepBisect(g, 0, xF);
  return { x, y: eq.y(x) };
}

// Rmin = (xD − y') / (y' − x')   (Rmin/(Rmin+1) = (xD − y')/(xD − x'))
function calcMcCabeRmin(eq, xF, q, xD) {
  const p = calcMcCabePinch(eq, xF, q);
  return { Rmin: (xD - p.y) / (p.y - p.x), pinch: p };
}

// 정류부 조작선과 q 선의 교점 x (q = 1 이면 xF)
function calcMcCabeIntersection(xF, q, xD, R) {
  const x = (xF + (q - 1) * xD / (R + 1)) / (q - (q - 1) * R / (R + 1));
  return { x, y: R / (R + 1) * x + xD / (R + 1) };
}

// 계단 작도(위에서 아래로). R = Infinity 이면 전환류(조작선 = 대각선).
// → { N (분수 단, 재비기 포함), feed (급액단, 위에서 몇 번째), path: [[x, y], …], int } 또는 { error: "pinch" | "noconv" }
function calcMcCabeSteps(eq, { xD, xB, xF, q, R, maxStages = 300 }) {
  const total = !Number.isFinite(R);
  const int = total ? null : calcMcCabeIntersection(xF, q, xD, R);
  if (int && !(int.y < eq.y(int.x) && int.x > xB && int.x < xD)) return { error: "pinch", int };
  const rect = (x) => R / (R + 1) * x + xD / (R + 1);
  const strip = int ? (x) => xB + (int.y - xB) / (int.x - xB) * (x - xB) : null;
  const path = [[xD, xD]];
  let y = xD, xPrev = xD, feed = null;
  for (let n = 1; n <= maxStages; n++) {
    const x = eq.x(y);
    if (!Number.isFinite(x)) return { error: "noconv" };
    path.push([x, y]);
    if (x <= xB) {
      const N = n - 1 + (xPrev - xB) / (xPrev - x);
      return { N, feed: total ? null : (feed || n), path, int };
    }
    if (!total && feed == null && x < int.x) feed = n;
    const yNext = total ? x : feed == null ? rect(x) : strip(x);
    path.push([x, yNext]);
    if (yNext >= y - 1e-12) return { error: "pinch", int };
    xPrev = x;
    y = yNext;
  }
  return { error: "noconv", int };
}

Object.assign(window, {
  calcMcCabeAlphaEq, calcMcCabeRaoultEq, calcMcCabePinch, calcMcCabeRmin, calcMcCabeIntersection, calcMcCabeSteps,
});
