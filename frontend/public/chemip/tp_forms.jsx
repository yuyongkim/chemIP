// 온도별 물성 · 상관식 계산(순수 함수, React 없음). 상관식 하나 = 함수 하나(TP_FORMS), 자료는 v1/tp/<CAS>.json 의 curves[]:
//   { p, form, c: [A, B, C, D, E], Tmin, Tmax, Tc?, f, unit, src }  값 = f × TP_FORMS[form](c, T, rec)   (T 는 K)
//   form "eqN" = ChemSep 식 번호(Kooijman & Taylor, The ChemSep Book 2판 2006; 100–116 은 DIPPR 식과 같다),
//   "nasa9" = NASA 9계수 다항식(McBride, Zehe & Gordon 2002, NASA/TP-2002-211556): rec.intervals[{Tmin, Tmax, a[7], b[2]}].
// 맞춘 범위(Tmin–Tmax) 밖에서는 값을 만들지 않는다(null) — 외삽하지 않는다. 형식: scripts/static_export/CONTRACT.md "tp/".
// 분리기(flash·mccabe 등)용 증기압 함수 tpPsatFromFile(file) → { fn(T K) → Pa | null, Tmin, Tmax, src } 도 여기(순수).

const TP_R = 8.314462618;   // J/(mol·K), CODATA 2018

function tpPoly(c, T) {   // A + B T + C T² + D T³ + E T⁴
  let y = 0;
  for (let i = c.length - 1; i >= 0; i--) y = y * T + (c[i] || 0);
  return y;
}

function tpTau(rec, T) {
  return 1 - T / rec.Tc;
}

const TP_FORMS = {
  eq10: (c, T) => Math.exp(c[0] - c[1] / (T + (c[2] || 0))),                        // ln Y = A − B/(T + C)
  eq11: (c) => Math.exp(c[0]),
  eq12: (c, T) => Math.exp(c[0] + (c[1] || 0) * T),
  eq13: (c, T) => Math.exp(tpPoly(c.slice(0, 3), T)),
  eq14: (c, T) => Math.exp(tpPoly(c.slice(0, 4), T)),
  eq15: (c, T) => Math.exp(tpPoly(c.slice(0, 5), T)),
  eq16: (c, T) => Math.max(0, c[0] + Math.exp((c[1] || 0) / T + (c[2] || 0) + (c[3] || 0) * T + (c[4] || 0) * T * T)),
  eq17: (c, T) => c[0] + Math.exp((c[1] || 0) + (c[2] || 0) * T + (c[3] || 0) * T * T + (c[4] || 0) * T * T * T),
  eq100: (c, T) => tpPoly(c, T),
  eq101: (c, T) => Math.exp(c[0] + c[1] / T + (c[2] || 0) * Math.log(T) + (c[3] || 0) * Math.pow(T, c[4] || 0)),
  eq102: (c, T) => c[0] * Math.pow(T, c[1]) / (1 + (c[2] || 0) / T + (c[3] || 0) / (T * T)),
  eq103: (c, T) => c[0] + c[1] * Math.exp(-c[2] / Math.pow(T, c[3])),
  eq104: (c, T) => c[0] + c[1] / T + (c[2] || 0) / Math.pow(T, 3) + (c[3] || 0) / Math.pow(T, 8) + (c[4] || 0) / Math.pow(T, 9),
  eq105: (c, T) => c[0] / Math.pow(c[1], 1 + Math.pow(1 - T / c[2], c[3])),
  eq106: (c, T, rec) => {
    const tr = T / rec.Tc;
    if (tr >= 1) return 0;   // at and above Tc (ΔHvap, ρ fits end there)
    return c[0] * Math.pow(1 - tr, c[1] + (c[2] || 0) * tr + (c[3] || 0) * tr * tr + (c[4] || 0) * tr * tr * tr);
  },
  eq107: (c, T) => {
    const x = c[2] / T, z = (c[4] || 0) / T;
    return c[0] + c[1] * Math.pow(x / Math.sinh(x), 2) + ((c[3] || 0) && z ? c[3] * Math.pow(z / Math.cosh(z), 2) : 0);
  },
  eq114: (c, T, rec) => {
    const t = tpTau(rec, T), [A, B, C = 0, D = 0] = c;
    return A * A / t + B - 2 * A * C * t - A * D * t * t - C * C * t ** 3 / 3 - C * D * t ** 4 / 2 - D * D * t ** 5 / 5;
  },
  eq115: (c, T) => Math.exp(c[0] + c[1] / T + (c[2] || 0) * Math.log(T) + (c[3] || 0) * T * T + (c[4] || 0) / (T * T)),
  eq116: (c, T, rec) => {
    const t = tpTau(rec, T);
    return c[0] + c[1] * Math.pow(t, 0.35) + (c[2] || 0) * Math.pow(t, 2 / 3) + (c[3] || 0) * t + (c[4] || 0) * Math.pow(t, 4 / 3);
  },
  eq120: (c, T) => c[0] - c[1] / (T + (c[2] || 0)),
  eq121: (c, T) => c[0] + c[1] / T + (c[2] || 0) * Math.log(T) + (c[3] || 0) * Math.pow(T, c[4] || 0),
  nasa9: (c, T, rec) => tpNasa9(rec, T, "cp"),
};

