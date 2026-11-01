// 2성분 VLE 계산기(calc_vle_binary.jsx)의 성분 — 자주 쓰는 용제 사전 설정(UNIFAC 그룹 + CoolProp 맞춤 Antoine) 또는 사용자 입력. React 없음.
// 그룹 나눔: Hansen et al. (1991) 부그룹 번호(calc_vle_unifac_data.jsx), DDBST 배정표와 대조. Antoine: calc_vle_antoine_data.jsx(CoolProp 맞춤).
// 이름은 calc_fluid_names.jsx 의 CALC_FLUID_NAMES 를 그대로 쓴다(한 곳).

const CALC_VLE_PRESETS = [
  { id: "Water", groups: { 16: 1 } },
  { id: "Methanol", groups: { 15: 1 } },
  { id: "Ethanol", groups: { 1: 1, 2: 1, 14: 1 } },
  { id: "Acetone", groups: { 1: 1, 18: 1 } },
  { id: "Benzene", groups: { 9: 6 } },
  { id: "Toluene", groups: { 9: 5, 11: 1 } },
  { id: "EthylBenzene", groups: { 1: 1, 9: 5, 12: 1 } },
  { id: "o-Xylene", groups: { 9: 4, 11: 2 } },
  { id: "m-Xylene", groups: { 9: 4, 11: 2 } },
  { id: "p-Xylene", groups: { 9: 4, 11: 2 } },
  { id: "n-Pentane", groups: { 1: 2, 2: 3 } },
  { id: "n-Hexane", groups: { 1: 2, 2: 4 } },
  { id: "n-Heptane", groups: { 1: 2, 2: 5 } },
  { id: "n-Octane", groups: { 1: 2, 2: 6 } },
  { id: "CycloHexane", groups: { 2: 6 } },
  { id: "DiethylEther", groups: { 1: 2, 2: 1, 25: 1 } },
  { id: "Tetrahydrofuran", groups: { 2: 3, 27: 1 } },
  { id: "Dichloroethane", groups: { 44: 2 } },
];

const CALC_VLE_CUSTOM = "custom";

function calcVlePresetOptions() {
  return [
    ...CALC_VLE_PRESETS.map(p => ({ v: p.id, label: CALC_FLUID_NAMES[p.id] || p.id })),
    { v: CALC_VLE_CUSTOM, label: tr("직접 입력(Antoine·UNIFAC 그룹)", "Custom (Antoine and UNIFAC groups)") },
  ];
}

// Antoine 사용자 형식(calc_antoine.jsx 와 같은 칸: base, pu, tu) → P [Pa] 와 그 역함수 T [K]
function calcVleUserAntoine(c) {
  const toP = (T) => calcAntoinePressure(c, T);
  const toT = (P) => {
    const lp = (c.base === "ln" ? Math.log : Math.log10)(calcConvert("pressure", P, "Pa", c.pu));
    if (c.A - lp <= 0) return null;
    return calcConvert("temperature", c.B / (c.A - lp) - c.C, c.tu, "K");
  };
  return { psat: toP, tsat: toT };
}

// 사전 설정 Antoine: ln P[Pa] = A − B/(T + C)
function calcVlePresetAntoine(a) {
  return { psat: (T) => (T + a.C > 0 ? Math.exp(a.A - a.B / (T + a.C)) : null), tsat: (P) => a.B / (a.A - Math.log(P)) - a.C };
}

// 성분 하나: { name, psat(T), tsat(P), groups?, range?: [Tmin, Tmax], cas? } 또는 { error }
function calcVleComponent(choice, user) {
  if (choice !== CALC_VLE_CUSTOM) {
    const p = CALC_VLE_PRESETS.find(x => x.id === choice);
    const a = CALC_VLE_ANTOINE_DATA[choice];
    if (!p || !a) return { error: tr("목록에 없는 성분입니다.", "This component is not in the list.") };
    return { name: CALC_FLUID_NAMES[p.id] || p.id, ...calcVlePresetAntoine(a), groups: p.groups, range: [a.Tmin, a.Tmax], cas: calcFluidById(p.id)?.cas || null };
  }
  const out = { name: user.name, ...calcVleUserAntoine(user.antoine), groups: null };
  if (user.rows) {
    const g = calcUnifacGroupsFromRows(user.rows);
    if (g.error) return { error: `${user.name}: ${g.error}` };
    out.groups = g.groups;
  }
  return out;
}

Object.assign(window, { CALC_VLE_PRESETS, CALC_VLE_CUSTOM, calcVlePresetOptions, calcVleComponent });
