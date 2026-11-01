// 계산기: 공정 경제성 — 용량 지수(6/10) 법칙, 비용 지수 환산(사용자 입력 또는 미국 BLS 생산자물가지수), NPV·IRR·회수 기간, 유틸리티 비용.
// 수식은 calc_economics_math.jsx, BLS PPI 연평균 자료는 calc_economics_ppi.jsx(데이터만). CEPCI 값은 싣지 않는다(유료 자료) — 사용자가 넣는다.

const CALC_ECON_PPI_YEARS = (() => {
  const ys = CALC_PPI_SERIES.flatMap(s => Object.keys(s.values).map(Number));
  return { min: Math.min(...ys), max: Math.max(...ys) };
})();

function calcEconFlows(v) {
  return (v.cf || []).map(r => r.cf);
}

function calcEconIndex(v) {
  if (v.src === "user") return { I0: v.I0, I1: v.I1 };
  const s = CALC_PPI_SERIES.find(x => x.id === v.ser) || CALC_PPI_SERIES[0];
  return { I0: s.values[Math.round(v.y0)], I1: s.values[Math.round(v.y1)], series: s };
}

function calcEconChart(v, out) {
  if (v.mode === "scale") {
    const pts = calcChartRange(v.S1 * 0.25, Math.max(v.S1, v.S2) * 2, 50).map(S => [S, calcEconScale(v.C1, v.S1, S, v.n)]);
    return {
      x: { label: tr("용량 S", "Capacity S"), unit: tr("입력 단위", "input unit") },
      y: { label: tr("비용 C", "Cost C"), unit: tr("통화", "currency") },
      series: [
        { key: "n", label: `n = ${v.n}`, points: pts },
        { key: "lin", label: tr("비례 (n = 1)", "Proportional (n = 1)"), points: pts.map(([S]) => [S, v.C1 * S / v.S1]), dashed: true },
      ],
      markers: [{ x: v.S1, y: v.C1, label: tr("기준", "Base") }, { x: v.S2, y: out.C2, label: tr("새 용량", "New capacity") }],
      ariaLabel: tr("용량에 따른 비용 곡선", "Cost versus capacity"),
    };
  }
  if (v.mode === "npv") {
    const cfs = calcEconFlows(v);
    return {
      x: { label: tr("연", "Year"), unit: "" },
      y: { label: tr("누적 현금 흐름", "Cumulative cash flow"), unit: tr("통화", "currency") },
      series: [
        { key: "cum", label: tr("누적 (할인 없음)", "Cumulative (undiscounted)"), points: calcEconCumulative(cfs, null) },
        { key: "dcum", label: tr("누적 (할인)", "Cumulative (discounted)"), points: calcEconCumulative(cfs, v.rate / 100), dashed: true },
      ],
      hlines: [{ y: 0, label: "0" }],
      ariaLabel: tr("누적 현금 흐름과 회수 시점", "Cumulative cash flow and payback"),
    };
  }
  return null;
}

