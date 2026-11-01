// 공정 경제성 순수 함수(React 없음) — 용량 지수 법칙, 비용 지수 환산, NPV·IRR·회수 기간. 계산기 정의는 calc_economics.jsx.
// 근거: Turton et al., Analysis, Synthesis and Design of Chemical Processes 5판(2018) 7·10장; Towler & Sinnott, Chemical Engineering Design 2판(2013) 7·9장.

// C2 = C1 (S2/S1)^n
function calcEconScale(C1, S1, S2, n) {
  return C1 * Math.pow(S2 / S1, n);
}

// 현금 흐름 cfs[0..N](0년 = 투자) → NPV(rate 소수)
function calcEconNpv(cfs, rate) {
  return cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
}

// 부호 바뀜 수(IRR 이 여럿일 수 있는지)
function calcEconSignChanges(cfs) {
  const nz = cfs.filter(c => c !== 0);
  let n = 0;
  for (let i = 1; i < nz.length; i++) if (Math.sign(nz[i]) !== Math.sign(nz[i - 1])) n++;
  return n;
}

// IRR — NPV(r) = 0 을 −99 % … 1000 % 에서 이분법. 부호가 안 바뀌면 null
function calcEconIrr(cfs) {
  let a = -0.99, b = 10;
  let fa = calcEconNpv(cfs, a), fb = calcEconNpv(cfs, b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || Math.sign(fa) === Math.sign(fb)) return null;
  for (let i = 0; i < 300; i++) {
    const m = (a + b) / 2;
    const fm = calcEconNpv(cfs, m);
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else { b = m; }
  }
  return (a + b) / 2;
}

// 누적 현금 흐름(할인 여부) → [[연, 누적]]
function calcEconCumulative(cfs, rate) {
  let s = 0;
  return cfs.map((cf, t) => { s += rate == null ? cf : cf / Math.pow(1 + rate, t); return [t, s]; });
}

// 회수 기간 — 누적이 처음 0 이상이 되는 해를 선형 보간. 못 미치면 null
function calcEconPayback(cum) {
  for (let i = 1; i < cum.length; i++) {
    const [, prev] = cum[i - 1];
    const [, now] = cum[i];
    if (prev < 0 && now >= 0) return (i - 1) + (-prev) / (now - prev);
  }
  return cum.length && cum[0][1] >= 0 ? 0 : null;
}

// 자본 회수 계수 CRF = i(1+i)^n / ((1+i)^n − 1) — 투자비를 연간 균등액으로
function calcEconCrf(i, n) {
  if (Math.abs(i) < 1e-12) return 1 / n;
  const g = Math.pow(1 + i, n);
  return i * g / (g - 1);
}

Object.assign(window, { calcEconScale, calcEconNpv, calcEconSignChanges, calcEconIrr, calcEconCumulative, calcEconPayback, calcEconCrf });
