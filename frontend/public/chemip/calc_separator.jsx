// 계산기: 기액분리기(녹아웃 드럼) 지름 — Souders–Brown 허용 기체 속도, 세운 형·눕힌 형, 액 체류 시간.
// K 는 사용자가 넣거나 York 데미스터 상관식(Svrcek & Monnery 1993 이 실은 압력 상관식)을 쓴다. GPSA·API 12J 표는 옮기지 않는다.
// 공정 사이징(지름·길이)까지만 한다. 동체 두께 등 기계 설계는 EPC 도구의 몫이다.

const CALC_FT = 0.3048;
const CALC_PSI = 6894.757293168;
const CALC_SEP_HORIZ_FACTOR = 1.25;     // 눕힌 형 K = 세운 형 × 1.25 (Watkins 1967 권고, `fluids` 와 같음)

// York 데미스터 K [m/s] — P [Pa]. 1–15 psia: 0.1821 + 0.0029P + 0.046 ln P, 15–40: 0.35, 40–5500: 0.430 − 0.023 ln P (ft/s)
function calcSepKYork(P, horizontal = false) {
  let p = Math.min(Math.max(P / CALC_PSI, 1), 5500);
  const K = p < 15 ? 0.1821 + 0.0029 * p + 0.0460 * Math.log(p) : p < 40 ? 0.35 : 0.430 - 0.023 * Math.log(p);
  return K * CALC_FT * (horizontal ? CALC_SEP_HORIZ_FACTOR : 1);
}

// Souders–Brown v_max = K·√((ρl − ρg)/ρg)
function calcSouders(K, rhol, rhog) {
  return K * Math.sqrt((rhol - rhog) / rhog);
}

// 원 단면에서 높이 h(지름 D) 아래 활꼴 넓이 비 φ(h/D) — 눕힌 형 액 단면 비
function calcSegmentFraction(hD) {
  const t = 2 * Math.acos(1 - 2 * hD);
  return (t - Math.sin(t)) / (2 * Math.PI);
}

const calcSepIsH = v => v.orient === "horizontal";