function calcEconCompute(v) {
  if (v.mode === "scale") {
    const C2 = calcEconScale(v.C1, v.S1, v.S2, v.n);
    const warnings = v.S2 / v.S1 > 10 || v.S1 / v.S2 > 10 ? [tr("용량비가 10 배를 넘습니다. 지수 법칙은 보통 그 안에서만 씁니다.", "The capacity ratio exceeds 10. The exponent rule is normally used only within that range.")] : [];
    return { C2, ratio: C2 / v.C1, unitRatio: (C2 / v.S2) / (v.C1 / v.S1), warnings };
  }
  if (v.mode === "escalate") {
    const { I0, I1 } = calcEconIndex(v);
    if (!(I0 > 0) || !(I1 > 0)) return { error: tr("그 해의 지수 값이 자료에 없습니다. 연도를 확인하십시오.", "No index value for that year in the data. Check the years.") };
    const warnings = [];
    if (v.src === "ppi") {
      warnings.push(tr("BLS PPI 는 미국 장비 제조 가격 지수입니다. CEPCI(설치·인건비 포함 플랜트 지수)와 다르며 대용으로만 씁니다.", "The BLS PPI is a US equipment-manufacturing price index. It differs from the CEPCI (a plant index including installation and labor) and is only a proxy."));
      if (Math.abs(v.y1 - v.y0) > 10) warnings.push(tr("10 년 넘는 환산은 오차가 큽니다.", "Escalation over more than 10 years is unreliable."));
    }
    return { C_now: v.C0 * I1 / I0, I0_out: I0, I1_out: I1, idx_ratio: I1 / I0, warnings };
  }
  if (v.mode === "npv") {
    const cfs = calcEconFlows(v);
    const r = v.rate / 100;
    const npv = calcEconNpv(cfs, r);
    const irr = calcEconIrr(cfs);
    const pb = calcEconPayback(calcEconCumulative(cfs, null));
    const dpb = calcEconPayback(calcEconCumulative(cfs, r));
    const N = cfs.length - 1;
    const warnings = [];
    if (calcEconSignChanges(cfs) > 1) warnings.push(tr("현금 흐름 부호가 두 번 넘게 바뀝니다. IRR 이 여럿일 수 있어 NPV 로 판단하십시오.", "The cash-flow sign changes more than once. There may be several IRRs, so decide on NPV."));
    if (irr == null) warnings.push(tr("−99 %–1000 % 안에서 IRR 을 찾지 못했습니다.", "No IRR found between −99 % and 1000 %."));
    if (pb == null) warnings.push(tr("기간 안에 투자비를 회수하지 못합니다.", "The investment is not recovered within the period."));
    return {
      npv, irr: irr == null ? undefined : 100 * irr, pb: pb == null ? undefined : pb, dpb: dpb == null ? undefined : dpb,
      eav: N > 0 ? npv * calcEconCrf(r, N) : undefined, years: N, warnings,
    };
  }
  const hourly = { e: v.ekW * v.eP, s: v.sT * v.sP, w: v.wM * v.wP };
  const h = hourly.e + hourly.s + hourly.w;
  return { u_h: h, u_y: h * v.hrs, u_e: hourly.e * v.hrs, u_s: hourly.s * v.hrs, u_w: hourly.w * v.hrs };
}

const calcEconIs = (m) => (c) => c.mode === m;

