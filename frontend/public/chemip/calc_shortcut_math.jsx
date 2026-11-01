// 간이 증류(FUG) 순수 함수 — Fenske 최소 단 수·비핵심 성분 분배, Underwood 최소 환류비(θ 근), Gilliland(Molokanov 식), Kirkbride 급액 위치.
// React 없음. 쓰는 곳: calc_fug.jsx. α 는 아무 기준 성분에 대한 상대 휘발도(HK 로 나눠 쓴다). 단 수는 재비기를 포함한 평형단.

// Fenske: Nmin = ln[(d/b)_LK · (b/d)_HK] / ln α_LK,HK   (rLK = LK 의 탑정 회수율, rHK = HK 의 탑저 회수율)
function calcFenskeNmin(rLK, rHK, alphaLH) {
  return Math.log((rLK / (1 - rLK)) * (rHK / (1 - rHK))) / Math.log(alphaLH);
}

// 성분 i 의 탑정 비율 d/f — (d/b)_i = (d/b)_HK · α_i,HK^Nmin
function calcFenskeSplit(alphaHK, rHK, Nmin) {
  const dbHK = (1 - rHK) / rHK;
  return alphaHK.map(a => { const db = dbHK * Math.pow(a, Nmin); return db / (1 + db); });
}

// Underwood θ: Σ αᵢ zᵢ / (αᵢ − θ) = 1 − q, α_HK < θ < α_LK. 사이에 다른 성분이 있으면 구간마다 근이 하나씩 — 첫(HK 쪽) 근을 돌려준다.
function calcUnderwoodTheta(alpha, z, q, aHK, aLK) {
  const h = (t) => alpha.reduce((s, a, i) => s + a * z[i] / (a - t), 0) - (1 - q);
  const poles = [aHK, ...alpha.filter(a => a > aHK && a < aLK).sort((p, r) => p - r), aLK];
  const roots = [];
  for (let k = 0; k + 1 < poles.length; k++) {
    const lo = poles[k], hi = poles[k + 1];
    if (!(hi > lo)) continue;
    const e = (hi - lo) * 1e-10;
    const t = calcSepBisect(h, lo + e, hi - e);
    if (Number.isFinite(t)) roots.push(t);
  }
  return { theta: roots.length ? roots[0] : NaN, roots };
}

// Rmin + 1 = Σ αᵢ xDᵢ / (αᵢ − θ)
function calcUnderwoodRmin(alpha, xD, theta) {
  return alpha.reduce((s, a, i) => s + a * xD[i] / (a - theta), 0) - 1;
}

// Gilliland 상관 — Molokanov 식. X = (R − Rmin)/(R + 1) → Y = (N − Nmin)/(N + 1)
function calcGillilandY(X) {
  if (!(X > 0)) return 0;
  if (X >= 1) return 1;
  return 1 - Math.exp((1 + 54.4 * X) / (11 + 117.2 * X) * (X - 1) / Math.sqrt(X));
}

function calcGillilandN(Nmin, Rmin, R) {
  const Y = calcGillilandY((R - Rmin) / (R + 1));
  return { X: (R - Rmin) / (R + 1), Y, N: (Nmin + Y) / (1 - Y) };
}

// Kirkbride: NR/NS = [(z_HK/z_LK)(xB_LK/xD_HK)² (B/D)]^0.206 → { NR, NS } (NR + NS = N)
function calcKirkbride(N, zLK, zHK, xBLK, xDHK, BD) {
  const ratio = Math.pow((zHK / zLK) * Math.pow(xBLK / xDHK, 2) * BD, 0.206);
  return { ratio, NR: N * ratio / (1 + ratio), NS: N / (1 + ratio) };
}

Object.assign(window, { calcFenskeNmin, calcFenskeSplit, calcUnderwoodTheta, calcUnderwoodRmin, calcGillilandY, calcGillilandN, calcKirkbride });