const CALC_DEF_SEPARATOR = {
  key: "separator",
  group: "sizing",
  title: tr("기액분리기 지름 (Souders–Brown)", "Gas–liquid separator diameter (Souders–Brown)"),
  summary: tr("세운 형·눕힌 형 기액분리기(녹아웃 드럼)의 최소 지름을 Souders–Brown 허용 기체 속도와 액 체류 시간으로 구합니다. 참고용 사전 검토 값이며 동체 두께 등 기계 설계는 하지 않습니다.",
    "Finds the minimum diameter of a vertical or horizontal gas–liquid separator (knock-out drum) from the Souders–Brown allowable gas velocity and the liquid hold-up time. A preliminary screening value; mechanical design such as wall thickness is not included."),
  inputs: [
    { key: "orient", type: "choice", label: tr("형식", "Orientation"), default: "vertical",
      options: [{ v: "vertical", label: tr("세운 형", "Vertical") }, { v: "horizontal", label: tr("눕힌 형", "Horizontal") }] },
    { key: "Qg", label: tr("기체 유량 (운전 조건 실부피)", "Gas flow (actual volume at operating conditions)"), dim: "flow", unit: "m3s", show: "m3h", default: 3600, positive: true },
    { key: "rhog", term: "density", label: tr("기체 밀도 ρg", "Gas density ρg"), dim: "density", unit: "kgm3", show: "kgm3", default: 12, positive: true },
    { key: "Ql", label: tr("액체 유량", "Liquid flow"), dim: "flow", unit: "m3s", show: "m3h", default: 10, min: 0 },
    { key: "rhol", term: "density", label: tr("액체 밀도 ρl", "Liquid density ρl"), dim: "density", unit: "kgm3", show: "kgm3", default: 700, positive: true },
    { key: "kmode", type: "choice", term: "souders_brown_k", label: tr("K 값", "K factor"), default: "user",
      options: [{ v: "user", label: tr("직접 입력", "Enter") }, { v: "york", label: tr("York 상관식 (데미스터, 압력 함수)", "York correlation (mesh pad, function of pressure)") }] },
    { key: "K", term: "souders_brown_k", label: tr("Souders–Brown K", "Souders–Brown K"), dim: "velocity", unit: "ms", show: "ms", default: 0.107, positive: true, when: v => v.kmode === "user",
      hint: tr("문헌에 흔히 인용되는 범위(참고): 세운 형 + 메시 데미스터 약 0.055–0.107 m/s(0.18–0.35 ft/s), 데미스터가 없으면 그 절반 정도. 제조사·사내 기준을 우선하십시오.",
        "Commonly quoted ranges (reference only): vertical with mesh pad about 0.055–0.107 m/s (0.18–0.35 ft/s); roughly half without a mist eliminator. Vendor or company standards take precedence.") },
    { key: "P", term: "absolute_pressure", label: tr("운전 압력 (절대)", "Operating pressure (absolute)"), dim: "pressure", unit: "Pa", show: "bar", default: 10, positive: true, when: v => v.kmode === "york" },
    { key: "th", term: "holdup_time", label: tr("액 체류 시간", "Liquid hold-up time"), dim: "time", unit: "s", show: "min", default: 5, min: 0 },
    { key: "LD", label: tr("길이/지름 비 L/D", "Length-to-diameter ratio L/D"), unit: "—", default: 3, min: 1, max: 8, when: calcSepIsH },
    { key: "hl", label: tr("정상 액위 h/D", "Normal liquid level h/D"), unit: "—", default: 0.5, min: 0.1, max: 0.8, when: calcSepIsH },
  ],
  outputs: [
    { key: "D", label: tr("필요 최소 지름 D", "Required minimum diameter D"), dim: "length", unit: "m", show: "m" },
    { key: "governs", label: tr("지름을 정한 조건", "Governing condition"), type: "text" },
    { key: "vmax", term: "souders_brown_k", label: tr("허용 기체 속도 v_max", "Allowable gas velocity v_max"), dim: "velocity", unit: "ms", show: "ms" },
    { key: "Kused", term: "souders_brown_k", label: tr("쓴 K", "K used"), dim: "velocity", unit: "ms", show: "ms" },
    { key: "Dgas", label: tr("기체 조건 지름", "Diameter from gas load"), dim: "length", unit: "m", show: "m" },
    { key: "Dliq", label: tr("액 체류 조건 지름", "Diameter from liquid hold-up"), dim: "length", unit: "m", show: "m" },
    { key: "hliq", term: "liquid_level", label: tr("체류 액 높이 (세운 형)", "Hold-up liquid height (vertical)"), dim: "length", unit: "m", show: "m" },
    { key: "L", label: tr("동체 길이 L (눕힌 형)", "Shell length L (horizontal)"), dim: "length", unit: "m", show: "m" },
    { key: "vg", label: tr("이 지름에서 기체 속도", "Gas velocity at this diameter"), dim: "velocity", unit: "ms", show: "ms" },
  ],
  compute(v) {
    if (!(v.rhol > v.rhog)) return { error: tr("액체 밀도가 기체 밀도보다 커야 합니다.", "The liquid density must exceed the gas density.") };
    const H = calcSepIsH(v);
    const K = v.kmode === "york" ? calcSepKYork(v.P, H) : v.K;
    const vmax = calcSouders(K, v.rhol, v.rhog);
    const Vl = v.Ql * v.th;
    const warnings = [];
    const out = { vmax, Kused: K, warnings };
    if (!H) {
      const D = Math.sqrt(4 * v.Qg / (Math.PI * vmax));
      Object.assign(out, { D, Dgas: D, governs: tr("기체 속도 (Souders–Brown)", "Gas velocity (Souders–Brown)"), hliq: Vl / (Math.PI * D * D / 4), vg: v.Qg / (Math.PI * D * D / 4) });
      if (out.hliq > 2 * D) warnings.push(tr("체류 액 높이가 지름의 2 배를 넘습니다. 눕힌 형이나 더 큰 지름이 나을 수 있습니다.", "The hold-up liquid height exceeds twice the diameter; a horizontal drum or a larger diameter may suit better."));
    } else {
      const phi = calcSegmentFraction(v.hl);
      const Dgas = Math.sqrt(4 * v.Qg / (Math.PI * vmax * (1 - phi)));
      const Dliq = Vl > 0 ? Math.cbrt(4 * Vl / (Math.PI * phi * v.LD)) : 0;
      const D = Math.max(Dgas, Dliq);
      Object.assign(out, {
        D, Dgas, Dliq, L: v.LD * D, vg: v.Qg / (Math.PI * D * D / 4 * (1 - phi)),
        governs: Dgas >= Dliq ? tr("기체 속도 (Souders–Brown)", "Gas velocity (Souders–Brown)") : tr("액 체류 시간", "Liquid hold-up time"),
      });
    }
    if (v.kmode === "user" && K > 0.15) warnings.push(tr("K 가 0.15 m/s 를 넘습니다. 흔히 인용되는 범위보다 큽니다(비말 동반 우려).", "K exceeds 0.15 m/s, above commonly quoted ranges (risk of liquid carry-over)."));
    return out;
  },
  chart(v, o) {
    const H = calcSepIsH(v);
    const phi = H ? calcSegmentFraction(v.hl) : 0;
    const Ds = calcLinspace(o.D * 0.5, o.D * 1.8, 41);
    return {
      x: { label: tr("지름 D", "Diameter D"), unit: "m", min: 0 },
      y: { label: tr("기체 속도", "Gas velocity"), unit: "m/s", min: 0 },
      series: [{ key: "vg", label: tr("기체 속도 (지름별)", "Gas velocity vs diameter"), points: Ds.map(D => [D, v.Qg / (Math.PI * D * D / 4 * (1 - phi))]) }],
      hlines: [{ y: o.vmax, label: "v_max" }],
      markers: [{ x: o.D, y: o.vg, label: `D = ${calcFormatNumber(o.D, 3)} m` }],
      ariaLabel: tr("지름에 따른 기체 속도와 허용 속도", "Gas velocity versus diameter with the allowable velocity"),
    };
  },
  formula: [
    "v_max = K·√((ρl − ρg)/ρg)   (Souders & Brown 1934)",
    tr("세운 형: D = √(4·Q_g / (π·v_max)),  체류 액 높이 = Q_l·t / (πD²/4)", "Vertical: D = √(4·Q_g / (π·v_max)); hold-up height = Q_l·t / (πD²/4)"),
    tr("눕힌 형: 기체 단면 = (1 − φ)·πD²/4 ≥ Q_g/v_max,  액 부피 φ·πD²/4·L ≥ Q_l·t,  L = (L/D)·D", "Horizontal: gas area (1 − φ)·πD²/4 ≥ Q_g/v_max; liquid volume φ·πD²/4·L ≥ Q_l·t; L = (L/D)·D"),
    tr("φ(h/D) = (θ − sin θ)/(2π),  θ = 2·arccos(1 − 2h/D)", "φ(h/D) = (θ − sin θ)/(2π), θ = 2·arccos(1 − 2h/D)"),
    tr("York 상관식(psia, ft/s): 1–15: 0.1821 + 0.0029P + 0.046 ln P;  15–40: 0.35;  40–5500: 0.430 − 0.023 ln P.  눕힌 형 ×1.25", "York correlation (psia, ft/s): 1–15: 0.1821 + 0.0029P + 0.046 ln P; 15–40: 0.35; 40–5500: 0.430 − 0.023 ln P. Horizontal ×1.25"),
  ],
  notes: [
    tr("참고용 사전 검토 값입니다. 입구 장치·데미스터 위 여유 높이·경보 액위 사이 체류 시간·서지 용량은 사내 기준과 공급사 자료로 정하십시오. 동체 두께 등 기계 설계는 EPC 도구 몫입니다.",
      "For preliminary review only. Set inlet devices, disengagement heights, hold-up between alarm levels and surge volume from company standards and vendor data. Mechanical design such as wall thickness belongs to the EPC tools."),
    tr("K 값 범위는 GPSA Engineering Data Book 7절·API 12J 등에 실린 값이 흔히 인용됩니다. 여기서는 범위만 안내하며 표를 옮기지 않았습니다. 거품·점성 액은 K 를 낮춥니다.",
      "K ranges are commonly quoted from GPSA Engineering Data Book Sec. 7 and API 12J. Only ranges are mentioned here; the tables are not reproduced. Lower K for foaming or viscous liquids."),
  ],
  reference: [
    "Souders, M. & Brown, G.G. (1934). Design of fractionating columns I. Entrainment and capacity. Ind. Eng. Chem. 26(1), 98–103. doi:10.1021/ie50289a025",
    "Svrcek, W.Y. & Monnery, W.D. (1993). Design two-phase separators within the right limits. Chemical Engineering Progress, Oct. 1993, 53–60.",
    "Watkins (1967). Sizing separators and accumulators. Hydrocarbon Processing, Nov. 1967.",
    tr("Bell, C. fluids — fluids.separator (MIT), K_separator_demister_York·v_Souders_Brown 대조", "Bell, C. fluids — fluids.separator (MIT), K_separator_demister_York and v_Souders_Brown cross-check"),
  ],
};

Object.assign(window, { CALC_DEF_SEPARATOR, calcSepKYork, calcSouders, calcSegmentFraction });
