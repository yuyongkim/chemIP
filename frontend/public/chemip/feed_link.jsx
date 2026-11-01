// 화학사고 소식 주소 — ?view=feed&sub=<물질 이름|CAS>&country=<코드>&src=<출처 key> (cas=<CAS> 도 sub 로 읽는다).
// 화면은 보이는 동안 주소를 거르기 상태에 맞추고(공유·새로 고침), 떠날 때 그 칸들을 지운다. 순수 함수 + replaceState 한 곳.

const FEED_VIEW = "feed";
const FEED_LINK_KEYS = { sub: "sub", country: "country", source: "src" };

function feedReadLink(search) {
  const p = new URLSearchParams(search || "");
  return {
    sub: (p.get(FEED_LINK_KEYS.sub) || p.get("cas") || "").trim(),
    country: (p.get(FEED_LINK_KEYS.country) || "").trim().toUpperCase().replace(/[^A-Z_]/g, ""),
    source: (p.get(FEED_LINK_KEYS.source) || "").trim().replace(/[^a-z0-9_]/g, ""),
  };
}

function feedHref(filters = {}) {
  const p = new URLSearchParams({ view: FEED_VIEW });
  Object.entries(FEED_LINK_KEYS).forEach(([k, name]) => { if (filters[k]) p.set(name, filters[k]); });
  return `?${p.toString()}`;
}

// 지금 주소의 소식 칸을 바꾼 새 주소(다른 칸 — lang 등 — 은 그대로). filters 가 null 이면 view·소식 칸을 지운다.
function feedUrlWith(href, filters) {
  const url = new URL(href);
  url.searchParams.delete("cas");
  Object.values(FEED_LINK_KEYS).forEach(name => url.searchParams.delete(name));
  if (filters == null) {
    if (url.searchParams.get("view") === FEED_VIEW) url.searchParams.delete("view");
    return url.toString();
  }
  url.searchParams.set("view", FEED_VIEW);
  Object.entries(FEED_LINK_KEYS).forEach(([k, name]) => { if (filters[k]) url.searchParams.set(name, filters[k]); });
  return url.toString();
}

function feedSyncUrl(filters) {
  try { history.replaceState(history.state, "", feedUrlWith(location.href, filters)); } catch (e) {}
}

Object.assign(window, { FEED_VIEW, feedReadLink, feedHref, feedUrlWith, feedSyncUrl });
