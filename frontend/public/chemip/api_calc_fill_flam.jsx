// API 층 · 가연성 계산기 행 채우기 — CALC_ROW_FILLERS(api_calc_fill.jsx)의 flash_point·flam_limits 종류.
//   성분 칸(이름 또는 CAS) → 물질 검색(fetchCalcFillCandidates) → f/<CAS>.json(fetchFacts) → 순수 함수 calc_flam_fill.jsx 로 행 값.
//   flash_point: 혼합 인화점 표(이름·인화점·Antoine B·C·분자량), flam_limits: 혼합 LFL 표(이름·LFL·UFL).
// 돌려주는 모양은 api_calc_fill.jsx 와 같다: { patch, info } 또는 { error: "empty" | "notFound" | "noData", name? }. 안내 문구 CALC_LABELS.rowFill.
// 이 파일은 api_calc_fill.jsx 보다 먼저 읽는다(등록 목록이 이 함수 이름을 가리킨다). 부르는 때에는 그 파일의 함수가 모두 있다.

const CALC_FLAM_FILL_TRIES = 3;   // 검색 결과 앞쪽 몇 물질까지 물성 파일을 열어 볼지

// 행 → { name, cas, facts } 또는 오류 모양
async function fetchCalcFlamFacts(row) {
  const q = String(row.name || "").trim();
  if (!q) return { error: "empty" };
  const cands = (await fetchCalcFillCandidates(q)).slice(0, CALC_FLAM_FILL_TRIES);
  if (!cands.length) return { error: "notFound", name: q };
  for (const c of cands) {
    const facts = await fetchFacts(c.cas);
    if (facts) return { name: c.name === c.cas ? q : c.name, cas: c.cas, facts };
  }
  return { error: "noData", name: cands[0].name };
}

async function fetchCalcFlashPointFill(row) {
  const hit = await fetchCalcFlamFacts(row);
  if (hit.error) return hit;
  const { patch, how } = calcFlashFillPatch(hit.facts, calcAntoinePreset(hit.name, hit.cas));
  if (!calcFlamPatchHasData(patch)) return { error: "noData", name: hit.name };
  return { patch: { name: hit.name, ...patch }, info: { source: "props_flash", name: hit.name, cas: hit.cas, how } };
}

async function fetchCalcFlamLimitsFill(row) {
  const hit = await fetchCalcFlamFacts(row);
  if (hit.error) return hit;
  const { patch } = calcFlamLimitsPatch(hit.facts);
  if (!calcFlamPatchHasData(patch)) return { error: "noData", name: hit.name };
  return { patch: { name: hit.name, ...patch }, info: { source: "props_limits", name: hit.name, cas: hit.cas } };
}

Object.assign(window, { fetchCalcFlamFacts, fetchCalcFlashPointFill, fetchCalcFlamLimitsFill });
