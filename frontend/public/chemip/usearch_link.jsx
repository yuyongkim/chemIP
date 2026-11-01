// 통합 검색 주소 — ?view=search&q=<검색어> (링크 규약 docs/integration/LINK_CONTRACT_v6.md).
// 다른 화면(처음 화면 검색창·상단 바)에서 열 때는 검색어를 잠깐 맡겨 두고(localStorage) 화면만 바꾼다(새로 읽지 않음).
// 검색 화면은 보이는 동안 주소를 ?view=search&q= 로 맞추고(공유·새로 고침), 떠날 때 그 두 칸을 지운다.

const USEARCH_VIEW = "search";
const USEARCH_PENDING_KEY = "chemip-usearch-pending";

function usearchHref(q) {
  const p = new URLSearchParams({ view: USEARCH_VIEW });
  if (q) p.set("q", q);
  return `?${p.toString()}`;
}

function usearchOpen(q, setView) {
  try { localStorage.setItem(USEARCH_PENDING_KEY, usCleanQuery(q)); } catch (e) {}
  if (setView) setView(USEARCH_VIEW);
  else location.assign(usearchHref(usCleanQuery(q)));
}

// 처음 검색어: 맡겨 둔 값(다른 화면에서 막 연 것) → 주소의 q(?view=search 로 연 경우) → "".
function usearchInitialQuery(link) {
  let pending = null;
  try {
    pending = localStorage.getItem(USEARCH_PENDING_KEY);
    localStorage.removeItem(USEARCH_PENDING_KEY);
  } catch (e) {}
  if (pending != null) return usCleanQuery(pending);
  return link && link.view === USEARCH_VIEW ? usCleanQuery(link.query) : "";
}

// 지금 주소의 검색 칸을 바꾼 새 주소(다른 칸 — lang 등 — 은 그대로). q 가 null 이면 view·q 를 지운다.
function usearchUrlWith(href, q) {
  const url = new URL(href);
  if (q == null) {
    if (url.searchParams.get("view") === USEARCH_VIEW) url.searchParams.delete("view");
    url.searchParams.delete("q");
  } else {
    url.searchParams.set("view", USEARCH_VIEW);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
  }
  return url.toString();
}

function usearchSyncUrl(q) {
  try { history.replaceState(history.state, "", usearchUrlWith(location.href, q)); } catch (e) {}
}

Object.assign(window, { USEARCH_VIEW, usearchHref, usearchOpen, usearchInitialQuery, usearchUrlWith, usearchSyncUrl });
