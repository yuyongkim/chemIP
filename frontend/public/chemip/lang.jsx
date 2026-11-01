// 화면 언어(ko | en). 페이지를 열 때 한 번 정하고, 모든 *_labels.jsx 가 불러올 때 그 언어로 고정한다.
// 정하는 순서: 주소 ?lang= → 이 브라우저에 저장한 값(localStorage "chemip-lang") → 브라우저 언어가 한국어면 ko
//   → 접속 나라 쿠키(chemip-geo, Worker geo_lang.js 가 붙임)가 KR 이 아니면 en → ko.
// 바꿀 때는 setChemipLang(l) — 저장하고 ?lang= 을 붙여 다시 연다(화면 코드는 언어 상태를 들고 있지 않는다).
//
// 문구 파일 규칙(LANG.md):
//   <이름>_labels.jsx      const <NAME>_KO = { ... }                       한국어(기준 모양)
//   <이름>_labels_en.jsx   const <NAME>_EN = { ... }                       같은 모양의 영어(빠진 키는 한국어로 남는다)
//                          const <NAME> = langPick(<NAME>_KO, <NAME>_EN);  화면이 읽는 이름은 그대로
//   한 줄짜리 문구는 tr("한국어", "English").

const CHEMIP_LANGS = ["ko", "en"];
const CHEMIP_LANG_KEY = "chemip-lang";

function chemipLangFromEnv(search, stored, geo = "", navLangs = []) {
  const q = new URLSearchParams(search || "").get("lang");
  if (CHEMIP_LANGS.includes(q)) return q;
  if (CHEMIP_LANGS.includes(stored)) return stored;
  if ((navLangs || []).some(l => /^ko(-|$)/i.test(String(l)))) return "ko";
  if (/^[A-Z]{2}$/.test(geo || "") && geo !== "KR") return "en";
  return "ko";
}

function chemipGeoCookie(cookie) {
  const m = /(?:^|;\s*)chemip-geo=([A-Z]{2})/.exec(cookie || "");
  return m ? m[1] : "";
}

const CHEMIP_LANG = (() => {
  let stored = null;
  try { stored = localStorage.getItem(CHEMIP_LANG_KEY); } catch {}
  const geo = typeof document !== "undefined" ? chemipGeoCookie(document.cookie) : "";
  const navLangs = typeof navigator !== "undefined" ? (navigator.languages || [navigator.language]) : [];
  const lang = chemipLangFromEnv(typeof location !== "undefined" ? location.search : "", stored, geo, navLangs);
  try { localStorage.setItem(CHEMIP_LANG_KEY, lang); } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  return lang;
})();

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// 영어 값이 있으면 영어, 없으면 한국어. 객체는 키마다 내려가며 합치고, 배열·함수·글자는 통째로 바꾼다.
function langMerge(ko, en) {
  if (en === undefined || en === null) return ko;
  if (isPlainObject(ko) && isPlainObject(en)) {
    const out = { ...ko };
    for (const k of Object.keys(en)) out[k] = langMerge(ko[k], en[k]);
    return out;
  }
  return en;
}

function langPick(ko, en, lang = CHEMIP_LANG) {
  return lang === "en" ? langMerge(ko, en) : ko;
}

function tr(ko, en) {
  return CHEMIP_LANG === "en" && en != null ? en : ko;
}

function setChemipLang(lang) {
  if (!CHEMIP_LANGS.includes(lang) || lang === CHEMIP_LANG) return;
  try { localStorage.setItem(CHEMIP_LANG_KEY, lang); } catch {}
  const url = new URL(location.href);
  url.searchParams.set("lang", lang);
  location.assign(url.toString());
}

Object.assign(window, { CHEMIP_LANGS, CHEMIP_LANG, chemipLangFromEnv, langMerge, langPick, tr, setChemipLang });
