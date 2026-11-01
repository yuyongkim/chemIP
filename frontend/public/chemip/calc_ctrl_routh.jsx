// Routh–Hurwitz 안정도 판별과 다항식 근 — React 없음(순수 함수).
// 특성 방정식은 높은 차수부터 계수 배열 [a_n, …, a_0]. P 제어기 이득을 넣은 식은 a(s) + Kc·b(s) = 0 으로 받는다.
// 특수한 경우(Ogata·Nise 의 표준 처리):
//   첫 열만 0  → 아주 작은 양수 ε 로 바꿔 계속(부호 변화 수는 그대로 쓴다)
//   한 행 전체 0 → 바로 위 행의 보조 다항식을 미분한 계수로 바꾼다(원점 대칭 근, 허수축 위 근이 있을 수 있음)

const CTRL_EPS = 1e-9;

// 계수 → { rows: [[…]], powers: [n…0], firstCol, signChanges, epsRows: [행 번호], zeroRows: [행 번호] }
function ctrlRouthArray(coeffs) {
  const n = coeffs.length - 1;
  const width = Math.floor(n / 2) + 1;
  const scale = Math.max(...coeffs.map(Math.abs)) || 1;
  const tiny = CTRL_EPS * scale;
  const pick = (start) => Array.from({ length: width }, (_, i) => coeffs[start + 2 * i] ?? 0);
  const rows = [pick(0)];
  if (n >= 1) rows.push(pick(1));
  const epsRows = [], zeroRows = [];
  for (let r = 1; r < n + 1; r++) {
    const row = rows[r];
    if (row.every(x => Math.abs(x) < tiny)) {
      // 보조 다항식 A(s) = 위 행 계수 × s^(p), s^(p−2), … → dA/ds
      const p = n - (r - 1);
      rows[r] = rows[r - 1].map((x, i) => x * (p - 2 * i)).map(x => (Math.abs(x) < tiny ? 0 : x));
      zeroRows.push(r);
    }
    if (Math.abs(rows[r][0]) < tiny) { rows[r][0] = tiny; epsRows.push(r); }
    if (r === n) break;
    const a = rows[r - 1], b = rows[r];
    rows.push(Array.from({ length: width }, (_, i) => {
      const v = (b[0] * (a[i + 1] ?? 0) - a[0] * (b[i + 1] ?? 0)) / b[0];
      return Math.abs(v) < tiny ? 0 : v;
    }));
  }
  const firstCol = rows.map(row => row[0]);
  let signChanges = 0;
  for (let i = 1; i < firstCol.length; i++) if (Math.sign(firstCol[i]) !== Math.sign(firstCol[i - 1])) signChanges++;
  return { rows, powers: rows.map((_, i) => n - i), firstCol, signChanges, epsRows, zeroRows };
}

// 안정: 첫 열 부호 변화 0, 특수한 경우(ε·0 행) 없음, 모든 계수 같은 부호
function ctrlRouthStable(coeffs) {
  const arr = ctrlRouthArray(coeffs);
  return arr.signChanges === 0 && arr.epsRows.length === 0 && arr.zeroRows.length === 0;
}

// a + Kc·b (길이가 다르면 낮은 차수 쪽을 맞춘다)
function ctrlPolyWithGain(a, b, Kc) {
  const n = Math.max(a.length, b.length);
  const pad = (p) => Array(n - p.length).fill(0).concat(p);
  const A = pad(a), B = pad(b);
  return A.map((x, i) => x + Kc * B[i]);
}

// 다항식 근(Durand–Kerner) → [{ re, im }]
function ctrlPolyRoots(coeffs) {
  let c = coeffs.slice();
  while (c.length > 1 && c[0] === 0) c.shift();
  const n = c.length - 1;
  if (n < 1) return [];
  const mono = c.map(x => x / c[0]);
  const radius = 1 + Math.max(...mono.slice(1).map(Math.abs));
  let z = Array.from({ length: n }, (_, k) => {
    const ang = 2 * Math.PI * k / n + 0.4;
    return [radius * Math.cos(ang), radius * Math.sin(ang)];
  });
  const mul = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
  const div = (p, q) => { const d = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / d, (p[1] * q[0] - p[0] * q[1]) / d]; };
  const evalP = (x) => mono.reduce((acc, a) => { const m = mul(acc, x); return [m[0] + a, m[1]]; }, [0, 0]);
  for (let it = 0; it < 2000; it++) {
    let moved = 0;
    z = z.map((zi, i) => {
      let den = [1, 0];
      z.forEach((zj, j) => { if (j !== i) den = mul(den, [zi[0] - zj[0], zi[1] - zj[1]]); });
      const step = div(evalP(zi), den);
      moved = Math.max(moved, Math.hypot(step[0], step[1]));
      return [zi[0] - step[0], zi[1] - step[1]];
    });
    if (moved < 1e-14 * radius) break;
  }
  return z.map(([re, im]) => ({ re, im: Math.abs(im) < 1e-9 * radius ? 0 : im }));
}

// Kc > 0 에서 처음 만나는 안정 구간 [lo, Ku]. 안정 구간이 없으면 null, 끝까지 안정이면 Ku = Infinity.
function ctrlCriticalGain(a, b) {
  const stable = (K) => ctrlRouthStable(ctrlPolyWithGain(a, b, K));
  const grid = [];
  for (let e = -6; e <= 6; e += 0.05) grid.push(10 ** e);
  let lo = null;
  for (let i = 0; i < grid.length; i++) {
    const s = stable(grid[i]);
    if (s && lo === null) lo = i === 0 ? 0 : ctrlBisectBool(stable, grid[i - 1], grid[i], false);
    if (!s && lo !== null) return { lo, Ku: ctrlBisectBool(stable, grid[i - 1], grid[i], true) };
  }
  return lo === null ? null : { lo, Ku: Infinity };
}

// 참/거짓이 바뀌는 경계: from 쪽(x0)이 참이면 true 로 부른다
function ctrlBisectBool(f, x0, x1, x0True) {
  for (let i = 0; i < 100; i++) {
    const mid = Math.sqrt(x0 * x1);
    if (f(mid) === x0True) x0 = mid; else x1 = mid;
  }
  return Math.sqrt(x0 * x1);
}

// Ku 에서 허수축 위 근 ω_u (근 가운데 실수부가 가장 0 에 가깝고 허수부 > 0)
function ctrlCrossFreq(a, b, Ku) {
  const roots = ctrlPolyRoots(ctrlPolyWithGain(a, b, Ku)).filter(r => r.im > 0);
  if (!roots.length) return null;
  roots.sort((p, q) => Math.abs(p.re) - Math.abs(q.re));
  return roots[0].im;
}

Object.assign(window, { ctrlRouthArray, ctrlRouthStable, ctrlPolyWithGain, ctrlPolyRoots, ctrlCriticalGain, ctrlBisectBool, ctrlCrossFreq });
