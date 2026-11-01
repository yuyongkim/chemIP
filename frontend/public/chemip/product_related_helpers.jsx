// 물질 상세 · 관련 물질 순수 함수(React·fetch 없음) — rel/<CAS>.json 한 항목 → 화면 언어 이름·이유 조각.
// 문구는 넘겨받은 L(RELATED_LABELS), 규제 목록 영어 이름은 넘겨받은 enNames(REG_LIST_ENGLISH_NAMES). 시험: test_discovery.cjs

// 화면 언어 이름(주)과 다른 언어 이름(보조, 같으면 "").
function relatedNames(item, lang) {
  const ko = String((item && item.ko) || "");
  const en = String((item && item.en) || "");
  const main = lang === "en" ? (en || ko) : (ko || en);
  const sub = lang === "en" ? (ko !== main ? ko : "") : (en !== main ? en : "");
  return { main: main || String((item && item.cas) || ""), sub };
}

// why → [{ t, text }]: 계열, 규제 목록(보인 것), GHS 유해성(보인 것), 그리고 다 보이지 못한 공유 개수 한 줄.
function relatedReasons(item, L, lang, enNames) {
  const why = (item && item.why) || [];
  const out = [];
  for (const w of why) {
    if (w.t === "fam") out.push({ t: "fam", text: (L.families || {})[w.k] || w.k });
    else if (w.t === "law") out.push({ t: "law", text: (lang === "en" && enNames && enNames[w.k]) || w.ko || w.k });
    else if (w.t === "ghs") out.push({ t: "ghs", text: (L.ghs || {})[w.k] || w.k });
  }
  const shown = { law: out.filter(r => r.t === "law").length, ghs: out.filter(r => r.t === "ghs").length };
  for (const t of ["law", "ghs"]) {
    const n = Number(item && item[t === "law" ? "nl" : "ng"]) || 0;
    if (n > shown[t] && L.more && L.more[t]) out.push({ t: "more", text: L.more[t](n) });
  }
  return out;
}

Object.assign(window, { relatedNames, relatedReasons });
