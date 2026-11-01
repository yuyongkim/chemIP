// API 층 · PRTR 취급 사업장 지도 — 자료 있는 물질 목록(prtr/index.json)과 물질 하나(prtr/<CAS>.json).
// 정적 자료가 켜져 있으면 정적 파일만 읽는다(파일이 없으면 "자료 없음" — 집 PC 로 넘기지 않는다, 지도 자료는 이 파일이 전부).
// 꺼져 있으면(PC 사이트) 같은 모양의 /api/prtr/index · /api/prtr/<CAS>(backend/api/routes/prtr_map.py).
// 형식: scripts/static_export/CONTRACT.md "prtr/". 화면 컴포넌트는 아래 훅만 쓴다.

const PRTR_CAS_RE = /^\d{2,7}-\d{2}-\d$/;

// 404 는 "이 물질 자료 없음"이라는 답이다.
function prtrNotFound(e) {
  return /^404\b/.test(String((e && e.message) || ""));
}

async function fetchPrtrIndex() {
  if (staticEnabled("pages")) return staticPagesFile(STATIC_LAYOUT.pages.prtrIndex);
  try { return await originGet("/prtr/index"); } catch (e) { if (prtrNotFound(e)) return null; throw e; }
}

async function fetchPrtrSubstance(cas) {
  const c = String(cas || "").trim();
  if (!PRTR_CAS_RE.test(c)) return null;
  if (staticEnabled("pages")) return staticPagesFile(STATIC_LAYOUT.pages.prtr(c));
  try { return await originGet(`/prtr/${encodeURIComponent(c)}`); } catch (e) { if (prtrNotFound(e)) return null; throw e; }
}

function usePrtrIndex() {
  return useApi(() => fetchPrtrIndex(), []);
}

function usePrtrSubstance(cas) {
  return useApi(() => (cas ? fetchPrtrSubstance(cas) : Promise.resolve(null)), [cas]);
}

Object.assign(window, { fetchPrtrIndex, fetchPrtrSubstance, usePrtrIndex, usePrtrSubstance });
