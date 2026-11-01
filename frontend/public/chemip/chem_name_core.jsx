// 물질 이름 다듬기 순수 함수 — React·fetch 없음. 화면 이름은 product_msds_helpers.jsx chemDisplayNames 가 이것으로 만든다.
// 시험: frontend/scripts/tests/test_chem_name.cjs
//   chemSplitKoshaName(raw)   KOSHA 이름 "에틸렌 ( 관용명 : ACETENE )" → { name: "에틸렌", synonym: "ACETENE" }
//                             (관용명:…)·(관용명 …)·"; 관용명: …"·괄호가 잘린 꼴·겹친 꼴 "아조벤젠 (AZOBENZENE) (아조벤젠 ( 관용명 : … ))" 도 읽는다.
//                             관용명이 없으면 { name: raw(앞뒤 공백 정리), synonym: "" }.
//   chemPickEnName(list)      f/<CAS>.json names.en 에서 화면용 영어 이름 하나 — ";" 로 묶인 동의어 줄보다 단일 이름, 대문자로 시작하는 것 먼저.

// "관용명" 표지(한국어 원자료의 낱말) — 정규식으로만 쓴다.
const CHEM_SYN_OPEN_RE = /\(\s*관용명\s*[:：]?\s*/;
const CHEM_SYN_TAIL_RE = /[;；]\s*관용명\s*[:：]\s*(.*)$/;

function chemTidy(s) {
  return String(s || "").replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
}

// open = "(" 위치. KOSHA 관용명 덩어리는 " )"(빈칸 + 닫는 괄호)로 끝나므로 그것을 먼저 쓰고(관용명 안 괄호가 잘려 짝이 안 맞아도 된다),
// 없으면 짝 맞는 ")", 그것도 없으면 -1(끝까지).
function chemCloseOf(s, open) {
  const loose = s.indexOf(" )", open);
  if (loose >= 0) return loose + 1;
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth += 1;
    else if (s[i] === ")") { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

function chemCleanSynonym(s) {
  let t = chemTidy(s).replace(/[;,；\s]+$/, "");
  const opens = (t.match(/\(/g) || []).length;
  const closes = (t.match(/\)/g) || []).length;
  if (opens > closes) t = `${t}…)`;
  return t;
}

// 관용명 덩어리를 뺀 앞부분에서 빈 괄호, 앞 이름을 되풀이한 괄호("(아조벤젠)")를 지운다.
function chemCleanBase(s) {
  let t = chemTidy(s).replace(/\(\s*\)/g, "").trim();
  const head = /^([^(]+?)\s*\(/.exec(t);
  if (head) {
    const base = head[1].trim().toLowerCase();
    t = t.replace(/\s*\(([^()]*)\)/g, (m, inner) => (inner.trim().toLowerCase() === base ? "" : m));
  }
  return chemDropUnmatchedClose(chemTidy(t)).replace(/[;,]\s*$/, "").trim();
}

// 짝 없는 ")" 를 지운다(관용명 덩어리를 떼고 남은 겹괄호 꼬리).
function chemDropUnmatchedClose(s) {
  let depth = 0;
  let out = "";
  for (const ch of s) {
    if (ch === "(") depth += 1;
    else if (ch === ")") { if (depth === 0) continue; depth -= 1; }
    out += ch;
  }
  return out;
}

// 관용명 덩어리 하나를 떼어 { rest, synonym }. 없으면 null.
function chemTakeSynonym(s) {
  const m = CHEM_SYN_OPEN_RE.exec(s);
  if (!m) return null;
  const close = chemCloseOf(s, m.index);
  const inner = close >= 0 ? s.slice(m.index + m[0].length, close) : s.slice(m.index + m[0].length);
  return { rest: s.slice(0, m.index) + (close >= 0 ? s.slice(close + 1) : ""), synonym: chemCleanSynonym(inner) };
}

function chemSplitKoshaName(raw) {
  let s = String(raw || "");
  const tail = CHEM_SYN_TAIL_RE.exec(s);
  if (tail) return { name: chemCleanBase(s.slice(0, tail.index)), synonym: chemCleanSynonym(tail[1]) };
  const synonyms = [];
  for (let took = chemTakeSynonym(s); took; took = chemTakeSynonym(s)) {
    s = took.rest;
    if (took.synonym) synonyms.push(took.synonym);
  }
  if (!synonyms.length) return { name: chemTidy(s), synonym: "" };
  const name = chemCleanBase(s);
  return name ? { name, synonym: synonyms[0] } : { name: synonyms[0], synonym: "" };
}

function chemPickEnName(list) {
  const names = (list || []).map(x => String(x || "").trim()).filter(Boolean);
  const single = names.filter(n => !/[;；]/.test(n));
  return single.find(n => /^[A-Z0-9]/.test(n) && /[a-z]/.test(n)) || single[0] || (names[0] ? names[0].split(/[;；]/)[0].trim() : "");
}

Object.assign(window, { chemSplitKoshaName, chemPickEnName });
