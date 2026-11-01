// API 층 · 계산기 행 채우기 — 표 칸 정의의 rowFill: "<종류>" 가 여기 CALC_ROW_FILLERS 의 함수를 가리킨다.
//   antoine: 성분 칸(이름 또는 CAS) → 사전 설정 물질(calc_vle_antoine_data.jsx, CoolProp 맞춤) 또는
//            물질 검색(fetchChemicalSearch) → f/<CAS>.json(fetchFacts) 두 점 추정 Antoine 상수
//            (calc_antoine_facts.jsx 순수 함수, 계산기의 상수 꼴 base·pu·tu 로 바꿔 채운다).
// 돌려주는 모양: { patch: { 열 key: 값 }, info } 또는 { error: "empty" | "notFound" | "noData", name? }. 문구는 CALC_LABELS.rowFill.
// 정적 자료가 꺼져 있으면 fetchFacts 가 null → "noData".

const CALC_ROWFILL_CAS_RE = /^\d{2,7}-\d{2}-\d$/;
const CALC_ROWFILL_TRIES = 3;   // 검색 결과 앞쪽 몇 물질까지 물성 파일을 열어 볼지

function calcRowFillRound(n) {
  return Number(n.toPrecision(7));
}

// 검색어 → [{ cas, name }] (CAS 가 있는 결과만, 겹침 없이)
async function fetchCalcRowFillCandidates(q) {
  if (CALC_ROWFILL_CAS_RE.test(q)) return [{ cas: q, name: q }];
  const found = await fetchChemicalSearch(q, 10);
  const seen = new Set();
  const out = [];
  for (const it of (found && found.items) || []) {
    if (!CALC_ROWFILL_CAS_RE.test(it.cas_no || "") || seen.has(it.cas_no)) continue;
    seen.add(it.cas_no);
    out.push({ cas: it.cas_no, name: chemLocalName(it) || it.cas_no });
  }
  return out;
}

// 사전 설정 물질(CoolProp 맞춤) → 행 값
function calcRowFillFromPreset(pre, name, choices) {
  const abc = calcAntoineConvert(pre, CALC_ANTOINE_SI_FORM, { base: choices.base, pu: choices.pu, tu: choices.tu });
  return {
    patch: { name, A: calcRowFillRound(abc.A), B: calcRowFillRound(abc.B), C: calcRowFillRound(abc.C) },
    info: { source: "preset", name, id: pre.id, tmin: pre.Tmin - 273.15, tmax: pre.Tmax - 273.15, err: pre.maxErr * 100 },
  };
}

// 순서: 사전 설정 물질(이름·CAS, 화면 안 자료라 PC·정적 자료 없이도 된다) → 검색한 물질의 CAS 로 사전 설정 → f/<CAS>.json 두 점 맞춤
async function fetchCalcAntoineFill(row, choices) {
  const q = String(row.name || "").trim();
  if (!q) return { error: "empty" };
  const direct = calcAntoinePreset(q, CALC_ROWFILL_CAS_RE.test(q) ? q : null);
  if (direct) return calcRowFillFromPreset(direct, q, choices);
  const cands = (await fetchCalcRowFillCandidates(q)).slice(0, CALC_ROWFILL_TRIES);
  if (!cands.length) return { error: "notFound", name: q };
  for (const c of cands) {
    const name = c.name === c.cas ? q : c.name;
    const pre = calcAntoinePreset(name, c.cas);
    if (pre) return calcRowFillFromPreset(pre, name, choices);
    const fit = calcAntoineFromFacts(await fetchFacts(c.cas));
    if (!fit) continue;
    const abc = calcAntoineToConv(fit, { base: choices.base, pu: choices.pu, tu: choices.tu });
    return {
      patch: { name, A: calcRowFillRound(abc.A), B: calcRowFillRound(abc.B), C: calcRowFillRound(abc.C) },
      info: { source: "facts", name, cas: c.cas, t1: fit.T1, p1: fit.P1 / 1000, tb: fit.Tb },
    };
  }
  return { error: "noData", name: cands[0].name };
}

const CALC_ROW_FILLERS = { antoine: fetchCalcAntoineFill, flash_point: fetchCalcFlashPointFill, flam_limits: fetchCalcFlamLimitsFill };   // 가연성 2종: api_calc_fill_flam.jsx

Object.assign(window, { CALC_ROW_FILLERS, fetchCalcAntoineFill, fetchCalcRowFillCandidates, calcRowFillFromPreset });
