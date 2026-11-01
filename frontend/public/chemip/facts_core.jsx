// 물성·식별자·운송 사실 · 순수 함수(React·fetch 없음). 자료 모양: scripts/static_export/CONTRACT.md "f/<CAS>.json".
// - factsParseQuery: "벤젠 인화점" / "benzene flash point" / "flash point of toluene" → { prop, substance }
// - factsAnswer: f/<CAS>.json + 물성 → 답 카드 모양, factsStripItems: 물질 상세 "주요 물성" 줄 모양
// - factsDetectId / factsDetectUn: 검색어가 EC·KE·InChIKey·UN 번호인지, factsIdBucket: f/id_<n>.json 번호
// 시험: frontend/scripts/tests/test_portal_facts.cjs

const FACTS_ID_RES = [
  { type: "ec", re: /^\d{3}-\d{3}-\d$/ },
  { type: "ke", re: /^KE-?\d{5}$/i },
  { type: "ke", re: /^KE-\d{2}-\d{4}$/i },
  { type: "inchikey", re: /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i },
];
const FACTS_UN_RE = /^(?:UN|유엔)?\s*-?\s*(\d{4})$/i;
const FACTS_HANGUL_RE = /[가-힣]/;
// 답 카드·주요 물성 줄에서 물성 키 하나가 가리키는 f/ 행 이름들(폭발 범위 = 하한 + 상한)
const FACTS_PROP_ROWS = { flammability: ["lfl", "ufl"] };
// "주요 물성" 줄에 보일 물성(순서대로, 값이 있는 것만)
const FACTS_STRIP_PROPS = ["flash_point", "boiling_point", "melting_point", "flammability", "autoignition", "vapor_pressure", "relative_density", "molar_mass"];

function factsNorm(s) {
  return String(s == null ? "" : s).normalize("NFKC").toLowerCase().replace(/[\s·_\-]+/g, " ").trim();
}

// 물성 키 → 알아볼 낱말(한·영 두 벌, 긴 것 먼저)
function factsPropWords(labelSets) {
  const out = [];
  for (const L of labelSets || []) {
    for (const [k, v] of Object.entries((L && L.props) || {})) {
      for (const w of (v && v.words) || []) out.push({ k, w: factsNorm(w) });
    }
  }
  return out.filter(x => x.w).sort((a, b) => b.w.length - a.w.length);
}

function factsTrim(s, trails) {
  let t = String(s || "").trim();
  for (const tr of trails || []) {
    const n = factsNorm(tr);
    if (!n) continue;
    if (FACTS_HANGUL_RE.test(n) && t.endsWith(n)) t = t.slice(0, -n.length).trim();
    else if (t.endsWith(` ${n}`)) t = t.slice(0, -(n.length + 1)).trim();
    else if (t.startsWith(`${n} `)) t = t.slice(n.length + 1).trim();
  }
  return t.replace(/[\s'’?？]+$/g, "").trim();
}

// 검색어 → { prop, substance } 또는 null. 물성 낱말은 앞이나 뒤 한 곳(띄어 쓴 낱말 경계, 한글 낱말은 붙여 써도 됨).
function factsParseQuery(q, labelSets) {
  const nq = factsNorm(q).replace(/[?？]+$/, "").trim();
  if (!nq) return null;
  const trails = (labelSets || []).flatMap(L => (L && L.substanceTrail) || []);
  for (const { k, w } of factsPropWords(labelSets)) {
    let rest = null;
    if (nq.endsWith(` ${w}`)) rest = nq.slice(0, -(w.length + 1));
    else if (nq.startsWith(`${w} `)) rest = nq.slice(w.length + 1);
    else if (FACTS_HANGUL_RE.test(w) && nq.endsWith(w) && nq.length > w.length) rest = nq.slice(0, -w.length);
    if (rest == null) continue;
    const substance = factsTrim(rest, trails);
    if (substance && substance.length >= 2) return { prop: k, substance };
  }
  return null;
}

// 검색 결과 물질 가운데 답에 쓸 하나: CAS 가 있는 것 중 이름(한·영)이 검색어와 같은 것, 없으면 첫 번째.
function factsPickItem(items, substance) {
  const withCas = (items || []).filter(it => it && /^\d{2,7}-\d{2}-\d$/.test(String(it.cas_no || "")));
  const n = factsNorm(substance);
  const same = withCas.find(it => [it.name, it.name_en].some(x => factsNorm(x) === n || factsNorm(String(x || "").replace(/\s*\(.*\)\s*$/, "")) === n));
  return same || withCas[0] || null;
}

function factsRows(facts, prop) {
  const props = (facts && facts.props) || {};
  return (FACTS_PROP_ROWS[prop] || [prop]).map(p => ({ p, row: (props[p] || [])[0] || null }));
}

// 원문 값 글자에서 끝의 "(조건)" 을 뗀다(조건은 따로 보인다).
function factsValueText(row) {
  const t = String((row && row.t) || "").trim();
  if (!row || !row.c) return t;
  const cut = t.replace(/\s*\(+[^()]*\)*\)?\s*$/, "").trim();
  return cut || t;
}

function factsFmtNum(n) {
  if (n == null || !Number.isFinite(Number(n))) return "";
  const v = Number(n);
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e7)) return v.toExponential(2);
  return String(Math.round(v * 1e4) / 1e4);
}

