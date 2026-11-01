// 기액평형 순수 함수 — Antoine 증기압, K 값 모형(Raoult·Wilson·직접 입력), 기포점·이슬점, 등온 플래시(Rachford–Rice),
// 2성분 T–x–y·P–x–y 곡선. React 없음. 쓰는 곳: calc_flash.jsx, calc_mccabe.jsx(Raoult 쌍), calc_antoine_facts.jsx.
// 모든 함수는 기준 단위(T: K, P: Pa)로 받고 돌려준다. 풀 수 없으면 NaN·null 을 돌려주고, 문구는 부르는 정의가 고른다.
//
// K 모형 = { s(T) → [sᵢ (Pa)] }  — Kᵢ = sᵢ(T) / P 꼴(Raoult: sᵢ = Pᵢˢᵃᵗ, Wilson: sᵢ = Pcᵢ·exp[5.373(1+ωᵢ)(1 − Tcᵢ/T)]).
//   tsat(P) → [Tᵢ (K)]  성분마다 Kᵢ = 1 이 되는 온도(기포점·이슬점 풀이의 구간 끝).

// Antoine 상수의 꼴(로그·압력 단위·온도 단위) — 선택 칸 세 개. 정의마다 같은 key(base·pu·tu)로 쓴다.
const CALC_SEP_P_UNITS = ["mmHg", "kPa", "bar", "Pa"];
const CALC_SEP_T_UNITS = ["C", "K"];

function calcAntoineConvInputs(when) {
  return [
    { key: "base", type: "choice", label: tr("Antoine 로그", "Antoine logarithm"), default: "log10", when, term: "antoine_constants",
      options: [{ v: "log10", label: "log₁₀" }, { v: "ln", label: "ln" }] },
    { key: "pu", type: "choice", label: tr("상수의 압력 단위", "Pressure unit of constants"), default: "mmHg", when,
      options: CALC_SEP_P_UNITS.map(u => ({ v: u, label: CALC_UNITS.pressure[u].label })) },
    { key: "tu", type: "choice", label: tr("상수의 온도 단위", "Temperature unit of constants"), default: "C", when,
      options: CALC_SEP_T_UNITS.map(u => ({ v: u, label: CALC_UNITS.temperature[u].label })) },
  ];
}

// 행 { A, B, C } + 꼴 { base, pu, tu } + T (K) → Pˢᵃᵗ (Pa). C + t ≤ 0 이면 NaN.
function calcAntoinePsat(row, conv, T) {
  const t = conv.tu === "K" ? T : T - 273.15;
  if (!(row.C + t > 0)) return NaN;
  const lp = row.A - row.B / (row.C + t);
  return calcConvert("pressure", conv.base === "ln" ? Math.exp(lp) : Math.pow(10, lp), conv.pu, "Pa");
}

// 역함수: P (Pa) → 끓는 온도 (K). 풀 수 없으면 NaN.
function calcAntoineTsat(row, conv, P) {
  const p = calcConvert("pressure", P, "Pa", conv.pu);
  const lp = conv.base === "ln" ? Math.log(p) : Math.log10(p);
  if (!(row.A - lp > 0)) return NaN;
  const t = row.B / (row.A - lp) - row.C;
  const T = conv.tu === "K" ? t : t + 273.15;
  return T > 0 ? T : NaN;
}

function calcSepRaoultModel(rows, conv) {
  return {
    s: (T) => rows.map(r => calcAntoinePsat(r, conv, T)),
    tsat: (P) => rows.map(r => calcAntoineTsat(r, conv, P)),
  };
}

// Wilson(1968) K 상관식. 행 { Tc (K), Pc (Pa), w }.
function calcSepWilsonModel(rows) {
  return {
    s: (T) => rows.map(r => r.Pc * Math.exp(5.373 * (1 + r.w) * (1 - r.Tc / T))),
    tsat: (P) => rows.map(r => {
      const d = 1 - Math.log(P / r.Pc) / (5.373 * (1 + r.w));
      return d > 0 ? r.Tc / d : NaN;
    }),
  };
}

function calcSepSum(a) {
  return a.reduce((s, v) => s + v, 0);
}

// 몰분율 행 → 합 1 로 나눈 배열
function calcSepNormalize(z) {
  const t = calcSepSum(z);
  return z.map(v => v / t);
}

