// 폭발 과압 공용 순수 함수·데이터(React 없음) — TNT 당량(Kinney–Graham), Baker–Strehlow–Tang(BST) 곡선 맞춤식·화염 속도 표.
// 곡선 그림을 옮기지 않고, 공개 문헌에 인쇄된 식·계수만 쓴다. TNO 다중에너지(ME) 곡선은 공개 맞춤식을 확인하지 못해 넣지 않았다.

// TNT 폭발열 [J/kg] — Crowl & Louvar 4 686 kJ/kg, EPA RMP OCA 4 680 kJ/kg
const CALC_TNT_ENERGY = { cl: 4.686e6, epa: 4.68e6 };

// Kinney & Graham (1985) 자유 공간 TNT 과압 맞춤식: z = R / W^(1/3) [m/kg^(1/3)] → p_s / p_a
function calcKinneyGraham(z) {
  const num = 1616 * (1 + (z / 4.5) ** 2);
  const den = Math.sqrt((1 + (z / 0.048) ** 2) * (1 + (z / 0.32) ** 2) * (1 + (z / 1.35) ** 2));
  return num / den;
}

// EPA RMP OCA 식 C-2 — 1 psi 거리 D [mi] = 0.0081 · [0.1 · W_lb · (ΔHc / 4 680)]^(1/3), ΔHc [kJ/kg]. 수율 10 % 고정.
function calcRmpVce1psiMiles(massLb, dHcKJkg) {
  return 0.0081 * Math.cbrt(0.1 * massLb * dHcKJkg / 4680);
}

// BST 화염 마하수 표 — Pierorazio, Thomas, Baker & Ketchum (2005) Process Saf. Prog. 24(1):59 갱신표(1D 제외).
// [가둠][반응성] = [혼잡 낮음, 중간, 높음]. "DDT"(폭굉 전이)는 마하 5.2 로 둔다. NOAA ALOHA 5.4.4 기술 문서 표 14(3D)와 같다.
const CALC_BST_MACH_DDT = 5.2;
const CALC_BST_MACH = {
  "2D": { high: [0.59, "DDT", "DDT"], medium: [0.47, 0.66, 1.6], low: [0.079, 0.47, 0.66] },
  "2.5D": { high: [0.47, "DDT", "DDT"], medium: [0.29, 0.55, 1.0], low: [0.053, 0.35, 0.50] },
  "3D": { high: [0.36, "DDT", "DDT"], medium: [0.11, 0.44, 0.50], low: [0.026, 0.23, 0.34] },
};
const CALC_BST_CONGESTION = ["low", "medium", "high"];

function calcBstMach(confinement, reactivity, congestion) {
  const v = CALC_BST_MACH[confinement]?.[reactivity]?.[CALC_BST_CONGESTION.indexOf(congestion)];
  return v === "DDT" ? CALC_BST_MACH_DDT : v;
}

// BST 곡선 맞춤식 — NOAA ALOHA 5.4.4 Technical Documentation(NOAA Tech. Memo. NOS OR&R 43, 2013) 5.2절 표 15(미국 정부 저작물).
//   x = r (Pa/E)^(1/3) (Sachs 환산 거리), x < x0 이면 ΔP/Pa = D, 아니면 ΔP/Pa = A · B^(1/x) · x^C
const CALC_BST_FITS = [
  { mach: 0.2, A: 0.0335, B: 0.8359, C: -1.1192, D: 0.065, x0: 0.35 },
  { mach: 0.35, A: 0.1041, B: 0.8642, C: -1.0568, D: 0.22, x0: 0.32 },
  { mach: 0.7, A: 0.3764, B: 0.7439, C: -1.2728, D: 0.65, x0: 0.3 },
  { mach: 5.2, A: 0.2932, B: 1.399, C: -1.1591, D: 20, x0: 0.16 },
];

function calcBstCurve(fit, x) {
  return x < fit.x0 ? fit.D : fit.A * Math.pow(fit.B, 1 / x) * Math.pow(x, fit.C);
}

// 표에 없는 마하수: 둘러싼 두 곡선 사이를 ln(ΔP) 에서 마하수로 직선 보간(ChemIP 처리, ALOHA 문서는 보간법을 밝히지 않음).
// 0.2 보다 작으면 0.2 곡선(과대 = 보수적), 5.2 보다 크면 5.2 곡선.
function calcBstOverpressure(mach, x) {
  const F = CALC_BST_FITS;
  if (mach <= F[0].mach) return calcBstCurve(F[0], x);
  if (mach >= F[F.length - 1].mach) return calcBstCurve(F[F.length - 1], x);
  const i = F.findIndex(f => f.mach >= mach);
  const lo = F[i - 1], hi = F[i];
  const t = (mach - lo.mach) / (hi.mach - lo.mach);
  return Math.exp((1 - t) * Math.log(calcBstCurve(lo, x)) + t * Math.log(calcBstCurve(hi, x)));
}

Object.assign(window, {
  CALC_TNT_ENERGY, calcKinneyGraham, calcRmpVce1psiMiles, CALC_BST_MACH, CALC_BST_MACH_DDT, CALC_BST_CONGESTION, calcBstMach,
  CALC_BST_FITS, calcBstCurve, calcBstOverpressure,
});
