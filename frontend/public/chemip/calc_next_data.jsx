// "이어서 계산" 링크 자료(순수 함수, React 없음) — 계산기 정의의 links(values, outputs) → [{ calc, values, label }] 를
// 등록된 계산기만 남기고 딥링크 주소(calcHref)로 바꾼다. 값은 받는 계산기 칸의 처음 보이는 단위(show, 없으면 unit)로 넣는다.
// 그리는 곳: calc_results_next.jsx(CalcNextLinks). 화면 문구: CALC_LABELS.nextLinks.

function calcNextLinksFor(def, result) {
  if (typeof def.links !== "function" || !result?.outputs || !result.values) return [];
  let list;
  try { list = def.links(result.values, result.outputs) || []; } catch (e) { return []; }
  return list
    .filter(l => l && calcFind(l.calc))
    .map(l => ({ key: `${l.calc}:${l.label}`, label: l.label, title: calcFind(l.calc).title, href: calcHref(l.calc, calcNextRound(l.values || {})) }));
}

// 주소에 넣을 값은 유효숫자 6자리로(긴 소수 꼬리 없이)
function calcNextRound(values) {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === "number" && Number.isFinite(v) ? Number(v.toPrecision(6)) : v]));
}

// 질량 [kg] → 화재·폭발 계산기(BLEVE 화구·증기운 폭발) 링크. 누출량 계산기 등 질량을 내는 계산기의 links 가 쓴다.
function calcFireMassLinks(massKg) {
  if (!(massKg > 0)) return [];
  return [
    { calc: "bleve", values: { M: massKg }, label: tr("이 질량으로 BLEVE 화구", "BLEVE fireball with this mass") },
    { calc: "vce", values: { M: massKg }, label: tr("이 질량으로 증기운 폭발", "Vapour cloud explosion with this mass") },
  ];
}

Object.assign(window, { calcNextLinksFor, calcNextRound, calcFireMassLinks });
