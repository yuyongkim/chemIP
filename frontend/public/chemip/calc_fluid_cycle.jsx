// 단순 증기 압축 냉동 사이클(1 압축기 입구 → 2 토출 → 3 응축기 출구 → 4 팽창 밸브 출구) — CoolProp 상태(calc_fluid_engine.jsx)로 푼다. React 없음.
// 증발 압력 = 증발 온도의 포화 증기(이슬점) 압력, 응축 압력 = 응축 온도의 포화 액(기포점) 압력. 과열도는 이슬점, 과냉도는 기포점 기준.
// 압축은 등엔트로피 효율 η 로: h2 = h1 + (h2s − h1)/η. 팽창 밸브는 등엔탈피(h4 = h3). 배관·열교환기 압력 손실은 넣지 않는다.
// 오류: error = 입력 문제(문구), cpError = CoolProp 이 풀지 못함(원문). 입력·출력은 SI(T [K], ΔT [K], P [Pa], h [J/kg]). 근거: Çengel & Boles, Thermodynamics 11장; ASHRAE Handbook—Fundamentals 2장.

function calcFluidCycle(id, { Te, Tc, sh, sc, eta }) {
  if (!(Tc > Te)) return { error: tr("응축 온도가 증발 온도보다 높아야 합니다.", "The condensing temperature must be above the evaporating temperature.") };
  const ev = calcFluidState(id, "TQ", { T: Te, Q: 1 });
  const cd = calcFluidState(id, "TQ", { T: Tc, Q: 0 });
  if (ev.error || cd.error) return { cpError: ev.error || cd.error };
  const pe = ev.P, pc = cd.P;
  const s1 = sh > 0 ? calcFluidState(id, "TP", { T: ev.T + sh, P: pe }) : ev;
  if (s1.error) return { cpError: s1.error };
  const s2s = calcFluidState(id, "PS", { P: pc, S: s1.S });
  if (s2s.error) return { cpError: s2s.error };
  const s2 = calcFluidState(id, "PH", { P: pc, H: s1.H + (s2s.H - s1.H) / eta });
  const s3 = sc > 0 ? calcFluidState(id, "TP", { T: cd.T - sc, P: pc }) : cd;
  if (s2.error || s3.error) return { cpError: s2.error || s3.error };
  const s4 = calcFluidState(id, "PH", { P: pe, H: s3.H });
  if (s4.error) return { cpError: s4.error };
  const qe = s1.H - s4.H, w = s2.H - s1.H, qc = s2.H - s3.H;
  if (!(qe > 0 && w > 0)) return { error: tr("사이클이 성립하지 않습니다. 온도·과열도·과냉도를 확인하십시오.", "No valid cycle. Check the temperatures, superheat and subcooling.") };
  return {
    states: [s1, s2, s3, s4], s2s, pe, pc, qe, w, qc,
    cop: qe / w, copCarnot: Te / (Tc - Te), ratio: pc / pe,
  };
}

Object.assign(window, { calcFluidCycle });
