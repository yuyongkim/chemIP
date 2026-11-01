// 공학 계산기 · 설비 사이징 묶음 공용 순수 함수(React 없음). 펌프 계통·피팅 손실·조절밸브 등이 함께 쓴다.
// 마찰계수는 calc_pipe_dp.jsx 의 calcFrictionColebrook, 레이놀즈 수는 calc_physics.jsx 의 calcReynolds 를 다시 쓴다.

// Darcy 마찰계수 — 층류(Re < 2100) 64/Re, 그 밖은 Colebrook(천이 영역도 Colebrook 로 이어 그린다).
function calcDarcyF(Re, rr) {
  if (!(Re > 0)) return NaN;
  return Re < CALC_RE_LAMINAR ? 64 / Re : calcFrictionColebrook(Re, rr);
}

// 이분법 근 찾기 — fn(lo)·fn(hi) 부호가 달라야 한다. 아니면 null.
function calcBisect(fn, lo, hi, tol = 1e-12, maxIter = 200) {
  let flo = fn(lo);
  const fhi = fn(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  if (flo === 0) return lo;
  if (fhi === 0) return hi;
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const fm = fn(mid);
    if (fm === 0 || (hi - lo) / 2 < tol * Math.max(1, Math.abs(mid))) return mid;
    if (fm * flo < 0) hi = mid; else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

// 등간격 n 점(양 끝 포함), 로그 등간격 n 점
function calcLinspace(a, b, n) {
  return Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
}
function calcLogspace(a, b, n) {
  const la = Math.log10(a), lb = Math.log10(b);
  return Array.from({ length: n }, (_, i) => Math.pow(10, la + (lb - la) * i / (n - 1)));
}

// 최소제곱 2차식 y = a + b x + c x² (점 3개면 정확히 지난다). pts = [[x, y], …] → [a, b, c] 또는 null(특이).
function calcQuadFit(pts) {
  const S = [0, 0, 0, 0, 0], T = [0, 0, 0];
  for (const [x, y] of pts) {
    let p = 1;
    for (let k = 0; k <= 4; k++) { S[k] += p; if (k <= 2) T[k] += p * y; p *= x; }
  }
  const M = [[S[0], S[1], S[2], T[0]], [S[1], S[2], S[3], T[1]], [S[2], S[3], S[4], T[2]]];
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-300) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k];
    }
  }
  const out = [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
  return out.every(Number.isFinite) ? out : null;
}

Object.assign(window, { calcDarcyF, calcBisect, calcLinspace, calcLogspace, calcQuadFit });
