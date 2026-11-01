// 문서 제목·설명 — index.html 의 한국어 메타가 검색 노출 기본값이다. 영어 화면에서만 APP_LABELS.meta 로 바꾼다.
// 대표 주소(canonical·og:url): index.html 은 /chemip 하나다. 검색 노출용으로 따로 세는 주소(영어 ?lang=en, 용어사전 용어
// ?view=glossary&term=)에서만 그 주소 자신으로 바꾼다(hreflang 짝·sitemap 과 맞춤). 나머지 화면은 그대로 /chemip.

// 대표 주소에 남기는 칸: 화면 key → 함께 남길 칸. lang 은 "en" 일 때만 남긴다(한국어가 기본).
const APP_INDEXABLE_VIEWS = { glossary: ["term"] };
const APP_OG_LOCALES = { ko: "ko_KR", en: "en_US" };

// 주소의 ?… → 대표 주소의 ?…(없으면 ""). 순수 함수.
function appCanonicalSearch(search) {
  const p = new URLSearchParams(search || "");
  const out = new URLSearchParams();
  const view = (p.get("view") || "").trim();
  const keep = APP_INDEXABLE_VIEWS[view];
  if (keep) {
    out.set("view", view);
    for (const k of keep) if ((p.get(k) || "").trim()) out.set(k, p.get(k).trim());
  }
  if (p.get("lang") === "en") out.set("lang", "en");
  const s = out.toString();
  return s ? `?${s}` : "";
}

// 같은 화면의 다른 언어 주소의 ?… (hreflang 짝). lang: "ko" | "en". 순수 함수.
function appAlternateSearch(search, lang) {
  const p = new URLSearchParams(search || "");
  p.delete("lang");
  if (lang === "en") p.set("lang", "en");
  return appCanonicalSearch(`?${p.toString()}`);
}

function appApplyCanonical(search, lang) {
  const link = document.querySelector('link[rel="canonical"]');
  if (!link) return;
  const base = link.getAttribute("href").split("?")[0];
  const href = base + appCanonicalSearch(search);
  link.setAttribute("href", href);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute("content", href);
  for (const alt of document.querySelectorAll('link[rel="alternate"][hreflang]')) {
    const hl = alt.getAttribute("hreflang");
    alt.setAttribute("href", base + appAlternateSearch(search, hl === "en" ? "en" : "ko"));
  }
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale && APP_OG_LOCALES[lang]) ogLocale.setAttribute("content", APP_OG_LOCALES[lang]);
}

function appApplyDocumentMeta(meta) {
  try { appApplyCanonical(location.search, CHEMIP_LANG); } catch (e) {}
  if (!meta) return;
  if (meta.title) document.title = meta.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && meta.description) desc.setAttribute("content", meta.description);
}

Object.assign(window, { appApplyDocumentMeta, appCanonicalSearch, appAlternateSearch, APP_INDEXABLE_VIEWS });
