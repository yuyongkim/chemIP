// 물질 물성(정적 f/<CAS>.json, facts_core.jsx 형식) → 계산기 딥링크(calc_link.jsx calcHref). 순수 함수, React 없음.
// 물성 줄 { t, n, u, c }: n 은 SI 숫자(°C·Pa·g/mol·%) 이고 하나의 값일 때만 있다. 못 읽은 칸은 빈 값으로 넘겨 "값을 넣으십시오"가 보이게 한다.

// 물성 하나의 첫 숫자(없으면 null)
function calcFactsNumber(facts, prop) {
  const rows = (facts && facts.props && facts.props[prop]) || [];
  const row = rows.find(r => r && r.n != null && Number.isFinite(Number(r.n)));
  return row ? { n: Number(row.n), c: row.c || "" } : null;
}

// 조건 글자 "20℃" · "25 °C" · "(20 ℃)" → 20. 섭씨 숫자가 없으면 null
function calcFactsConditionC(c) {
  const m = /(-?\d+(?:\.\d+)?)\s*(?:℃|°\s*C|도)/.exec(String(c || ""));
  return m ? Number(m[1]) : null;
}

const calcFactsRound = (n, d = 5) => Number(Number(n).toPrecision(d));

// 탱크 증발 손실: 증기압 1점(+ 기준 온도) · 끓는점 · 분자량
function calcTankLossesHref(facts, name) {
  const vp = calcFactsNumber(facts, "vapor_pressure");
  const bp = calcFactsNumber(facts, "boiling_point");
  const mw = calcFactsNumber(facts, "molar_mass");
  const tref = vp ? calcFactsConditionC(vp.c) : null;
  return calcHref("tank_losses", {
    vp: "cc",
    M: mw ? calcFactsRound(mw.n) : "",
    Pref: vp ? calcFactsRound(vp.n / 1000) : "",
    Tref: tref == null ? "" : tref,
    Tb: bp ? calcFactsRound(bp.n) : "",
  }, name);
}

// 폭발위험장소 도우미: 분자량 · LFL
function calcAreaClassHref(facts, name) {
  const mw = calcFactsNumber(facts, "molar_mass");
  const lfl = calcFactsNumber(facts, "lfl");
  return calcHref("area_class", { M: mw ? calcFactsRound(mw.n) : "", LFL: lfl ? calcFactsRound(lfl.n) : "" }, name);
}

Object.assign(window, { calcFactsNumber, calcFactsConditionC, calcTankLossesHref, calcAreaClassHref });
