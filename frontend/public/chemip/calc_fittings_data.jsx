// 피팅 손실계수 자료(데이터만, React 없음) — 2-K 법(Hooper 1981)과 3-K 법(Silverberg & Darby 1999, Darby 2001 교재)의 공개 계수.
// 계수는 원 논문에 실린 값(python `fluids` 의 fittings.Hooper·fittings.Darby 사전과 같은 값)이다. 표준 원문(Crane TP-410 등)은 옮기지 않았다.
// 항목: key → { label: tr(), hooper: [K1, K∞], darby: [K1, Ki, Kd], note?: tr() }.  계산기: calc_fittings_dp.jsx

const CALC_FITTINGS = [
  { key: "ell90", label: tr("90° 엘보 표준 (R/D = 1, 플랜지·용접)", "90° elbow, standard (R/D = 1, flanged/welded)"), hooper: [800, 0.25], darby: [800, 0.091, 4.0] },
  { key: "ell90lr", label: tr("90° 엘보 장반경 (R/D = 1.5)", "90° elbow, long radius (R/D = 1.5)"), hooper: [800, 0.2], darby: [800, 0.071, 4.2] },
  { key: "ell45", label: tr("45° 엘보 표준 (R/D = 1)", "45° elbow, standard (R/D = 1)"), hooper: [500, 0.2], darby: [500, 0.071, 4.2] },
  { key: "teeb", label: tr("티 분기 흐름 (엘보처럼, 플랜지)", "Tee, through-branch (as elbow, flanged)"), hooper: [800, 0.8], darby: [800, 0.28, 4.0] },
  { key: "teer", label: tr("티 직진 흐름 (플랜지·용접)", "Tee, run-through (flanged/welded)"), hooper: [150, 0.05], darby: [150, 0.05, 4.0] },
  { key: "gate", label: tr("게이트 밸브 (전개, β = 1)", "Gate valve (full open, β = 1)"), hooper: [300, 0.1], darby: [300, 0.037, 3.9] },
  { key: "ball", label: tr("볼 밸브 (2-K: 축소 β = 0.9, 3-K: β = 1)", "Ball valve (2-K: reduced trim β = 0.9; 3-K: β = 1)"), hooper: [500, 0.15], darby: [300, 0.017, 3.5] },
  { key: "globe", label: tr("글로브 밸브 (표준)", "Globe valve (standard)"), hooper: [1500, 4.0], darby: [1500, 1.7, 3.6] },
  { key: "check", label: tr("스윙 체크 밸브", "Swing check valve"), hooper: [1500, 1.5], darby: [1500, 0.46, 4.0] },
];

// 관 입구(날카로운 모서리)·출구 — 레이놀즈 수와 무관한 고전값(출구 K = 1 은 Borda–Carnot 손실의 극한)
const CALC_FITTING_ENDS = { entrance: 0.5, exit: 1.0 };

Object.assign(window, { CALC_FITTINGS, CALC_FITTING_ENDS });
