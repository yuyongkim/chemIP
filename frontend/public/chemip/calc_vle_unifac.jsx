// 원 UNIFAC 활동도 계수(Fredenslund, Jones & Prausnitz 1975) — 조합 항(Staverman–Guggenheim, z = 10) + 잔여 항(그룹 상호작용). React 없음.
// 매개변수는 calc_vle_unifac_data.jsx(R·Q, a_mn). 성분 = { <부그룹 번호>: 개수 }. 2성분 계산기(calc_vle_binary.jsx)와 시험이 쓴다.
//   ln γ_i = ln γ_i^C + ln γ_i^R
//   ln γ_i^C = ln V_i + (z/2)·q_i·ln(F_i/V_i) + l_i − V_i·Σ_j x_j l_j,  V_i = r_i/Σ r_j x_j,  F_i = q_i/Σ q_j x_j,  l_i = (z/2)(r_i − q_i) − (r_i − 1)
//   ln γ_i^R = Σ_k ν_k^(i) [ln Γ_k − ln Γ_k^(i)],  ln Γ_k = Q_k [1 − ln(Σ_m θ_m Ψ_mk) − Σ_m θ_m Ψ_km / Σ_n θ_n Ψ_nm],  Ψ_mn = exp(−a_mn/T)

const CALC_UNIFAC_Z = 10;
let CALC_UNIFAC_INDEX = null;

function calcUnifacIndex() {
  if (!CALC_UNIFAC_INDEX) {
    const byId = new Map(), byName = new Map(), a = new Map();
    CALC_UNIFAC_SUBGROUPS.forEach(([id, name, main, R, Q]) => {
      const g = { id, name, main, R, Q };
      byId.set(id, g);
      byName.set(name.toUpperCase(), g);
    });
    CALC_UNIFAC_A.forEach(([m, n, v]) => a.set(m * 1000 + n, v));
    CALC_UNIFAC_INDEX = { byId, byName, a };
  }
  return CALC_UNIFAC_INDEX;
}

// 이름("CH3", "oh") 또는 번호("14") → 부그룹(없으면 null)
function calcUnifacFind(text) {
  const s = String(text == null ? "" : text).trim();
  const idx = calcUnifacIndex();
  if (/^\d+$/.test(s)) return idx.byId.get(Number(s)) || null;
  return idx.byName.get(s.toUpperCase().replace(/\s+/g, "")) || null;
}

// 표 행 [{ g: 이름|번호, n: 개수 }] → { groups: { id: 개수 } } 또는 { error }
function calcUnifacGroupsFromRows(rows) {
  const groups = {};
  for (const r of rows || []) {
    const g = calcUnifacFind(r.g);
    if (!g) return { error: tr(`UNIFAC 부그룹 "${r.g}" 을(를) 찾지 못했습니다(Hansen 1991 이름 또는 번호, 예: CH3, CH2, OH, H2O, ACH, ACCH3, CH3CO).`, `UNIFAC subgroup "${r.g}" was not found (use a Hansen 1991 name or number, e.g. CH3, CH2, OH, H2O, ACH, ACCH3, CH3CO).`) };
    if (!(r.n > 0) || Math.abs(r.n - Math.round(r.n)) > 1e-9) return { error: tr(`부그룹 ${g.name} 의 개수는 1 이상의 정수여야 합니다.`, `The count of subgroup ${g.name} must be a whole number of 1 or more.`) };
    groups[g.id] = (groups[g.id] || 0) + Math.round(r.n);
  }
  return Object.keys(groups).length ? { groups } : { error: tr("UNIFAC 부그룹을 하나 이상 넣으십시오.", "Enter at least one UNIFAC subgroup.") };
}

function calcUnifacLabel(groups) {
  const idx = calcUnifacIndex();
  return Object.entries(groups).map(([id, n]) => `${idx.byId.get(Number(id)).name}${n > 1 ? `×${n}` : ""}`).join(" + ");
}

