// 계산기: 조절밸브 용량계수 Kv·Cv — IEC 60534-2-1 (= ISA-75.01.01) 의 식 체계(액체·기체, 초크 유동, 배관 형상계수 FP, 레이놀즈 계수 FR).
// 식은 표준 본문을 옮기지 않고 기호로만 적는다. 계수 N 은 표준의 SI 계열 값(kPa, m³/h, mm)이며 python `fluids`(MIT) 구현과 같은 값을 쓴다.
// 검증: `fluids` 문서가 재현한 IEC 예제 4개(test_calculators.cjs).

const CALC_CV = {
  N1: 0.1,          // m³/h, kPa
  N2: 1.6e-3,       // mm
  N4: 7.07e-2,      // m³/h, m²/s
  N5: 1.8e-3,       // mm
  N9: 24.6,         // m³/h, kPa, K — 표준 상태 0 °C, 101.325 kPa
  N18: 0.865,       // mm
  N32: 140,         // mm
  rho0: 999.1,      // kg/m³ — 15 °C 물
  cvPerKv: 1 / 0.865, // Cv = 1.156 Kv (US gal/min·psi ↔ m³/h·bar)
  maxIter: 30,
};

// 감속관·확대관 손실계수 합 Σζ = ζ₁ + ζ₂ + ζB1 − ζB2 (d = 밸브 지름, D1·D2 = 앞뒤 관 지름, 같은 단위)
function calcCvPipingLoss(d, D1, D2) {
  let loss = 0;
  if (D1) { const r2 = (d / D1) ** 2; loss += 0.5 * (1 - r2) ** 2 + (1 - r2 * r2); }
  if (D2) { const r2 = (d / D2) ** 2; loss += 1.0 * (1 - r2) ** 2 - (1 - r2 * r2); }
  return loss;
}

// 밸브 레이놀즈 수 Rev = N4·Fd·Q / (ν·√(C·FL)) · (FL²C²/(N2·D⁴) + 1)^¼   (Q m³/h, ν m²/s, D mm, C = Kv)
function calcCvReynolds(nu, Q, D1, FL, Fd, C) {
  return CALC_CV.N4 * Fd * Q / (nu * Math.sqrt(C * FL)) * Math.pow(FL * FL * C * C / (CALC_CV.N2 * D1 ** 4) + 1, 0.25);
}

// 레이놀즈 계수 FR — 전 트림과 축소 트림 식. d mm, C = Kv. reduced 를 안 주면 C/d² > 0.016·N18 일 때 축소 트림으로 본다.
function calcCvReynoldsFactor(FL, C, d, Rev, reduced = C / (d * d) > 0.016 * CALC_CV.N18) {
  const n = reduced ? 1 + CALC_CV.N32 * Math.pow(C / (d * d), 2 / 3) : CALC_CV.N2 / Math.min(C / (d * d), 0.04) ** 2;
  const lam = 0.026 / FL * Math.sqrt(n * Rev);
  const fr2 = reduced ? Math.min(lam, 1) : lam;
  if (Rev < 10) return fr2;
  const fr1 = 1 + 0.33 * Math.sqrt(FL) / Math.pow(n, 0.25) * Math.log10(Rev / 10000);
  return Math.min(fr1, fr2);
}

// 층류·천이(Rev ≤ 10 000): Ci = 1.3·C 에서 시작해 C/FR ≤ Ci 가 될 때까지 Ci 를 30 %씩 키운다.
function calcCvLaminar(C, ctx) {
  let Ci = 1.3 * C, FR = 1, Rev = 0;
  for (let i = 0; i < 200; i++) {
    Rev = calcCvReynolds(ctx.nu, ctx.Q, ctx.D1, ctx.FL, ctx.Fd, Ci);
    FR = calcCvReynoldsFactor(ctx.FL, Ci, ctx.d, Rev);
    if (C / FR < Ci) break;
    Ci *= 1.3;
  }
  return { C: Ci, FR, Rev };
}

