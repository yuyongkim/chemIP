// API · GHS H/P 문구표(assets/ghs/phrases.json, 정적 파일 — 집 PC 가 꺼져도 Pages 에서 읽힌다). 한 번만 받아 둔다.
// 형식: scripts/build_ghs_label_phrases.py 머리 주석. 화면 컴포넌트는 fetch 하지 않고 이 훅만 쓴다.

const GHS_PHRASES_URL = "assets/ghs/phrases.json";
let ghsPhrasesPromise = null;

function fetchGhsPhrases() {
  if (!ghsPhrasesPromise) {
    ghsPhrasesPromise = fetch(GHS_PHRASES_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch(e => { ghsPhrasesPromise = null; throw e; });
  }
  return ghsPhrasesPromise;
}

function useGhsPhrases() {
  return useApi(() => fetchGhsPhrases(), []);
}

// 표지를 채울 물질 상세(정적 자료 먼저). chem 이 CAS 면 같은 CAS 의 KOSHA 물질을 먼저 고른다(resolveLinkChemId).
function fetchGhsLabelSource(chem) {
  if (!chem) return Promise.resolve(null);
  return resolveLinkChemId(chem).then(id => fetchChemicalDetail(id));
}

function useGhsLabelSource(chem) {
  return useApi(() => fetchGhsLabelSource(chem), [chem]);
}

Object.assign(window, { GHS_PHRASES_URL, fetchGhsPhrases, useGhsPhrases, fetchGhsLabelSource, useGhsLabelSource });