// 성분 묶음 [{ id: 개수 }, …] → { error } 또는 { gammas(xs, T) → [γ…], subgroups }
function calcUnifacModel(comps) {
  const idx = calcUnifacIndex();
  const ids = [...new Set(comps.flatMap(c => Object.keys(c).map(Number)))];
  const subs = ids.map(id => idx.byId.get(id));
  if (subs.some(g => !g)) return { error: tr("알 수 없는 UNIFAC 부그룹 번호가 있습니다.", "There is an unknown UNIFAC subgroup number.") };
  const missing = [];
  subs.forEach(m => subs.forEach(n => {
    if (m.main !== n.main && !idx.a.has(m.main * 1000 + n.main)) missing.push(`${CALC_UNIFAC_MAIN[m.main]}–${CALC_UNIFAC_MAIN[n.main]}`);
  }));
  if (missing.length) {
    const list = [...new Set(missing)].slice(0, 4).join(", ");
    return { error: tr(`원 UNIFAC 표에 이 그룹 쌍의 상호작용 매개변수가 없습니다: ${list}`, `The original UNIFAC table has no interaction parameter for: ${list}`) };
  }
  const nu = comps.map(c => ids.map(id => c[id] || 0));          // nu[i][k]
  const r = nu.map(row => row.reduce((s, v, k) => s + v * subs[k].R, 0));
  const q = nu.map(row => row.reduce((s, v, k) => s + v * subs[k].Q, 0));
  const aOf = (m, n) => (subs[m].main === subs[n].main ? 0 : idx.a.get(subs[m].main * 1000 + subs[n].main));
  const K = ids.length;

  // 그룹 몰분율 X → ln Γ_k (그 T 의 Ψ 로)
  const lnGamma = (X, psi) => {
    const qx = X.map((x, k) => subs[k].Q * x);
    const sq = qx.reduce((s, v) => s + v, 0);
    const th = qx.map(v => v / sq);
    const sumMk = (k) => th.reduce((s, t, m) => s + t * psi[m][k], 0);
    const den = Array.from({ length: K }, (_, m) => sumMk(m));
    return Array.from({ length: K }, (_, k) => subs[k].Q * (1 - Math.log(den[k]) - th.reduce((s, t, m) => s + t * psi[k][m] / den[m], 0)));
  };
  const psiAt = (T) => Array.from({ length: K }, (_, m) => Array.from({ length: K }, (_, n) => Math.exp(-aOf(m, n) / T)));
  let pureT = null, pure = null;   // 순수 성분 ln Γ_k^(i) — 같은 T 면 다시 쓰기
  const pureAt = (T, psi) => {
    if (pureT !== T) {
      pure = nu.map(row => { const tot = row.reduce((s, v) => s + v, 0); return lnGamma(row.map(v => v / tot), psi); });
      pureT = T;
    }
    return pure;
  };

  function gammas(xs, T) {
    const z2 = CALC_UNIFAC_Z / 2;
    const sr = xs.reduce((s, x, i) => s + x * r[i], 0), sq = xs.reduce((s, x, i) => s + x * q[i], 0);
    const l = r.map((ri, i) => z2 * (ri - q[i]) - (ri - 1));
    const sl = xs.reduce((s, x, i) => s + x * l[i], 0);
    const psi = psiAt(T);
    const pureG = pureAt(T, psi);
    const tot = xs.reduce((s, x, i) => s + x * nu[i].reduce((a, b) => a + b, 0), 0);
    const X = Array.from({ length: K }, (_, k) => xs.reduce((s, x, i) => s + x * nu[i][k], 0) / tot);
    const mixG = lnGamma(X, psi);
    return xs.map((_, i) => {
      const V = r[i] / sr, F = q[i] / sq;
      const lnC = Math.log(V) + z2 * q[i] * Math.log(F / V) + l[i] - V * sl;
      const lnR = nu[i].reduce((s, v, k) => s + v * (mixG[k] - pureG[i][k]), 0);
      return Math.exp(lnC + lnR);
    });
  }
  return { gammas, subgroups: subs, r, q };
}

Object.assign(window, { calcUnifacFind, calcUnifacGroupsFromRows, calcUnifacLabel, calcUnifacModel });