// 화면에 보일 값: 원문(조건 뗌). 영어 화면에서 원문에 한글이 있으면 숫자·SI 단위로, 숫자가 없으면 원문 그대로(sourceText).
function factsDisplayValue(row, lang) {
  const t = factsValueText(row);
  if (lang === "en" && FACTS_HANGUL_RE.test(t) && row && row.n != null) {
    return { text: `${factsFmtNum(row.n)}${row.u ? ` ${row.u}` : ""}`, sourceText: false };
  }
  return { text: t, sourceText: FACTS_HANGUL_RE.test(t) };
}

// "벤젠(BENZENE)" → 영어 화면에서는 괄호 속 영어. 한글이 없으면 그대로.
function factsEnglishPart(s, lang) {
  const t = String(s || "").trim();
  if (lang !== "en" || !FACTS_HANGUL_RE.test(t)) return t;
  const parts = [...t.matchAll(/\(([^()]*)\)/g)].map(m => m[1].trim()).filter(p => p && !FACTS_HANGUL_RE.test(p));
  return parts.length ? parts[parts.length - 1] : t;
}

function factsSourceName(facts, sid) {
  const s = ((facts && facts.sources) || {})[sid];
  return (s && s.name) || sid || "";
}

// 물질 하나의 물성 하나 → 답 카드 모양 또는 null(값 없음).
//   { prop, label, title, values: [{ part, text, sourceText, condition, origin }], source, href, cas }
function factsAnswer(facts, prop, item, labels, lang) {
  if (!facts || !prop) return null;
  const L = labels;
  const kr = item ? chemSplitKoshaName(item.name).name : ""; // KOSHA "( 관용명 : … )" 뗀 이름(chem_name_core.jsx)
  const name = item ? (lang === "en" ? (item.name_en || kr) : (kr || item.name_en)) : ((facts.names || {})[lang === "en" ? "en" : "ko"] || [])[0];
  const label = ((L.props || {})[prop] || {}).label || prop;
  const href = `?view=product&pv=chemical&chem=${encodeURIComponent((item && (item.chem_id || item.cas_no)) || facts.link || facts.cas)}`;
  if (prop === "transport") {
    const t = (facts.transport || [])[0];
    if (!t) return null;
    return { prop, label, title: L.answerTitle(label, name || facts.cas), cas: facts.cas, href, transport: factsTransportView(t, L, lang),
      values: [], source: factsSourceName(facts, t.s) };
  }
  const rows = factsRows(facts, prop).filter(x => x.row);
  if (!rows.length) return null;
  const values = rows.map(({ p, row }) => ({
    part: p === "lfl" ? L.lower : p === "ufl" ? L.upper : "",
    ...factsDisplayValue(row, lang),
    condition: row.c || "",
    origin: row.o || "",
  }));
  return { prop, label, title: L.answerTitle(label, name || facts.cas), cas: facts.cas, href, values, source: factsSourceName(facts, rows[0].row.s) };
}