// NASA-9: Cp/R, H/(RT), S/R. what = "cp" (J/mol·K) | "h" (J/mol, H°(T) 기준: 원소 298.15 K = 0) | "s" (J/mol·K, 1 bar)
function tpNasa9(rec, T, what = "cp") {
  const iv = (rec.intervals || []).find(i => T >= i.Tmin && T <= i.Tmax);
  if (!iv) return null;
  const [a1, a2, a3, a4, a5, a6, a7] = iv.a;
  const [b1, b2] = iv.b;
  if (what === "cp") return TP_R * (a1 / (T * T) + a2 / T + a3 + a4 * T + a5 * T * T + a6 * T ** 3 + a7 * T ** 4);
  if (what === "h") {
    return TP_R * T * (-a1 / (T * T) + a2 * Math.log(T) / T + a3 + a4 * T / 2 + a5 * T * T / 3 + a6 * T ** 3 / 4 + a7 * T ** 4 / 5 + b1 / T);
  }
  return TP_R * (-a1 / (2 * T * T) - a2 / T + a3 * Math.log(T) + a4 * T + a5 * T * T / 2 + a6 * T ** 3 / 3 + a7 * T ** 4 / 4 + b2);
}

function tpInRange(rec, T) {
  return Number.isFinite(T) && T >= rec.Tmin && T <= rec.Tmax;
}

// 상관식 한 줄 → 값(레코드 단위) 또는 null(범위 밖·모르는 식·계산 불가)
function tpEval(rec, T) {
  const fn = rec && TP_FORMS[rec.form];
  if (!fn || !tpInRange(rec, T)) return null;
  const v = fn(rec.c || [], T, rec);
  return v != null && Number.isFinite(v) ? v * (rec.f ?? 1) : null;
}

// 그래프 점: 맞춘 범위를 n 칸으로 → [[T K, 값]]
function tpSample(rec, n = 60, lo = rec.Tmin, hi = rec.Tmax) {
  const a = Math.max(lo, rec.Tmin), b = Math.min(hi, rec.Tmax);
  if (!(b > a)) return [];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const T = a + (b - a) * i / n;
    const v = tpEval(rec, T);
    if (v != null) pts.push([T, v]);
  }
  return pts;
}

// 파일 → 그 물성의 상관식들(출처 순서 그대로)
function tpCurves(file, prop) {
  return ((file && file.curves) || []).filter(c => c.p === prop && TP_FORMS[c.form]);
}

// 파일 → 상수 하나(처음 나온 출처 = 우선 출처). 없으면 null
function tpConst(file, key) {
  const row = ((file && file.const) || []).find(r => r.k === key);
  return row ? row.v : null;
}

// 분리 계산기용 증기압 함수(순수): psat(ChemSep 식 101) → 없으면 psat_antoine(식 10). 없으면 null.
function tpPsatFromFile(file) {
  const rec = tpCurves(file, "psat")[0] || tpCurves(file, "psat_antoine")[0];
  if (!rec) return null;
  return { fn: T => tpEval(rec, T), Tmin: rec.Tmin, Tmax: rec.Tmax, src: rec.src, form: rec.form, cas: file.cas, name: file.name || "" };
}

// 증기압 → 끓는 온도(이분법, 범위 안에서만). P [Pa] → T [K] 또는 null
function tpPsatInverse(psat, P) {
  if (!psat || !(P > 0)) return null;
  let lo = psat.Tmin, hi = psat.Tmax;
  const flo = psat.fn(lo), fhi = psat.fn(hi);
  if (flo == null || fhi == null || P < flo || P > fhi) return null;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (psat.fn(mid) < P) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

Object.assign(window, { TP_R, TP_FORMS, tpNasa9, tpInRange, tpEval, tpSample, tpCurves, tpConst, tpPsatFromFile, tpPsatInverse });