// 액체 Kv. p: { Q m³/h, rho, Pv kPa, Pc kPa, P1 kPa, P2 kPa, FL, full, Fd, mu Pa·s, D1, D2, d (mm) }
function calcCvLiquid(p) {
  const dP = p.P1 - p.P2;
  const FF = 0.96 - 0.28 * Math.sqrt(p.Pv / p.Pc);
  const sg = p.rho / CALC_CV.rho0;
  const dpChokeBare = p.FL * p.FL * (p.P1 - FF * p.Pv);
  let choked = dP >= dpChokeBare;
  let C = choked ? p.Q / (CALC_CV.N1 * p.FL) * Math.sqrt(sg / (p.P1 - FF * p.Pv)) : p.Q / CALC_CV.N1 * Math.sqrt(sg / dP);
  const out = { FF, dpChoke: dpChokeBare, FP: 1, FR: 1, Rev: null, laminar: false };
  if (p.full) {
    const ctx = { nu: p.mu / p.rho, Q: p.Q, D1: p.D1, FL: p.FL, Fd: p.Fd, d: p.d };
    const Rev = calcCvReynolds(ctx.nu, p.Q, p.D1, p.FL, p.Fd, C);
    out.Rev = Rev;
    if (Rev > 10000 && (p.D1 !== p.d || p.D2 !== p.d)) {
      const loss = calcCvPipingLoss(p.d, p.D1, p.D2);
      const lossUp = p.d > p.D1 ? 0 : calcCvPipingLoss(p.d, p.D1, null);
      for (let i = 0; i < CALC_CV.maxIter; i++) {
        const Ci = C;
        const FP = 1 / Math.sqrt(1 + loss / CALC_CV.N2 * (Ci / (p.d * p.d)) ** 2);
        const FLP = p.FL / Math.sqrt(1 + p.FL * p.FL / CALC_CV.N2 * lossUp * (Ci / (p.d * p.d)) ** 2);
        const dpc = (FLP / FP) ** 2 * (p.P1 - FF * p.Pv);
        choked = dP >= dpc;
        C = choked ? p.Q / (CALC_CV.N1 * FLP) * Math.sqrt(sg / (p.P1 - FF * p.Pv)) : p.Q / (CALC_CV.N1 * FP) * Math.sqrt(sg / dP);
        Object.assign(out, { FP, FLP, dpChoke: dpc });
        if (Ci / C >= 0.99) break;
      }
    } else if (Rev <= 10000) {
      const lam = calcCvLaminar(C, ctx);
      Object.assign(out, { FR: lam.FR, Rev: lam.Rev, laminar: true });
      C = lam.C;
    }
  }
  return { ...out, Kv: C, choked };
}

// 기체 Kv. p: { Q m³/h(0 °C·101.325 kPa), M g/mol, T K, gamma, Z, xT, P1 kPa, P2 kPa, full, FL, Fd, mu, D1, D2, d (mm) }
function calcCvGas(p) {
  const x = (p.P1 - p.P2) / p.P1;
  const Fg = p.gamma / 1.4;
  const Y = Math.max(1 - x / (3 * Fg * p.xT), 2 / 3);
  let choked = x >= Fg * p.xT;
  const base = (xs, FP = 1) => p.Q / (CALC_CV.N9 * FP * p.P1 * Y) * Math.sqrt(p.M * p.T * p.Z / xs);
  let C = base(choked ? Fg * p.xT : x);
  const out = { x, Fg, Y, xChoke: Fg * p.xT, FP: 1, FR: 1, Rev: null, laminar: false };
  if (p.full) {
    const rho1 = p.M * 1e-3 * p.P1 * 1000 / (p.Z * CALC_CONST.R * p.T);
    const ctx = { nu: p.mu / rho1, Q: p.Q, D1: p.D1, FL: p.FL, Fd: p.Fd, d: p.d };
    const Rev = calcCvReynolds(ctx.nu, p.Q, p.D1, p.FL, p.Fd, C);
    out.Rev = Rev;
    if (Rev > 10000 && (p.D1 !== p.d || p.D2 !== p.d)) {
      const loss = calcCvPipingLoss(p.d, p.D1, p.D2);
      const lossUp = calcCvPipingLoss(p.d, p.D1, null);
      for (let i = 0; i < CALC_CV.maxIter; i++) {
        const Ci = C;
        const FP = 1 / Math.sqrt(1 + loss / CALC_CV.N2 * (Ci / (p.d * p.d)) ** 2);
        const xTP = p.xT / (FP * FP) / (1 + p.xT * lossUp / CALC_CV.N5 * (Ci / (p.d * p.d)) ** 2);
        choked = x >= Fg * xTP;
        C = base(choked ? Fg * xTP : x, FP);
        Object.assign(out, { FP, xTP, xChoke: Fg * xTP });
        if (Ci / C >= 0.99) break;
      }
    } else if (Rev <= 10000) {
      const lam = calcCvLaminar(C, ctx);
      Object.assign(out, { FR: lam.FR, Rev: lam.Rev, laminar: true });
      C = lam.C;
    }
  }
  return { ...out, Kv: C, choked };
}