// 단조 함수 f 의 [lo, hi] 안 근(이분법). 부호가 같으면 NaN.
function calcSepBisect(f, lo, hi, iter = 200) {
  let flo = f(lo);
  const fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi)) return NaN;
  if (flo === 0) return lo;
  if (fhi === 0) return hi;
  if (flo * fhi > 0) return NaN;
  for (let i = 0; i < iter; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (!Number.isFinite(fm)) return NaN;
    if (fm === 0 || hi - lo < 1e-12 * Math.max(1, Math.abs(mid))) return mid;
    if (flo * fm < 0) hi = mid; else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

// 성분 끓는 온도 구간 [min Tᵢ, max Tᵢ] (기포점·이슬점 온도는 늘 이 안에 있다)
function calcSepTBracket(model, P) {
  const ts = model.tsat(P);
  if (ts.some(t => !(t > 0))) return null;
  return [Math.min(...ts) - 0.01, Math.max(...ts) + 0.01];   // 끝이 정확히 근(순수 성분)일 때 부호 판정이 흔들리지 않게 조금 넓힌다
}

// 기포점 온도: Σ zᵢ Kᵢ(T, P) = 1
function calcSepBubbleT(model, z, P) {
  const b = calcSepTBracket(model, P);
  if (!b) return NaN;
  return calcSepBisect(T => Math.log(calcSepSum(model.s(T).map((s, i) => z[i] * s / P))), b[0], b[1]);
}

// 이슬점 온도: Σ zᵢ / Kᵢ(T, P) = 1
function calcSepDewT(model, z, P) {
  const b = calcSepTBracket(model, P);
  if (!b) return NaN;
  return calcSepBisect(T => Math.log(calcSepSum(model.s(T).map((s, i) => z[i] * P / s))), b[0], b[1]);
}

// 기포점·이슬점 압력: K = s/P 꼴이라 바로 풀린다
function calcSepBubbleP(model, z, T) {
  return calcSepSum(model.s(T).map((s, i) => z[i] * s));
}

function calcSepDewP(model, z, T) {
  return 1 / calcSepSum(model.s(T).map((s, i) => z[i] / s));
}

// Rachford–Rice: K 배열 + z → { beta (V/F), x, y, phase: "liquid" | "vapor" | "two" }
function calcRachfordRice(z, K) {
  if (K.some(k => !(k > 0))) return null;
  const zk = calcSepSum(z.map((v, i) => v * K[i]));
  const zok = calcSepSum(z.map((v, i) => v / K[i]));
  if (zk <= 1) return { beta: 0, x: z.slice(), y: z.map((v, i) => v * K[i] / zk), phase: "liquid", zk, zok };
  if (zok <= 1) return { beta: 1, x: z.map((v, i) => v / K[i] / zok), y: z.slice(), phase: "vapor", zk, zok };
  const f = (b) => calcSepSum(z.map((v, i) => v * (K[i] - 1) / (1 + b * (K[i] - 1))));
  const beta = calcSepBisect(f, 0, 1);
  const x = z.map((v, i) => v / (1 + beta * (K[i] - 1)));
  return { beta, x, y: x.map((v, i) => v * K[i]), phase: "two", zk, zok };
}

// 2성분 곡선: 압력 P 고정 T–x–y (n 칸) → [{ x, y, T }], 온도 T 고정 P–x–y → [{ x, y, P }]
function calcSepBinaryTxy(model, P, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = i / n;
    const T = calcSepBubbleT(model, [x, 1 - x], P);
    if (!Number.isFinite(T)) return null;
    out.push({ x, y: x * model.s(T)[0] / P, T });
  }
  return out;
}

function calcSepBinaryPxy(model, T, n = 40) {
  const [s1, s2] = model.s(T);
  if (!(s1 > 0 && s2 > 0)) return null;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = i / n;
    const P = x * s1 + (1 - x) * s2;
    out.push({ x, y: x * s1 / P, P });
  }
  return out;
}

// 조성 배열 → "이름 0.2859 · 이름 0.3810" (보이는 글자; 이름이 비면 성분 번호)
function calcSepCompText(names, v, digits = 4) {
  return v.map((x, i) => `${names[i] || `#${i + 1}`} ${calcFormatNumber(x, digits)}`).join(" · ");
}

Object.assign(window, {
  CALC_SEP_P_UNITS, CALC_SEP_T_UNITS, calcAntoineConvInputs, calcAntoinePsat, calcAntoineTsat,
  calcSepRaoultModel, calcSepWilsonModel, calcSepNormalize, calcSepBisect, calcSepBubbleT, calcSepDewT,
  calcSepBubbleP, calcSepDewP, calcRachfordRice, calcSepBinaryTxy, calcSepBinaryPxy, calcSepCompText, calcSepSum,
});
