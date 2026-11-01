// 물질 검색 순수 함수 — 자료원별 개수, 자료원 거르기 + 정렬, 자료원 묶음 머리 줄 끼우기.

function searchSourceKey(it) {
  return (it.source || "").toLowerCase();
}

function searchSourceCounts(items) {
  const c = { all: items.length, kosha: 0, echa: 0, other: 0 };
  items.forEach(it => {
    const s = searchSourceKey(it);
    if (s === "kosha") c.kosha += 1;
    else if (s === "echa") c.echa += 1;
    else c.other += 1;
  });
  return c;
}

// Group + sort: KOSHA+has_msds first, then KOSHA, then ECHA, then everything else.
// Within each group preserve backend order (already relevance-ranked).
// 검색어와 이름·영문명·CAS 가 정확히 같은 물질, 그리고 서버(검색 순위)가 1위로 준 물질을 맨 앞에 둔다.
// (예: "propylene" → 서버 1위 Propene 115-07-1 이 ECHA 자료여도 KOSHA 묶음 뒤로 밀리지 않게. 2026-10-28)
function sortSearchItems(items, sourceFilter, submitted) {
  const filtered = sourceFilter === "all" ? items : items.filter(it => {
    const s = searchSourceKey(it);
    if (sourceFilter === "other") return s !== "kosha" && s !== "echa";
    return s === sourceFilter;
  });
  const term = submitted.trim().toLowerCase();
  const exact = (it) => {
    const names = [it.cas_no, it.name_en, it.name, String(it.name || "").replace(/\s*\(.*\)\s*$/, "")];
    return names.some(n => String(n || "").trim().toLowerCase() === term);
  };
  const rank = (it) => {
    if (term && (exact(it) || it === items[0])) return -1;
    const s = searchSourceKey(it);
    if (s === "kosha" && it.has_msds) return 0;
    if (s === "kosha") return 1;
    if (s === "echa") return 2;
    return 3;
  };
  return [...filtered].sort((a, b) => rank(a) - rank(b));
}

// Visually group by source — insert section headers between groups. labels: { groupMsds, other }
function groupSearchRows(items, labels) {
  const rows = [];
  let lastGroup = null;
  items.forEach(it => {
    const groupKey = searchSourceKey(it) === "kosha" && it.has_msds ? labels.groupMsds : (it.source || labels.other);
    if (groupKey !== lastGroup) {
      rows.push({ kind: "header", key: `h-${groupKey}`, label: groupKey });
      lastGroup = groupKey;
    }
    rows.push({ kind: "row", key: `${it.id}-${it.chem_id}`, it });
  });
  return rows;
}

// 결과 표의 이름 두 칸: 한국어 화면은 (물질명, 영문명), 영어 화면은 (영문명 — 없으면 물질명, 물질명). 칸 이름: PRODUCT_LABELS.search.cols.
function searchRowNames(it) {
  const { krName: name, enName: en } = chemDisplayNames(it);
  return tr({ first: name, second: en }, { first: en || name, second: en ? name : "" });
}

Object.assign(window, { searchSourceCounts, sortSearchItems, groupSearchRows, searchRowNames });
