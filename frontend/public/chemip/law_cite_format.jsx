// 물질 「국내 근거 조문」 패널의 인용 표기 순수 함수 — React·fetch 없음. 자료: LAW_SHORT(law_short_labels*.jsx), 화면: law_basis_*.jsx.
// 시험: frontend/scripts/tests/test_law_basis_panel.cjs
//   lawStripAmend(text)            조문 글의 <개정 …>·<신설 …>·[본조신설 …] 같은 연혁 꼬리표를 뺀다
//   lawExcerptLines(text)          발췌 → 항·호·목 줄 [{ lvl, text }] (꼬리표 뺀 뒤 law_core.jsx lawSplitBody)
//   lawCiteRole(cite)              "def"(근거 정의) | "duty"(의무 조항) | "list"(대상 목록) | "rel"(관련 조항)
//   lawShortName(name, short)      "화학물질관리법 시행령" → "화관법 시행령"(영어 화면은 영어 약칭), 모르면 원래 이름
//   lawShortLabel(label, words)    "제5조의2제1항제1호" → 영어 화면 "Art. 5-2 ¶1 No. 1", 한국어 화면은 그대로

const LAW_AMEND_RE = /\s*<(?:개정|신설|전문개정|본조신설|제목개정|타법개정|종전|시행일)[^>]*>/g;
const LAW_AMEND_BRACKET_RE = /\s*\[(?:본조신설|전문개정|제목개정|종전|시행일|본조제목개정)[^\]]*\]/g;
// 대상 목록을 정하는 조문: "…은 별표 1과 같다", "…"이란 다음 각 호…", "…"이란 별표 8의2에 따른 기준을 말한다"
const LAW_LIST_TEXT_RE = /별표\s*(?:\d+(?:의\d+)?)?\s*(?:와|과)\s*같|(?:이)?란\s*(?:다음\s*각\s*호|별표)|별표\s*\d+(?:의\d+)?(?:에|의)[^.]{0,60}(?:말한다|같다)|다음\s*각\s*호의\s*것으로\s*한다/;
const LAW_DESIGNATE_TITLE_RE = /지정(?:\s*등|ㆍ고시)?$/;
const LAW_LIST_TITLE_RE = /(대상|종류|분류|목록|지정|고시기준)/;
const LAW_DUTY_TITLE_RE = /(작성|제출|보관|설치|금지|제한|준수|측정|진단|조치|운송|규제|부과|신고|승인|등록|의무|허가|수입|수출)/;
const LAW_DUTY_TEXT_RE = /(하여야\s*한다|해야\s*한다|아니\s*된다|아니된다|받아야|할\s*것|지켜야)/;
// 목 기호(가~하)의 초성 번호(유니코드 한글 음절 = 0xAC00 + 초성×588). 가=0 나=2 다=3 … 하=18 → a, b, c …
const LAW_MOK_CHO = [0, 2, 3, 5, 6, 7, 9, 11, 12, 14, 15, 16, 17, 18];

function lawStripAmend(text) {
  return String(text || "").replace(LAW_AMEND_RE, "").replace(LAW_AMEND_BRACKET_RE, "").replace(/[ \t]{2,}/g, " ").trim();
}

// 발췌는 머리의 "제11조(제목)" 를 빼고(카드 머리에 이미 있다), 빈칸 뒤의 호 번호("…말한다. 1. …")도 줄을 나눈다.
const LAW_ART_HEAD_RE = /^제\d+조(?:의\d+)?\([^)]*\)\s*/;
const LAW_SPACED_ITEM_RE = /([^\d\s,.]|[^\d\s]\.)\s+(?=\d{1,2}(?:의\d+)?\.\s)/g;

function lawExcerptLines(text) {
  const body = lawStripAmend(text).replace(LAW_ART_HEAD_RE, "").replace(LAW_SPACED_ITEM_RE, "$1\n");
  return lawSplitBody(body);
}

function lawCiteRole(cite) {
  const c = cite || {};
  if (c.t === "annex" || c.t === "doc") return "list";
  const title = String(c.title || "");
  const text = String(c.snippet || "");
  if (/정의/.test(title)) return "def";
  if (LAW_LIST_TEXT_RE.test(text) || LAW_DESIGNATE_TITLE_RE.test(title)) return "list";
  if (LAW_LIST_TITLE_RE.test(title) && !LAW_DUTY_TITLE_RE.test(title)) return "list";
  if (LAW_DUTY_TITLE_RE.test(title) || LAW_DUTY_TEXT_RE.test(text)) return "duty";
  return "rel";
}

// short = { names: { 전체 이름: 약칭 }, suffix: { 시행령: …, 시행규칙: … } }. 이름 비교는 띄어쓰기·가운뎃점 무시(lawNormName).
function lawShortName(name, short) {
  const full = String(name || "").trim();
  const names = (short && short.names) || {};
  const byNorm = {};
  for (const k of Object.keys(names)) byNorm[lawNormName(k)] = names[k];
  const exact = byNorm[lawNormName(full)];
  if (exact) return exact;
  const m = /^(.*?)\s*(시행령|시행규칙)$/.exec(full);
  if (m && byNorm[lawNormName(m[1])]) {
    const suf = ((short && short.suffix) || {})[m[2]] || m[2];
    return `${byNorm[lawNormName(m[1])]} ${suf}`;
  }
  return full;
}

// words = { art, para, item, mok, annex } 이면 영어 표기로 바꾼다. words 가 비면 원래 표기 그대로.
function lawShortLabel(label, words) {
  const s = String(label || "").trim();
  if (!words || !words.art) return s;
  const annex = /^별표\s*(\d+)(?:의(\d+))?$/.exec(s);
  if (annex) return `${words.annex} ${annex[1]}${annex[2] ? `-${annex[2]}` : ""}`;
  const m = /^제(\d+)조(?:의(\d+))?(?:제(\d+)항)?(?:제(\d+)호(?:의(\d+))?)?(?:([가-힣])목)?$/.exec(s);
  if (!m) return s;
  let out = `${words.art} ${m[1]}${m[2] ? `-${m[2]}` : ""}`;
  if (m[3]) out += ` ${words.para}${m[3]}`;
  if (m[4]) out += ` ${words.item} ${m[4]}${m[5] ? `-${m[5]}` : ""}`;
  if (m[6]) {
    const off = m[6].charCodeAt(0) - 0xac00;
    const i = off >= 0 && off % 588 === 0 ? LAW_MOK_CHO.indexOf(off / 588) : -1;
    out += i >= 0 ? `(${String.fromCharCode(97 + i)})` : "";
  }
  return out;
}

Object.assign(window, { lawStripAmend, lawExcerptLines, lawCiteRole, lawShortName, lawShortLabel });
