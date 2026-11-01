// API · 화학물질 검색·자동완성·물질 상세(정적 자료 먼저), 고른 물질 기억(localStorage).

function fetchChemicalSearch(q, limit = 20) {
  return staticFirst(() => staticChemicalSearch(q, 1, limit), () => apiGet(`/chemicals?q=${encodeURIComponent(q)}&limit=${limit}`));
}

function fetchChemicalAutocomplete(q, limit = 5) {
  return staticFirst(() => staticAutocomplete(q, limit), () => apiGet(`/chemicals/autocomplete?q=${encodeURIComponent(q)}&limit=${limit}`));
}

function fetchChemicalDetail(chemId) {
  return staticFirst(() => staticChemicalDetail(chemId), () => originGet(`/chemicals/${encodeURIComponent(chemId)}`));
}

// 링크의 chem 이 CAS 면(다른 사이트가 CAS 로 잇는다) 같은 CAS 의 KOSHA 물질(MSDS 있음 우선)을 고른다.
// 검색에서 같은 CAS 가 없으면 받은 값 그대로(CAS 파일은 늘 있다, CONTRACT "CAS → file always works").
const LINK_CAS_RE = /^\d{2,7}-\d{2}-\d$/;
function linkPreferredItem(items, cas) {
  const same = (items || []).filter(it => it.cas_no === cas && it.chem_id);
  return same.find(it => it.has_msds) || same.find(it => it.source === "KOSHA") || null;
}
async function resolveLinkChemId(chemId) {
  if (!LINK_CAS_RE.test(chemId)) return chemId;
  try {
    const hit = linkPreferredItem((await fetchChemicalSearch(chemId, 20)).items, chemId);
    return hit ? hit.chem_id : chemId;
  } catch (e) {
    return chemId;
  }
}

function useChemicalSearch(q) {
  return useApi(
    () => q ? fetchChemicalSearch(q, 20) : Promise.resolve({ items: [] }),
    [q]
  );
}

function useChemicalDetail(chemId) {
  return useApi(
    () => chemId ? fetchChemicalDetail(chemId) : Promise.resolve(null),
    [chemId]
  );
}

/* Shared currently-selected chemical state — kept in localStorage so views agree */
function useSelectedChemical() {
  const [chem, setChem] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("chemip-selected") || "null"); }
    catch { return null; }
  });
  const update = (c) => {
    setChem(c);
    try { localStorage.setItem("chemip-selected", JSON.stringify(c)); } catch {}
  };
  return [chem, update];
}

// 고른 물질에 영문명이 없으면(KOSHA 이름이 "에틸렌 ( 관용명 : ACETENE )" 뿐인 경우 등) 정적 f/<CAS>.json names.en 에서
// 단일 영어 이름 하나를 골라(chem_name_core.jsx chemPickEnName, 예: "Ethylene") 고른 물질에 채운다. 자료가 없으면 그대로.
function useEnglishNameFill(selected, setSelected) {
  const latest = React.useRef(selected);
  latest.current = selected;
  const cas = selected && !selected.name_en ? selected.cas_no || "" : "";
  React.useEffect(() => {
    if (!cas) return;
    let alive = true;
    fetchFacts(cas)
      .then(f => {
        const en = chemPickEnName(f && f.names && f.names.en);
        const cur = latest.current;
        if (alive && en && cur && cur.cas_no === cas && !cur.name_en) setSelected({ ...cur, name_en: en });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [cas]);
}

Object.assign(window, {
  fetchChemicalSearch, fetchChemicalAutocomplete, fetchChemicalDetail, resolveLinkChemId,
  useChemicalSearch, useChemicalDetail, useSelectedChemical, useEnglishNameFill,
});
