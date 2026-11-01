// 피해 probit 공용(순수 함수·데이터, React 없음) — 과압·열복사 probit 과 probit → 확률 환산.
// 상수는 Eisenberg, Lynch & Breeding (1975) USCG 취약성 모델(CG-D-136-75, 미국 정부 공개 보고서)과
// Crowl & Louvar, Chemical Process Safety 2장 probit 상수 표에 실린 값. 형태 Y = a + b·ln(V).

// 과압 probit — p: 최고 측면 과압 [Pa]
const CALC_PROBIT_BLAST = {
  lung: { a: -77.1, b: 6.91, label: tr("폐출혈 사망", "Lung haemorrhage deaths"), kind: "death" },
  eardrum: { a: -15.6, b: 1.93, label: tr("고막 파열", "Eardrum rupture"), kind: "injury" },
  structure: { a: -23.8, b: 2.92, label: tr("구조물 손상", "Structural damage"), kind: "damage" },
  glass: { a: -18.1, b: 2.79, label: tr("유리 파손", "Glass breakage"), kind: "damage" },
};

// 열복사 probit — V = t · I^(4/3), I [W/m²], t [s]. 화상 사망식만 V 를 10⁴ 로 나눈다.
const CALC_PROBIT_THERMAL = {
  death: { a: -14.9, b: 2.56, div: 1e4, label: tr("화상 사망", "Burn deaths"), kind: "death" },
  second: { a: -43.14, b: 3.0188, div: 1, label: tr("2도 화상", "Second-degree burns"), kind: "injury" },
  first: { a: -39.83, b: 3.0186, div: 1, label: tr("1도 화상", "First-degree burns"), kind: "injury" },
};

function calcBlastProbit(effect, p) {
  const c = CALC_PROBIT_BLAST[effect];
  return c.a + c.b * Math.log(p);
}

function calcThermalDose(I, t) {
  return t * Math.pow(I, 4 / 3);
}

function calcThermalProbit(effect, I, t) {
  const c = CALC_PROBIT_THERMAL[effect];
  return c.a + c.b * Math.log(calcThermalDose(I, t) / c.div);
}

// 오차함수 erf — |x| < 3 은 Maclaurin 급수, 그 밖은 erfc 연분수(Lentz). 상대 오차 1e-12 수준(시험이 표값과 대조).
function calcHarmErf(x) {
  const s = Math.sign(x), a = Math.abs(x);
  if (a < 3) {
    let term = a, sum = a;
    for (let n = 1; n < 200; n++) {
      term *= -a * a / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17) break;
    }
    return s * 2 / Math.sqrt(Math.PI) * sum;
  }
  // erfc 연분수(Lentz) — a ≥ 3
  let f = a, C = a, D = 0;
  for (let n = 1; n < 300; n++) {
    const an = n / 2;
    D = a + an * D; D = D === 0 ? 1e-300 : 1 / D;
    C = a + an / C; if (C === 0) C = 1e-300;
    const delta = C * D;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  const erfc = Math.exp(-a * a) / Math.sqrt(Math.PI) / f;
  return s * (1 - erfc);
}

// probit Y → 확률 [%] = 50 [1 + erf((Y − 5)/√2)] (표준 정규 누적분포)
function calcProbitToPercent(Y) {
  return 50 * (1 + calcHarmErf((Y - 5) / Math.SQRT2));
}

Object.assign(window, {
  CALC_PROBIT_BLAST, CALC_PROBIT_THERMAL, calcBlastProbit, calcThermalDose, calcThermalProbit, calcHarmErf, calcProbitToPercent,
});
