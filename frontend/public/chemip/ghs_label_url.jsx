// 경고표지 만들기 딥링크(순수 함수).
//   ?view=ghslabel&chem=<chem_id 또는 CAS>&pict=GHS02,GHS07&size=a4|a5|small&llang=ko|en
//   chem 이 있으면 그 물질의 MSDS 2항으로 채우고, pict 는 직접 넣는 모드에서 미리 고를 그림문자.

const GHS_LABEL_VIEW = "ghslabel";
const GHS_LABEL_LANGS = ["ko", "en"];

function ghsLabelReadLink(search) {
  try {
    const p = new URLSearchParams(search || "");
    const size = (p.get("size") || "").trim();
    const llang = (p.get("llang") || "").trim();
    return {
      chem: (p.get("chem") || "").trim(),
      pict: ghsParsePictograms(p.get("pict") || "").codes,
      size: GHS_LABEL_SIZES.some(s => s.k === size) ? size : "",
      lang: GHS_LABEL_LANGS.includes(llang) ? llang : "",
    };
  } catch (e) {
    return { chem: "", pict: [], size: "", lang: "" };
  }
}

function ghsLabelHref({ chem = "", pict = [], size = "", lang = "" } = {}) {
  const p = new URLSearchParams({ view: GHS_LABEL_VIEW });
  if (chem) p.set("chem", chem);
  if (pict.length) p.set("pict", pict.join(","));
  if (size) p.set("size", size);
  if (lang) p.set("llang", lang);
  return `?${p.toString()}`;
}

Object.assign(window, { GHS_LABEL_VIEW, ghsLabelReadLink, ghsLabelHref });
