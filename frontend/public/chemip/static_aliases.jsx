// 정적 검색 · 문자열 규칙 — backend/core/chemical_aliases.py 를 그대로 옮긴 순수 함수(fetch·React 없음).
// 서버와 같은 후보어·정규화를 만들어야 미리 계산한 답(a/ 조각)의 열쇠가 맞는다. 파이썬과 다르게 움직이는 부분
// (유니코드 \d·\b·\s, str.strip, casefold, 코드 포인트 길이·정렬)은 아래 sa* 도우미로 맞춘다.
// 정규식은 new RegExp(문자열) 로 만든다 — Babel(env) 이 u 플래그·\p{..} 를 옛 문법으로 바꾸지 않게 한다.

// 파이썬 str.isspace() / re 의 \s (유니코드)
const SA_WS = "\\t\\n\\x0b\\x0c\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const SA_WORD = "\\p{L}\\p{N}_"; // 파이썬 \w (isalnum + "_")

const SA_RE = {
  cas: new RegExp(`(?<![${SA_WORD}])\\p{Nd}{2,7}-\\p{Nd}{2}-\\p{Nd}(?![${SA_WORD}])`, "gu"),
  paren: new RegExp("\\(([^)]{2,})\\)", "gu"),
  delimiter: new RegExp("[;/|]+", "u"),
  labelPrefix: new RegExp(`^(?:관용명|별칭|영문명|이명|동의어|synonyms?|alias(?:es)?|trade name)[${SA_WS}]*:[${SA_WS}]*`, "iu"),
  edgePunct: new RegExp(`^[${SA_WS},.:]+|[${SA_WS},.:]+$`, "gu"),
  whitespace: new RegExp(`[${SA_WS}]+`, "gu"),
  quotes: new RegExp("[\"'`]+", "gu"),
  strip: new RegExp(`^[${SA_WS}]+|[${SA_WS}]+$`, "gu"),
};

// str.casefold() 가운데 toLowerCase() 와 다른 것(자주 나오는 것만). 체로키 문자는 대문자로 접힌다.
const SA_CASEFOLD_EXTRA = {
  "ß": "ss", "ς": "σ", "ſ": "s", "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st",
  "ŉ": "ʼn", "ϐ": "β", "ϑ": "θ", "ϕ": "φ", "ϖ": "π", "ϰ": "κ", "ϱ": "ρ", "ϵ": "ε", "ẛ": "ṡ", "ι": "ι", "ẞ": "ss", "µ": "μ", "և": "եւ",
};

function saStrip(s) {
  return String(s).replace(SA_RE.strip, "");
}

function saCollapseWs(s) {
  return String(s).replace(SA_RE.whitespace, " ");
}

function saCasefold(s) {
  let out = "";
  for (const ch of String(s).toLowerCase()) {
    const cp = ch.codePointAt(0);
    if (SA_CASEFOLD_EXTRA[ch]) out += SA_CASEFOLD_EXTRA[ch];
    else if (cp >= 0xab70 && cp <= 0xabbf) out += String.fromCodePoint(cp - 0xab70 + 0x13a0);
    else if (cp >= 0x13f8 && cp <= 0x13fd) out += String.fromCodePoint(cp - 8);
    else out += ch;
  }
  return out;
}

// 파이썬 문자열 비교(코드 포인트 순). JS 의 < 는 UTF-16 단위로 비교해 U+E000 이상과 보충 평면에서 어긋난다.
function saCompare(a, b) {
  a = a == null ? "" : String(a);
  b = b == null ? "" : String(b);
  if (a === b) return 0;
  const ia = a[Symbol.iterator](), ib = b[Symbol.iterator]();
  for (;;) {
    const x = ia.next(), y = ib.next();
    if (x.done) return y.done ? 0 : -1;
    if (y.done) return 1;
    const cx = x.value.codePointAt(0), cy = y.value.codePointAt(0);
    if (cx !== cy) return cx < cy ? -1 : 1;
  }
}

function saLength(s) {
  return Array.from(s).length;
}

function cleanAliasValue(value) {
  let text = saStrip(value || "");
  if (!text) return "";
  text = text.split("　").join(" ");
  text = text.split("[").join("(").split("]").join(")");
  text = text.replace(SA_RE.labelPrefix, "");
  text = text.replace(SA_RE.whitespace, " ");
  text = text.replace(SA_RE.edgePunct, "");
  return saStrip(text);
}

function normalizeAlias(value) {
  const text = cleanAliasValue(value);
  if (!text) return "";
  let lowered = saCasefold(text);
  lowered = lowered.split("·").join("").split("ㆍ").join("");
  lowered = lowered.split("_").join(" ").split("-").join(" ");
  lowered = lowered.replace(SA_RE.quotes, " ");
  lowered = saStrip(lowered.replace(SA_RE.whitespace, " "));
  return lowered;
}

function saFindAll(re, text, group = 0) {
  return Array.from(String(text).matchAll(re), m => m[group]);
}

function splitAliasBlob(value) {
  const raw = cleanAliasValue(value);
  if (!raw) return [];
  const out = [];
  const seen = new Set();
  const add = (term, minLength = 2) => {
    const cleaned = cleanAliasValue(term);
    if (saLength(cleaned) < minLength) return;
    const key = normalizeAlias(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(cleaned);
  };
  add(raw);
  saFindAll(SA_RE.cas, raw).forEach(cas => add(cas));
  const stripped = cleanAliasValue(raw.replace(SA_RE.paren, " "));
  if (stripped && stripped !== raw) add(stripped);
  saFindAll(SA_RE.paren, raw, 1).forEach(match => {
    add(match);
    match.split(SA_RE.delimiter).forEach(part => add(part));
    const at = match.indexOf(":");
    if (at >= 0) add(match.slice(at + 1));
  });
  raw.split(SA_RE.delimiter).forEach(part => add(part));
  return out;
}

function extractAliasCandidates(...values) {
  const out = [];
  const seen = new Set();
  values.forEach(value => {
    splitAliasBlob(value).forEach(part => {
      const key = normalizeAlias(part);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(cleanAliasValue(part));
    });
  });
  return out;
}

function buildSearchCandidates(query) {
  const raw = cleanAliasValue(query);
  if (!raw) return [];
  const candidates = extractAliasCandidates(raw);
  const out = [];
  const seen = new Set();
  const add = term => {
    const key = normalizeAlias(term);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(cleanAliasValue(term));
  };
  add(raw);
  saFindAll(SA_RE.cas, raw).forEach(cas => add(cas));
  candidates.forEach(c => add(c));
  const normalized = normalizeAlias(raw);
  if (normalized !== saCasefold(raw)) add(normalized);
  return out;
}

function pickCanonicalChemId({ rowId, description, casNo, source }) {
  const desc = saStrip(description || "");
  const cas = saStrip(casNo || "");
  const src = saStrip(source || "") || "UNKNOWN";
  if (desc.startsWith("KOSHA_ID:")) return desc.slice(desc.indexOf(":") + 1);
  if (cas) return cas;
  if (desc) return desc;
  return `${src}:${rowId}`;
}

Object.assign(window, {
  saStrip, saCollapseWs, saCasefold, saCompare, saLength,
  cleanAliasValue, normalizeAlias, splitAliasBlob, extractAliasCandidates, buildSearchCandidates, pickCanonicalChemId,
});