function factsTransportView(t, L, lang) {
  const T = L.transport;
  const mp = t.mp === "yes" ? T.mpYes : t.mp === "no" ? T.mpNo : "";
  return {
    un: t.un,
    name: factsEnglishPart(t.name, lang),
    facts: [
      t.class && { k: "cls", label: T.cls, value: t.class },
      t.pg && { k: "pg", label: T.pg, value: t.pg },
      t.ems && { k: "ems", label: T.ems, value: t.ems },
      mp && { k: "mp", label: T.mp, value: mp },
    ].filter(Boolean),
  };
}

// 물질 상세 "주요 물성" 줄: [{ k, label, text, sourceText, origin }] (값 있는 것만, FACTS_STRIP_PROPS 순서) + 운송(UN)
function factsStripItems(facts, labels, lang) {
  if (!facts) return [];
  const L = labels;
  const out = [];
  for (const prop of FACTS_STRIP_PROPS) {
    const rows = factsRows(facts, prop).filter(x => x.row);
    if (!rows.length) continue;
    const shown = rows.map(({ row }) => factsDisplayValue(row, lang));
    const text = prop === "flammability"
      ? rows.map(({ p }, i) => `${p === "lfl" ? L.lower : L.upper} ${shown[i].text}`).join(" · ")
      : shown[0].text;
    out.push({ k: prop, label: ((L.props || {})[prop] || {}).label || prop, text, sourceText: shown.some(s => s.sourceText),
      origin: rows[0].row.o || "", condition: rows[0].row.c || "" });
  }
  const t = (facts.transport || [])[0];
  if (t) {
    const v = factsTransportView(t, L, lang);
    out.push({ k: "transport", label: L.props.transport.label,
      text: [`UN ${v.un}`, ...v.facts.filter(f => f.k === "cls" || f.k === "pg").map(f => `${f.label} ${f.value}`)].join(" · "),
      sourceText: false, origin: "", condition: "" });
  }
  return out;
}

// 검색어가 EC·KE·InChIKey 면 { type, key }(key = 대문자·공백 없음, f/id_<n>.json 열쇠), 아니면 null.
function factsDetectId(q) {
  const s = String(q || "").trim().replace(/\s+/g, "");
  for (const { type, re } of FACTS_ID_RES) {
    if (re.test(s)) {
      let key = s.toUpperCase();
      if (type === "ke" && /^KE\d{5}$/.test(key)) key = `KE-${key.slice(2)}`;
      return { type, key };
    }
  }
  return null;
}

// "UN1114" · "UN 1114" · "유엔 1114" · "1114" → { un: "1114", prefixed }. 아니면 null.
function factsDetectUn(q) {
  const s = String(q || "").trim();
  const m = s.match(FACTS_UN_RE);
  return m ? { un: m[1], prefixed: !/^\d{4}$/.test(s) } : null;
}

function factsIdBucket(key, buckets, hash) {
  return hash(String(key || "").replace(/\s+/g, "").toUpperCase()) % buckets;
}

// 한·영 이름 둘 → 화면 언어 이름 먼저
function factsPickName(ko, en, lang) {
  return (lang === "en" ? (en || ko) : (ko || en)) || "";
}

Object.assign(window, {
  FACTS_PROP_ROWS, FACTS_STRIP_PROPS, factsNorm, factsPropWords, factsParseQuery, factsPickItem, factsRows, factsValueText,
  factsFmtNum, factsDisplayValue, factsEnglishPart, factsAnswer, factsTransportView, factsStripItems, factsDetectId,
  factsDetectUn, factsIdBucket, factsPickName,
});