// 표준 상태(0 °C, 101.325 kPa) 기체 몰부피로 질량 유량 → 표준 부피 유량. W kg/h, M g/mol → m³/h
function calcCvStdFlowFromMass(W, M) {
  return W / (M * 1e-3) * CALC_CONST.R * 273.15 / CALC_CONST.atm;
}

const calcCvIsLiquid = v => v.phase === "liquid";
const calcCvIsGas = v => v.phase === "gas";
const calcCvIsFull = v => v.detail === "full";

const CALC_DEF_CONTROL_VALVE = {
  key: "control_valve",
  group: "sizing",
  title: tr("조절밸브 Cv · Kv (IEC 60534-2-1)", "Control valve Cv · Kv (IEC 60534-2-1)"),
  summary: tr("액체·기체 조절밸브의 필요 용량계수 Kv·Cv 를 IEC 60534-2-1 식 체계로 구합니다. 초크 유동(FL·FF, xT·Fγ), 팽창계수 Y, 앞뒤 감속관의 배관 형상계수 FP, 점성 유동의 레이놀즈 계수 FR 을 반영합니다.",
    "Sizes the required flow coefficient Kv / Cv of a liquid or gas control valve with the IEC 60534-2-1 equations: choked flow (FL·FF, xT·Fγ), the expansion factor Y, the piping geometry factor FP for attached reducers, and the Reynolds-number factor FR for viscous flow."),
  inputs: [
    { key: "phase", type: "choice", label: tr("유체", "Fluid"), default: "liquid",
      options: [{ v: "liquid", label: tr("액체", "Liquid") }, { v: "gas", label: tr("기체·증기", "Gas / vapour") }] },
    { key: "detail", type: "choice", term: "piping_geometry_factor", label: tr("계산 범위", "Scope"), default: "full",
      options: [{ v: "full", label: tr("감속관·점성 보정 포함", "With reducers and viscous correction") }, { v: "basic", label: tr("난류·감속관 없음", "Turbulent, no reducers") }] },
    { key: "Ql", label: tr("액체 유량 Q", "Liquid flow Q"), dim: "flow", unit: "m3s", show: "m3h", default: 360, positive: true, when: calcCvIsLiquid },
    { key: "rho", term: "density", label: tr("입구 밀도 ρ₁", "Inlet density ρ₁"), dim: "density", unit: "kgm3", show: "kgm3", default: 965.4, positive: true, when: calcCvIsLiquid },
    { key: "Pv", term: "vapor_pressure", label: tr("입구 온도의 증기압 Pv", "Vapour pressure at inlet temperature Pv"), dim: "pressure", unit: "Pa", show: "kPa", default: 70.1, min: 0, when: calcCvIsLiquid },
    { key: "Pc", term: "critical_point", label: tr("임계 압력 Pc", "Critical pressure Pc"), dim: "pressure", unit: "Pa", show: "kPa", default: 22120, positive: true, when: calcCvIsLiquid,
      hint: tr("물 22 064 kPa(IAPWS). 예제 1·2 는 22 120 kPa 를 씁니다.", "Water 22 064 kPa (IAPWS). Worked examples 1 and 2 use 22 120 kPa.") },
    { key: "gasflow", type: "choice", label: tr("기체 유량 입력", "Gas flow input"), default: "std", when: calcCvIsGas,
      options: [{ v: "std", label: tr("표준 부피 (0 °C, 1 atm)", "Standard volume (0 °C, 1 atm)") }, { v: "mass", label: tr("질량 유량", "Mass flow") }] },
    { key: "Qn", label: tr("표준 부피 유량 Q_N (0 °C, 101.325 kPa)", "Standard volumetric flow Q_N (0 °C, 101.325 kPa)"), dim: "flow", unit: "m3s", show: "m3h", default: 3800, positive: true,
      when: v => calcCvIsGas(v) && v.gasflow === "std" },
    { key: "W", term: "mass_flow", label: tr("질량 유량 W", "Mass flow W"), dim: "massflow", unit: "kgs", show: "kgh", default: 7462, positive: true,
      when: v => calcCvIsGas(v) && v.gasflow === "mass" },
    { key: "M", term: "molar_mass", label: tr("분자량 M", "Molar mass M"), unit: "g/mol", default: 44.01, positive: true, when: calcCvIsGas },
    { key: "T", term: "absolute_temperature", label: tr("입구 온도 T₁", "Inlet temperature T₁"), dim: "temperature", unit: "K", show: "C", default: 159.85, positive: true, when: calcCvIsGas },
    { key: "gamma", term: "heat_capacity_ratio", label: tr("비열비 γ", "Specific heat ratio γ"), unit: "—", default: 1.3, positive: true, when: calcCvIsGas },
    { key: "Z", term: "compressibility", label: tr("입구 압축인자 Z", "Inlet compressibility factor Z"), unit: "—", default: 0.988, positive: true, when: calcCvIsGas },
    { key: "P1", term: "absolute_pressure", label: tr("입구 압력 P₁ (절대)", "Inlet pressure P₁ (absolute)"), dim: "pressure", unit: "Pa", show: "kPa", default: 680, positive: true },
    { key: "P2", label: tr("출구 압력 P₂ (절대)", "Outlet pressure P₂ (absolute)"), dim: "pressure", unit: "Pa", show: "kPa", default: 220, min: 0 },
    { key: "FL", term: "valve_fl", label: tr("압력 회복 계수 FL", "Liquid pressure recovery factor FL"), unit: "—", default: 0.9, positive: true, max: 1,
      when: v => calcCvIsLiquid(v) || calcCvIsFull(v), hint: tr("밸브 제조사 자료의 값(정격 개도)을 넣으십시오.", "Use the valve vendor's value at the rated opening.") },
    { key: "xT", term: "valve_xt", label: tr("초크 차압비 계수 xT", "Choked pressure-drop ratio factor xT"), unit: "—", default: 0.6, positive: true, max: 1, when: calcCvIsGas,
      hint: tr("밸브 제조사 자료의 값을 넣으십시오.", "Use the valve vendor's value.") },
    { key: "Fd", term: "valve_fd", label: tr("밸브 형식 계수 Fd", "Valve style modifier Fd"), unit: "—", default: 0.46, positive: true, max: 1, when: calcCvIsFull },
    { key: "mu", term: "viscosity", label: tr("입구 점도 μ", "Inlet viscosity μ"), dim: "viscosity", unit: "Pas", show: "cP", default: 0.31472, positive: true, when: calcCvIsFull },
    { key: "D1", label: tr("앞 관 안지름 D₁", "Upstream pipe diameter D₁"), dim: "length", unit: "m", show: "mm", default: 150, positive: true, when: calcCvIsFull },
    { key: "D2", label: tr("뒤 관 안지름 D₂", "Downstream pipe diameter D₂"), dim: "length", unit: "m", show: "mm", default: 150, positive: true, when: calcCvIsFull },
    { key: "d", label: tr("밸브 호칭 지름 d", "Valve size d"), dim: "length", unit: "m", show: "mm", default: 150, positive: true, when: calcCvIsFull },
    { key: "Cvr", label: tr("고른 밸브의 정격 Cv (선택)", "Rated Cv of the chosen valve (optional)"), unit: "—", default: "", positive: true, optional: true },
  ],
  outputs: [
    { key: "Kv", label: tr("필요 Kv", "Required Kv"), unit: "m³/h" },
    { key: "Cv", label: tr("필요 Cv", "Required Cv"), unit: "—" },
    { key: "pct", label: tr("정격 Cv 대비", "Of rated Cv"), unit: "%" },
    { key: "state", term: "choked_flow_valve", label: tr("흐름 상태", "Flow condition"), type: "text" },
    { key: "dpChoke", label: tr("초크 시작 차압 Δp_choked", "Choked pressure drop Δp_choked"), dim: "pressure", unit: "Pa", show: "kPa" },
    { key: "FF", term: "valve_ff", label: tr("액체 임계 압력비 계수 FF", "Liquid critical pressure ratio factor FF"), unit: "—" },
    { key: "x", label: tr("차압비 x = Δp/P₁", "Pressure-drop ratio x = Δp/P₁"), unit: "—" },
    { key: "xChoke", label: tr("초크 차압비 Fγ·xT(P)", "Choked pressure-drop ratio Fγ·xT(P)"), unit: "—" },
    { key: "Y", term: "expansion_factor", label: tr("팽창 계수 Y", "Expansion factor Y"), unit: "—" },
    { key: "FP", term: "piping_geometry_factor", label: tr("배관 형상계수 FP", "Piping geometry factor FP"), unit: "—" },
    { key: "FR", label: tr("레이놀즈 계수 FR", "Reynolds-number factor FR"), unit: "—" },
    { key: "Rev", term: "reynolds", label: tr("밸브 레이놀즈 수 Rev", "Valve Reynolds number Rev"), unit: "—" },
  ],
  compute(v) {
    if (!(v.P2 < v.P1)) return { error: tr("출구 압력은 입구 압력보다 낮아야 합니다.", "The outlet pressure must be lower than the inlet pressure.") };
    const full = calcCvIsFull(v);
    const geo = full ? { full, Fd: v.Fd, mu: v.mu, D1: v.D1 * 1000, D2: v.D2 * 1000, d: v.d * 1000, FL: v.FL } : { full };
    if (full && (v.d > v.D1 * 1.0001 || v.d > v.D2 * 1.0001))
      return { error: tr("밸브 지름 d 는 앞뒤 관 지름보다 클 수 없습니다(감속관만 다룹니다).", "The valve size d cannot exceed the pipe diameters (only reducers are handled).") };
    const P1 = v.P1 / 1000, P2 = v.P2 / 1000;
    const warnings = [];
    let r;
    if (calcCvIsLiquid(v)) {
      if (v.Pv >= v.Pc) return { error: tr("증기압이 임계 압력 이상입니다.", "The vapour pressure is at or above the critical pressure.") };
      if (v.Pv >= v.P1) return { error: tr("입구 압력이 증기압 이하입니다. 입구에서 이미 끓습니다.", "The inlet pressure is at or below the vapour pressure: the liquid is already boiling at the inlet.") };
      r = calcCvLiquid({ ...geo, Q: v.Ql * 3600, rho: v.rho, Pv: v.Pv / 1000, Pc: v.Pc / 1000, P1, P2, FL: v.FL });
      if (r.choked) warnings.push(v.P2 <= v.Pv
        ? tr("초크 유동이며 출구 압력이 증기압 이하입니다(플래싱). 출구 쪽 침식과 2상 흐름을 검토하십시오.", "Choked flow with the outlet pressure at or below the vapour pressure (flashing). Review outlet erosion and two-phase flow.")
        : tr("초크 유동입니다(심한 공동현상). 차압을 더 키워도 유량이 늘지 않습니다. 저소음·내공동 트림을 검토하십시오.", "Choked flow (fully developed cavitation). More pressure drop does not raise the flow. Consider anti-cavitation trim."));
    } else {
      const Q = v.gasflow === "mass" ? calcCvStdFlowFromMass(v.W * 3600, v.M) : v.Qn * 3600;
      r = calcCvGas({ ...geo, Q, M: v.M, T: v.T, gamma: v.gamma, Z: v.Z, xT: v.xT, P1, P2, FL: v.FL });
      if (r.choked) warnings.push(tr("초크(임계) 유동입니다. x 를 Fγ·xT 로 묶어 계산했습니다.", "Choked (critical) flow: x was limited to Fγ·xT."));
    }
    if (r.laminar) warnings.push(tr("밸브 레이놀즈 수가 10 000 이하라 점성(층류·천이) 보정 FR 을 썼습니다. 감속관 보정은 이 영역에서 쓰지 않습니다.", "The valve Reynolds number is 10 000 or less, so the viscous (laminar/transitional) factor FR was applied. Reducer corrections are not used in this regime."));
    const Cv = r.Kv * CALC_CV.cvPerKv;
    const out = {
      Kv: r.Kv, Cv, state: r.choked ? tr("초크 유동", "Choked") : tr("초크 아님", "Not choked"),
      FP: full && !r.laminar ? r.FP : null, FR: r.laminar ? r.FR : null, Rev: r.Rev, warnings,
    };
    if (v.Cvr) {
      out.pct = 100 * Cv / v.Cvr;
      if (out.pct > 90) warnings.push(tr("필요 Cv 가 정격의 90 % 를 넘습니다. 한 치수 큰 밸브를 검토하십시오.", "The required Cv exceeds 90 % of rated. Consider the next valve size."));
      else if (out.pct < 10) warnings.push(tr("필요 Cv 가 정격의 10 % 미만입니다. 작은 개도에서 제어성이 나쁠 수 있습니다.", "The required Cv is below 10 % of rated. Control may be poor at small openings."));
    }
    if (calcCvIsLiquid(v)) Object.assign(out, { FF: r.FF, dpChoke: r.dpChoke * 1000 });
    else Object.assign(out, { x: r.x, xChoke: r.xChoke, Y: r.Y });
    return out;
  },
  // 같은 밸브(구한 Kv, FP 같다고 봄)에서 Δp 를 바꿀 때의 유량 — 초크 차압 위로는 평탄
  chart(v, o) {
    const P1 = v.P1 / 1000;
    const FP = o.FR || o.FP || 1;   // 점성 영역이면 FR, 감속관이면 FP
    if (calcCvIsLiquid(v)) {
      const sg = v.rho / CALC_CV.rho0;
      const dpc = o.dpChoke / 1000;
      const top = Math.max(P1 - v.Pv / 1000, (P1 - v.P2 / 1000) * 1.2);
      const pts = calcLinspace(0, top, 61).map(dp => [dp, CALC_CV.N1 * FP * o.Kv * Math.sqrt(Math.min(dp, dpc) / sg)]);
      return {
        x: { label: tr("밸브 차압 Δp", "Valve pressure drop Δp"), unit: "kPa", min: 0 },
        y: { label: tr("유량 Q", "Flow Q"), unit: "m³/h", min: 0 },
        series: [{ key: "q", label: tr("같은 Kv 에서 Q(Δp)", "Q(Δp) at this Kv"), points: pts }],
        vlines: [{ x: dpc, label: tr("초크 시작", "Choked onset") }],
        markers: [{ x: P1 - v.P2 / 1000, y: v.Ql * 3600, label: tr("설계점", "Design point") }],
        ariaLabel: tr("차압에 따른 액체 유량과 초크 평탄부", "Liquid flow versus pressure drop with the choked plateau"),
      };
    }
    const Fg = v.gamma / 1.4, xT = o.xChoke / Fg;
    const T = v.T, M = v.M, Z = v.Z;
    const pts = calcLinspace(0, Math.min(1, Math.max(o.xChoke, o.x) * 1.4), 61).map(x => {
      const xs = Math.min(x, o.xChoke);
      const Y = Math.max(1 - xs / (3 * Fg * xT), 2 / 3);
      return [x, CALC_CV.N9 * FP * o.Kv * P1 * Y * Math.sqrt(xs / (M * T * Z))];
    });
    const qDesign = v.gasflow === "mass" ? calcCvStdFlowFromMass(v.W * 3600, v.M) : v.Qn * 3600;
    return {
      x: { label: tr("차압비 x = Δp/P₁", "Pressure-drop ratio x = Δp/P₁"), unit: "—", min: 0 },
      y: { label: tr("표준 부피 유량 Q_N", "Standard flow Q_N"), unit: "m³/h", min: 0 },
      series: [{ key: "q", label: tr("같은 Kv 에서 Q(x)", "Q(x) at this Kv"), points: pts }],
      vlines: [{ x: o.xChoke, label: "Fγ·xT" }],
      markers: [{ x: o.x, y: qDesign, label: tr("설계점", "Design point") }],
      ariaLabel: tr("차압비에 따른 기체 유량과 초크 평탄부", "Gas flow versus pressure-drop ratio with the choked plateau"),
    };
  },
  formula: [
    tr("액체: Kv = (Q/N1)·√((ρ₁/ρ₀)/Δp),  초크면 Δp → Δp_choked = FL²·(P₁ − FF·Pv)", "Liquid: Kv = (Q/N1)·√((ρ₁/ρ₀)/Δp); if choked Δp → Δp_choked = FL²·(P₁ − FF·Pv)"),
    "FF = 0.96 − 0.28·√(Pv/Pc)",
    tr("기체: Kv = Q_N / (N9·FP·P₁·Y) · √(M·T₁·Z/x),  x ≤ Fγ·xT,  Fγ = γ/1.4", "Gas: Kv = Q_N / (N9·FP·P₁·Y) · √(M·T₁·Z/x), with x ≤ Fγ·xT and Fγ = γ/1.4"),
    "Y = 1 − x/(3·Fγ·xT)  (≥ 2/3)",
    tr("감속관: FP = [1 + Σζ/N2·(C/d²)²]^−½,  FLP·xTP 는 입구쪽 ζ₁ + ζB1 로 보정, C 를 반복", "Reducers: FP = [1 + Σζ/N2·(C/d²)²]^−½; FLP and xTP use the inlet ζ₁ + ζB1; iterate on C"),
    tr("점성: Rev = N4·Fd·Q/(ν√(C·FL))·(FL²C²/(N2·D⁴) + 1)^¼,  Rev ≤ 10⁴ 이면 FR 로 C 를 키움", "Viscous: Rev = N4·Fd·Q/(ν√(C·FL))·(FL²C²/(N2·D⁴) + 1)^¼; if Rev ≤ 10⁴ C is raised with FR"),
    "N1 = 0.1, N2 = 1.6×10⁻³, N4 = 7.07×10⁻², N5 = 1.8×10⁻³, N9 = 24.6 (kPa, m³/h, mm, K),  Cv = 1.156·Kv",
  ],
  notes: [
    tr("압력은 모두 절대압입니다. FL·xT·Fd 는 밸브 형식과 개도마다 다르므로 제조사 자료 값을 쓰십시오. 표준의 계수 표는 옮기지 않았습니다.",
      "All pressures are absolute. FL, xT and Fd depend on valve style and opening, so use the vendor's data; the standard's coefficient tables are not reproduced here."),
    tr("기체 표준 유량은 0 °C, 101.325 kPa 기준(N9 = 24.6)입니다. 질량 유량은 이상기체 표준 몰부피로 바꿉니다. 점성 영역의 Rev 는 `fluids` 구현과 같게 표준 유량으로 셉니다.",
      "Gas standard flow is referred to 0 °C and 101.325 kPa (N9 = 24.6). Mass flow is converted with the ideal-gas standard molar volume. In the viscous regime Rev uses the standard flow, as in the `fluids` implementation."),
    tr("2상·슬러리·비뉴턴 유체는 이 식의 범위 밖입니다. 소음·공동현상 지수 평가는 하지 않습니다. 참고용 사전 검토 값입니다.",
      "Two-phase flow, slurries and non-Newtonian fluids are outside the scope of these equations. Noise and cavitation-index checks are not included. Use the result for preliminary review only."),
  ],
  reference: [
    tr("IEC 60534-2-1:2011 Industrial-process control valves — Part 2-1: Flow capacity — Sizing equations for fluid flow under installed conditions (식 체계만 인용, 본문·표 미복제)",
      "IEC 60534-2-1:2011 Industrial-process control valves — Part 2-1: Flow capacity — Sizing equations for fluid flow under installed conditions (equations cited; text and tables not reproduced)"),
    "ANSI/ISA-75.01.01-2007 (60534-2-1 Mod) Flow Equations for Sizing Control Valves.",
    tr("Bell, C. et al. fluids — fluids.control_valve (MIT). IEC 예제 1–4 재현값: https://fluids.readthedocs.io/fluids.control_valve.html", "Bell, C. et al. fluids — fluids.control_valve (MIT). IEC examples 1–4 reproduced at https://fluids.readthedocs.io/fluids.control_valve.html"),
    "Emerson Automation Solutions (2017). Control Valve Handbook, 5th ed., Ch. 5 Valve sizing.",
  ],
};

Object.assign(window, { CALC_DEF_CONTROL_VALVE, CALC_CV, calcCvLiquid, calcCvGas, calcCvPipingLoss, calcCvReynoldsFactor, calcCvStdFlowFromMass });