const CALC_DEF_ECONOMICS = {
  key: "economics",
  group: "reaction",
  title: tr("공정 경제성 (6/10 법칙 · 비용 지수 · NPV·IRR · 유틸리티)", "Process economics (six-tenths rule · cost index · NPV, IRR · utilities)"),
  summary: tr("용량 지수 법칙으로 장치비를 다른 용량으로 옮기고, 비용 지수로 연도를 맞추고, 현금 흐름 표로 NPV·IRR·회수 기간을, 사용량과 단가로 유틸리티 비용을 구합니다. 예비 견적(±30 % 이상)용입니다.",
    "Scales equipment cost to another capacity with the capacity exponent, escalates it with a cost index, gives NPV, IRR and payback from a cash-flow table, and estimates utility cost from consumption and unit prices. For preliminary (±30 % or worse) estimates."),
  inputs: [
    { key: "mode", type: "choice", label: tr("계산", "Calculation"), default: "scale",
      options: [
        { v: "scale", label: tr("용량 지수 (6/10 법칙)", "Capacity exponent (six-tenths)") },
        { v: "escalate", label: tr("비용 지수 환산", "Cost-index escalation") },
        { v: "npv", label: "NPV · IRR" },
        { v: "utility", label: tr("유틸리티 비용", "Utility cost") },
      ] },
    // 용량 지수
    { key: "C1", label: tr("기준 비용 C₁", "Base cost C₁"), unit: tr("통화", "currency"), default: 10, positive: true, when: calcEconIs("scale") },
    { key: "S1", label: tr("기준 용량 S₁", "Base capacity S₁"), unit: tr("임의 단위", "any unit"), default: 100, positive: true, when: calcEconIs("scale") },
    { key: "S2", label: tr("새 용량 S₂", "New capacity S₂"), unit: tr("S₁ 과 같은 단위", "same unit as S₁"), default: 200, positive: true, when: calcEconIs("scale") },
    { key: "n", label: tr("용량 지수 n", "Capacity exponent n"), term: "ec_capacity_exponent", unit: "—", default: 0.6, positive: true, max: 1.5, when: calcEconIs("scale"),
      hint: tr("장치마다 보통 0.4–0.9, 모르면 0.6", "Typically 0.4–0.9 by equipment; 0.6 if unknown") },
    // 비용 지수
    { key: "C0", label: tr("그해 비용", "Cost in base year"), unit: tr("통화", "currency"), default: 100, positive: true, when: calcEconIs("escalate") },
    { key: "src", type: "choice", label: tr("지수", "Index"), term: "ec_cost_index", default: "user", when: calcEconIs("escalate"),
      options: [{ v: "user", label: tr("직접 입력 (CEPCI 등)", "Enter values (CEPCI etc.)") }, { v: "ppi", label: tr("미국 BLS PPI (공공 자료)", "US BLS PPI (public data)") }] },
    { key: "I0", label: tr("그해 지수 I₀", "Index in base year I₀"), unit: "—", default: 500, positive: true, when: c => c.mode === "escalate" && c.src === "user" },
    { key: "I1", label: tr("지금 지수 I₁", "Index now I₁"), unit: "—", default: 800, positive: true, when: c => c.mode === "escalate" && c.src === "user" },
    { key: "ser", type: "choice", label: tr("PPI 계열", "PPI series"), term: "ec_ppi", default: CALC_PPI_SERIES[0].id, when: c => c.mode === "escalate" && c.src === "ppi",
      options: CALC_PPI_SERIES.map(s => ({ v: s.id, label: s.label })) },
    { key: "y0", label: tr("그해 (연도)", "Base year"), unit: tr("년", "year"), default: 2015, min: CALC_ECON_PPI_YEARS.min, max: CALC_ECON_PPI_YEARS.max, when: c => c.mode === "escalate" && c.src === "ppi" },
    { key: "y1", label: tr("지금 (연도)", "Current year"), unit: tr("년", "year"), default: CALC_ECON_PPI_YEARS.max, min: CALC_ECON_PPI_YEARS.min, max: CALC_ECON_PPI_YEARS.max, when: c => c.mode === "escalate" && c.src === "ppi" },
    // NPV
    { key: "rate", label: tr("할인율 i", "Discount rate i"), term: "ec_discount_rate", unit: tr("%/년", "%/yr"), default: 10, min: -99, max: 1000, when: calcEconIs("npv") },
    { key: "cf", type: "table", label: tr("연도별 순현금 흐름 (0년 = 투자)", "Net cash flow by year (year 0 = investment)"), minRows: 2, maxRows: 41, when: calcEconIs("npv"),
      columns: [{ key: "cf", label: tr("현금 흐름", "Cash flow"), unit: tr("통화", "currency") }],
      rows: [{ cf: -1000 }, { cf: 300 }, { cf: 300 }, { cf: 300 }, { cf: 300 }, { cf: 300 }],
      hint: tr("행 순서가 0, 1, 2 … 년입니다. 빈 행은 건너뛰므로 현금 흐름이 없는 해는 0 을 넣습니다.", "Rows are years 0, 1, 2 … Blank rows are skipped, so enter 0 for a year with no cash flow.") },
    // 유틸리티
    { key: "hrs", label: tr("연간 가동 시간", "Operating hours per year"), unit: "h/yr", default: 8000, positive: true, max: 8784, when: calcEconIs("utility") },
    { key: "ekW", label: tr("전력 사용", "Electric power"), unit: "kW", default: 100, min: 0, when: calcEconIs("utility") },
    { key: "eP", label: tr("전력 단가 (예시값)", "Electricity price (example)"), unit: tr("원/kWh", "KRW/kWh"), default: 180, min: 0, when: calcEconIs("utility"),
      hint: tr("기본값은 예시입니다. 실제 계약 단가를 넣으십시오", "Default is only an example. Enter your contract price") },
    { key: "sT", label: tr("증기 사용", "Steam use"), unit: "t/h", default: 2, min: 0, when: calcEconIs("utility") },
    { key: "sP", label: tr("증기 단가 (예시값)", "Steam price (example)"), unit: tr("원/t", "KRW/t"), default: 40000, min: 0, when: calcEconIs("utility") },
    { key: "wM", label: tr("냉각수 순환량", "Cooling water circulation"), unit: "m³/h", default: 200, min: 0, when: calcEconIs("utility") },
    { key: "wP", label: tr("냉각수 단가 (예시값)", "Cooling water price (example)"), unit: tr("원/m³", "KRW/m³"), default: 50, min: 0, when: calcEconIs("utility") },
  ],
  outputs: [
    { key: "C2", label: tr("새 용량 비용 C₂", "Cost at new capacity C₂"), unit: tr("통화", "currency"), digits: 5 },
    { key: "ratio", label: "C₂ / C₁", unit: "—", digits: 4 },
    { key: "unitRatio", label: tr("단위 용량당 비용 비", "Cost per unit capacity ratio"), unit: "—", digits: 4 },
    { key: "C_now", label: tr("지금 비용", "Current cost"), unit: tr("통화", "currency"), digits: 5 },
    { key: "I0_out", label: tr("그해 지수", "Base-year index"), unit: "—", digits: 6 },
    { key: "I1_out", label: tr("지금 지수", "Current index"), unit: "—", digits: 6 },
    { key: "idx_ratio", label: "I₁ / I₀", unit: "—", digits: 4 },
    { key: "npv", label: tr("순현재가치 NPV", "Net present value NPV"), term: "ec_npv", unit: tr("통화", "currency"), digits: 5 },
    { key: "irr", label: tr("내부 수익률 IRR", "Internal rate of return IRR"), term: "ec_irr", unit: tr("%/년", "%/yr"), digits: 4 },
    { key: "pb", label: tr("단순 회수 기간", "Simple payback"), term: "ec_payback", unit: tr("년", "yr"), digits: 4 },
    { key: "dpb", label: tr("할인 회수 기간", "Discounted payback"), term: "ec_payback", unit: tr("년", "yr"), digits: 4 },
    { key: "eav", label: tr("연간 균등 가치 (NPV × CRF)", "Equivalent annual value (NPV × CRF)"), unit: tr("통화/년", "currency/yr"), digits: 5 },
    { key: "years", label: tr("분석 기간", "Analysis period"), unit: tr("년", "yr"), digits: 3 },
    { key: "u_h", label: tr("시간당 유틸리티 비용", "Utility cost per hour"), unit: tr("원/h", "KRW/h"), digits: 5 },
    { key: "u_y", label: tr("연간 유틸리티 비용", "Annual utility cost"), unit: tr("원/년", "KRW/yr"), digits: 5 },
    { key: "u_e", label: tr("— 전력", "— electricity"), unit: tr("원/년", "KRW/yr"), digits: 4 },
    { key: "u_s", label: tr("— 증기", "— steam"), unit: tr("원/년", "KRW/yr"), digits: 4 },
    { key: "u_w", label: tr("— 냉각수", "— cooling water"), unit: tr("원/년", "KRW/yr"), digits: 4 },
  ],
  compute: calcEconCompute,
  chart: calcEconChart,
  formula: [
    tr("용량 지수: C₂ = C₁ (S₂/S₁)ⁿ (n ≈ 0.6 이면 6/10 법칙)", "Capacity exponent: C₂ = C₁ (S₂/S₁)ⁿ (n ≈ 0.6 gives the six-tenths rule)"),
    tr("비용 지수: C_지금 = C_그해 × I_지금 / I_그해", "Cost index: C_now = C_then × I_now / I_then"),
    "NPV = Σ CF_t / (1 + i)^t,   NPV(IRR) = 0,   CRF = i(1+i)^N / ((1+i)^N − 1)",
    tr("회수 기간: 누적 현금 흐름이 0 이 되는 시점(연 사이 선형 보간)", "Payback: time at which cumulative cash flow reaches 0 (linear interpolation within the year)"),
    tr("유틸리티: Σ 사용량 × 단가 × 연간 가동 시간", "Utilities: Σ consumption × unit price × operating hours"),
  ],
  notes: [
    tr("CEPCI(Chemical Engineering Plant Cost Index)는 Chemical Engineering 지의 유료 자료라 싣지 않습니다. 교재·구독 자료의 값을 직접 넣으십시오.", "The CEPCI (Chemical Engineering Plant Cost Index) is paid content from Chemical Engineering magazine, so it is not included. Enter values from your textbook or subscription."),
    tr("BLS PPI 는 미국 노동통계국 공공 자료(연평균)입니다. CEPCI 도 BLS 생산자물가지수 여러 개와 인건비 지수를 가중한 것이지만, 여기 계열 하나는 장비 가격만 반영합니다.", "The BLS PPI is public data from the US Bureau of Labor Statistics (annual averages). The CEPCI is itself a weighted basket of BLS producer price indexes plus labor indexes, but a single series here reflects equipment prices only."),
    tr("유틸리티 기본 단가는 계산 예시일 뿐 공표 요금이 아닙니다.", "The default utility prices are illustrative inputs, not published tariffs."),
    tr("세금·감가상각·운전 자본은 넣지 않은 단순 현금 흐름입니다. 세후 현금 흐름을 표에 넣으면 그대로 계산합니다.", "Simple cash flows without tax, depreciation or working capital. Enter after-tax cash flows in the table and they are used as given."),
  ],
  reference: [
    tr("Turton, R. et al., Analysis, Synthesis and Design of Chemical Processes 5판(2018), 7장 자본비 추정(용량 지수·비용 지수), 10장 수익성 분석(NPV·IRR·회수 기간)", "Turton, R. et al., Analysis, Synthesis and Design of Chemical Processes, 5th ed. (2018), Ch. 7 capital cost estimation (capacity exponent, cost indexes), Ch. 10 profitability analysis (NPV, IRR, payback)"),
    tr("Towler, G. & Sinnott, R., Chemical Engineering Design 2판(2013), 7장 자본비, 9장 경제성 평가", "Towler, G. & Sinnott, R., Chemical Engineering Design, 2nd ed. (2013), Ch. 7 capital cost, Ch. 9 economic evaluation"),
    tr("Williams, R. Jr. (1947). Six-tenths factor aids in approximating costs. Chem. Eng. 54(12), 124–125 — 6/10 법칙", "Williams, R. Jr. (1947). Six-tenths factor aids in approximating costs. Chem. Eng. 54(12), 124–125 — the six-tenths rule"),
    tr(`U.S. Bureau of Labor Statistics, Producer Price Index 연평균(공공 자료), 받은 날 ${CALC_PPI_META.fetched} — ${CALC_PPI_META.url}`, `U.S. Bureau of Labor Statistics, Producer Price Index annual averages (public domain), retrieved ${CALC_PPI_META.fetched} — ${CALC_PPI_META.url}`),
  ],
};

Object.assign(window, { CALC_DEF_ECONOMICS });
