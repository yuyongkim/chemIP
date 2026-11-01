// 용어사전 주소 — ?view=glossary&term=<key>(용어 하나 펼침), &cat=<분류>(분류 거르기). 링크 규약 docs/integration/LINK_CONTRACT_v6.md.
// 화면이 보이는 동안 주소를 지금 고른 용어·분류로 맞추고(공유·새로 고침), 다른 칸(lang 등)은 그대로 둔다.

const GLOSSARY_VIEW = "glossary";

function glossaryHref(term, cat) {
  const p = new URLSearchParams({ view: GLOSSARY_VIEW });
  if (term) p.set("term", term);
  if (cat) p.set("cat", cat);
  return `?${p.toString()}`;
}

// 주소 → { term, cat } (없으면 "")
function glossaryReadLink(search) {
  const p = new URLSearchParams(search || "");
  const clean = (v) => String(v || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 64);
  return { term: clean(p.get("term")), cat: clean(p.get("cat")) };
}

// state 가 null 이면 떠날 때: view(용어사전일 때만)·term·cat 을 지운다.
function glossaryUrlWith(href, state) {
  const url = new URL(href);
  if (!state) {
    if (url.searchParams.get("view") === GLOSSARY_VIEW) url.searchParams.delete("view");
    url.searchParams.delete("term");
    url.searchParams.delete("cat");
    return url.toString();
  }
  const { term, cat } = state;
  url.searchParams.set("view", GLOSSARY_VIEW);
  for (const [k, v] of [["term", term], ["cat", cat]]) {
    if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
  }
  return url.toString();
}

function glossarySyncUrl(state) {
  try { history.replaceState(history.state, "", glossaryUrlWith(location.href, state)); } catch (e) {}
}

Object.assign(window, { GLOSSARY_VIEW, glossaryHref, glossaryReadLink, glossaryUrlWith, glossarySyncUrl });
