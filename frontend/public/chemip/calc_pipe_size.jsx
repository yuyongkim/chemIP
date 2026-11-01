// 계산기: 유속 기준 배관 지름 D = √(4Q / (π v)) — 목표 유속으로 필요 안지름, 실제 안지름의 유속.

const CALC_DEF_PIPE_SIZE = {
  key: "pipe_size",
  group: "fluid",
  title: tr("배관 지름 (유속 기준)", "Pipe sizing by velocity"),
  summary: tr("유량과 목표 유속으로 필요한 배관 안지름을 구합니다. 고른 관의 안지름을 넣으면 실제 유속도 봅니다.", "Finds the required pipe inside diameter from the flow rate and a target velocity. Enter the inside diameter of a chosen pipe to see its actual velocity."),
  inputs: [
    { key: "Q", label: tr("부피 유량 Q", "Volumetric flow Q"), dim: "flow", unit: "m3s", show: "m3h", default: 50, positive: true },
    { key: "v", label: tr("목표 유속 v", "Target velocity v"), term: "design_velocity", dim: "velocity", unit: "ms", show: "ms", default: 2, positive: true,
      hint: tr("펌프 토출 액체 1–3 m/s, 기체·증기 15–30 m/s (Sinnott)", "Pump discharge liquids 1–3 m/s, gases and vapors 15–30 m/s (Sinnott)") },
    { key: "Di", label: tr("고른 관 안지름 (선택)", "Chosen pipe inside diameter (optional)"), dim: "length", unit: "m", show: "mm", default: "", optional: true, positive: true },
  ],
  outputs: [
    { key: "D", label: tr("필요 안지름 D", "Required inside diameter D"), dim: "length", unit: "m", show: "mm" },
    { key: "A", label: tr("필요 단면적", "Required flow area"), dim: "area", unit: "m2", show: "cm2" },
    { key: "vAct", label: tr("고른 관의 유속", "Velocity in chosen pipe"), dim: "velocity", unit: "ms", show: "ms" },
  ],
  compute(v) {
    const A = v.Q / v.v;
    const D = Math.sqrt(4 * A / Math.PI);
    const vAct = v.Di ? v.Q / (Math.PI * v.Di * v.Di / 4) : undefined;
    const warnings = v.Di && v.Di < D ? [tr("고른 관이 필요 안지름보다 가늘어 목표 유속을 넘습니다.", "The chosen pipe is smaller than the required diameter, so the velocity exceeds the target.")] : [];
    return { D, A, vAct, warnings };
  },
  formula: ["A = Q / v,   D = √( 4 Q / (π v) )", tr("v_실제 = Q / (π D_i² / 4)", "v_actual = Q / (π D_i² / 4)")],
  notes: [
    tr("대표 유속(Sinnott): 펌프로 보내는 액체(점도 낮음) 1–3 m/s, 중력 흐름 액체 약 0.5 m/s, 기체·증기 15–30 m/s, 고압 증기(8 bar 초과) 30–60 m/s. 펌프 흡입 쪽은 더 낮게 잡습니다.", "Typical velocities (Sinnott): pumped low-viscosity liquids 1–3 m/s, gravity-flow liquids about 0.5 m/s, gases and vapors 15–30 m/s, high-pressure steam (above 8 bar) 30–60 m/s. Use lower values on pump suction lines."),
    tr("유속 기준은 첫 어림입니다. 압력손실(배관 압력손실 계산기)·NPSH·침식·소음으로 다시 확인하고 규격 관(KS D 3562, ASME B36.10M 스케줄)의 안지름을 고릅니다.", "Velocity-based sizing is a first estimate. Recheck pressure drop (pipe pressure drop calculator), NPSH, erosion and noise, then pick the inside diameter of a standard pipe (KS D 3562, ASME B36.10M schedules)."),
  ],
  reference: [
    tr("Sinnott, R.K., Coulson & Richardson's Chemical Engineering Vol. 6: Chemical Engineering Design 4판(2005), 5장 배관과 펌프 — 대표 배관 유속", "Sinnott, R.K., Coulson & Richardson's Chemical Engineering Vol. 6: Chemical Engineering Design, 4th ed. (2005), Ch. 5 Piping and Pumps — typical pipe velocities"),
    tr("Perry's Chemical Engineers' Handbook 8판(2008), 6절 — 연속식 Q = v·A", "Perry's Chemical Engineers' Handbook, 8th ed. (2008), Sec. 6 — continuity equation Q = v·A"),
  ],
};

Object.assign(window, { CALC_DEF_PIPE_SIZE });
