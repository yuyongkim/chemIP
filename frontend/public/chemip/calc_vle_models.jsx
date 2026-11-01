// 2성분 액상 활동도 계수 모델 — 이상(Raoult)·Margules·van Laar·Wilson·NRTL·UNIFAC. React 없음(순수 함수).
// calcVleGammaFn(model, p) → (x1, T[K]) → [γ1, γ2]. 에너지 매개변수(Wilson a_ij, NRTL b_ij)는 K 단위(= Δλ/R, Δg/R)로 받는다.
// 식: Smith, Van Ness & Abbott 7판 12장(Margules 12.9, van Laar 12.17, Wilson 12.18, NRTL 12.19); UNIFAC 은 calc_vle_unifac.jsx.

function calcVleMargules(A12, A21) {
  return (x1) => {
    const x2 = 1 - x1;
    return [Math.exp(x2 * x2 * (A12 + 2 * (A21 - A12) * x1)), Math.exp(x1 * x1 * (A21 + 2 * (A12 - A21) * x2))];
  };
}

// ln γ1 = A12 (A21 x2 / (A12 x1 + A21 x2))², ln γ2 = A21 (A12 x1 / (A12 x1 + A21 x2))² — 끝점에서도 유한한 꼴
function calcVleVanLaar(A12, A21) {
  return (x1) => {
    const x2 = 1 - x1, d = A12 * x1 + A21 * x2;
    if (d === 0) return [1, 1];
    return [Math.exp(A12 * Math.pow(A21 * x2 / d, 2)), Math.exp(A21 * Math.pow(A12 * x1 / d, 2))];
  };
}

// Λ12 = (V2/V1)·exp(−a12/T), Λ21 = (V1/V2)·exp(−a21/T)
function calcVleWilson(V1, V2, a12, a21) {
  return (x1, T) => {
    const x2 = 1 - x1;
    const L12 = V2 / V1 * Math.exp(-a12 / T), L21 = V1 / V2 * Math.exp(-a21 / T);
    const d1 = x1 + x2 * L12, d2 = x2 + x1 * L21;
    const t = L12 / d1 - L21 / d2;
    return [Math.exp(-Math.log(d1) + x2 * t), Math.exp(-Math.log(d2) - x1 * t)];
  };
}

// τ12 = b12/T, τ21 = b21/T, G = exp(−α τ)
function calcVleNrtl(b12, b21, alpha) {
  return (x1, T) => {
    const x2 = 1 - x1;
    const t12 = b12 / T, t21 = b21 / T, G12 = Math.exp(-alpha * t12), G21 = Math.exp(-alpha * t21);
    const d1 = x1 + x2 * G21, d2 = x2 + x1 * G12;
    return [
      Math.exp(x2 * x2 * (t21 * Math.pow(G21 / d1, 2) + t12 * G12 / (d2 * d2))),
      Math.exp(x1 * x1 * (t12 * Math.pow(G12 / d2, 2) + t21 * G21 / (d1 * d1))),
    ];
  };
}

// 모델 key + 매개변수 → { fn } 또는 { error }
function calcVleGammaFn(model, p) {
  if (model === "ideal") return { fn: () => [1, 1] };
  if (model === "margules") return { fn: calcVleMargules(p.A12, p.A21) };
  if (model === "vanlaar") {
    if (p.A12 * p.A21 < 0) return { error: tr("van Laar 의 A12·A21 은 부호가 같아야 합니다(하나가 음수면 Margules 를 쓰십시오).", "van Laar A12 and A21 must have the same sign (use Margules if one is negative).") };
    return { fn: calcVleVanLaar(p.A12, p.A21) };
  }
  if (model === "wilson") return { fn: calcVleWilson(p.V1, p.V2, p.a12, p.a21) };
  if (model === "nrtl") return { fn: calcVleNrtl(p.b12, p.b21, p.alpha) };
  if (model === "unifac") {
    const m = calcUnifacModel([p.groups1, p.groups2]);
    if (m.error) return { error: m.error };
    return { fn: (x1, T) => m.gammas([x1, 1 - x1], T) };
  }
  return { error: "model" };
}

Object.assign(window, { calcVleMargules, calcVleVanLaar, calcVleWilson, calcVleNrtl, calcVleGammaFn });
