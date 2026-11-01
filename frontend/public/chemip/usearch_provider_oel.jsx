// 통합 검색 묶음 · 노출기준 — "<물질> 노출기준" · "<substance> exposure limit" · "TWA 톨루엔" 같은 질문에 답 카드 한 장.
// 노출기준 낱말(OEL_LABELS_KO·_EN.queryWords)을 떼고 남은 이름을 물질 검색(fetchChemicalSearch)에 넣어 맨 위 물질(CAS 있는 것)을 고르고,
// 그 CAS 의 정적 oel/<CAS>.json(fetchOelForSearch, api_oel.jsx)이 있으면 관할별 대표값 한 줄과 물질 상세의 노출기준 표로 가는 링크.
// 값은 출처별 참고값으로만 보인다(적합 판정 문구 없음). 질문 낱말이 있는 검색이라 답이 있으면 묶음 맨 위(딱 맞음).

const USP_OEL_FETCH = 20;    // 물질 검색과 같은 요청(미리 계산한 답이 limit 20)
const USP_OEL_TRY = 3;       // 위에서부터 CAS 몇 개까지 노출기준 파일을 찾아볼지

function usOelWords() {
  return [...(OEL_LABELS_KO.queryWords || []), ...(OEL_LABELS_EN.queryWords || [])];
}

function usOelSourceName(src) {
  return OEL_LABELS.sources[src] || src;
}

// 물질 검색 결과 중 CAS 있는 것을 이름·CAS 맞춤 점수 순으로(같으면 검색 순서). 서버 검색은 순서가 정적 검색과 다를 수 있어
// "benzene" 에 이름이 딱 맞는 벤젠이 혼합물보다 먼저 오게 한다.
function usOelCandidates(name, items) {
  return items
    .filter(it => it && it.cas_no)
    .map((it, i) => ({ it, i, s: usDocScore(name, { fields: [{ t: it.name }, { t: it.name_en }, { t: it.cas_no }] }) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.it);
}

// 물질 검색 결과 한 건 + 노출기준 파일 → 답 카드 한 건.
function usOelItem(it, file, labels) {
  const { primary } = chemDisplayNames(it);
  const n = new Set(((file && file.rows) || []).map(r => r.src)).size;
  return {
    id: `o:${it.cas_no}`,
    title: labels.search.title(primary || it.cas_no),
    sub: labels.search.sub(it.cas_no, n),
    desc: [oelSummaryLine(file, usOelSourceName), labels.search.desc].filter(Boolean).join(" — "),
    badge: labels.search.badge,
    href: `${usSubstanceHref(it)}&anchor=oel`,
    score: USEARCH_SCORE.exact,
  };
}

const USP_OEL = {
  k: "oel",
  icon: "shield",
  limit: 1,
  max: USP_OEL_TRY,
  search: async (q) => {
    const parsed = oelParseQuery(q, usOelWords());
    if (!parsed) return { items: [], total: 0 };
    const data = await fetchChemicalSearch(parsed.name, USP_OEL_FETCH);
    const seen = new Set();
    const candidates = usOelCandidates(parsed.name, (data && data.items) || []).filter(it => !seen.has(it.cas_no) && seen.add(it.cas_no)).slice(0, USP_OEL_TRY);
    const items = [];
    for (const it of candidates) {
      const file = await fetchOelForSearch(it.cas_no);
      if (file && (file.rows || []).length) items.push(usOelItem(it, file, OEL_LABELS));
    }
    return { items, total: items.length };
  },
};

Object.assign(window, { USP_OEL, usOelItem, usOelWords, usOelCandidates });
