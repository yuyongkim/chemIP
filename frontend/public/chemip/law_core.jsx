// 국내 법령 보기(?view=law, law_*.jsx)·물질 「국내 근거 조문」 패널(product_law_basis.jsx)의 순수 함수 — React·fetch 없음.
// 자료 모양: scripts/static_export/CONTRACT.md "law/" (index.json·toc.json·lists.json·<id>.json·cas_<n>.json).
// 시험: frontend/scripts/tests/test_law_viewer.cjs
//   lawReadParams / lawUrlWith / lawViewHref   주소(?view=law&law=<id 또는 이름>&art=<조번호>&q=<찾을 말>)
//   lawArtLabel / lawArtAnchor / lawGoKrArticleUrl / lawFromGoKrUrl   조 번호 표기·앵커·법제처 주소
//   lawResolveDoc / lawDocsByKind / lawSearchCorpus   목록·이름 찾기·말뭉치 제목 찾기
//   lawItemLines / lawSplitBody / lawItemText / lawSearchItems / lawHighlight / lawTocEntries   본문 줄·찾기·차례
//   lawCasBucket / lawProvisionModel   물질 패널 모양

const LAW_VIEW = "law";
const LAW_PARAMS = ["law", "art", "q"];
const LAW_CIRCLED_RE = /[①-⑳]/;
const LAW_HEADING_DEPTH = { 편: 0, 장: 1, 절: 2, 관: 3 };
// 목 기호(가.~하.) — 법령 목 번호에 쓰는 글자만(아무 한글 한 글자 + 마침표가 아니다)
const LAW_MOK_RE = /^[가나다라마바사아자차카타파하]\.\s/;
const LAW_MOK_SPLIT_RE = /([.다>)]|\S\s)(?=[가나다라마바사아자차카타파하]\.\s)/g;

/* ── 주소 ── */
function lawReadParams(search) {
  try {
    const p = new URLSearchParams(search || "");
    return { law: (p.get("law") || "").trim(), art: (p.get("art") || "").trim(), q: (p.get("q") || "").trim() };
  } catch (e) {
    return { law: "", art: "", q: "" };
  }
}

// href 의 law·art·q 를 params 값으로 바꾼다(빈 값은 지운다). 다른 값(view·lang …)은 그대로.
function lawUrlWith(href, params) {
  try {
    const u = new URL(href);
    for (const k of LAW_PARAMS) {
      const v = params && params[k];
      if (v) u.searchParams.set(k, v); else u.searchParams.delete(k);
    }
    return u.pathname + u.search + u.hash;
  } catch (e) {
    return href;
  }
}

function lawViewHref(law, art = "", q = "") {
  const p = new URLSearchParams({ view: LAW_VIEW });
  if (law) p.set("law", law);
  if (art) p.set("art", art);
  if (q) p.set("q", q);
  return `?${p.toString()}`;
}

/* ── 조 번호 ── */
// "7의2" → "제7조의2", "본문" → "본문"
function lawArtLabel(no) {
  const m = /^(\d+)(?:의(\d+))?$/.exec(String(no || ""));
  return m ? `제${m[1]}조${m[2] ? `의${m[2]}` : ""}` : String(no || "");
}

function lawArtAnchor(no) {
  const m = /^(\d+)(?:의(\d+))?$/.exec(String(no || ""));
  if (m) return `law-art-${m[1]}${m[2] ? `-${m[2]}` : ""}`;
  const b = /^본문(\d*)$/.exec(String(no || ""));
  return b ? `law-art-body${b[1]}` : "";
}

// 법제처 조문 주소(법령만, 행정규칙은 그 규칙 주소). meta = index.json docs 의 한 줄 또는 <id>.json 머리.
function lawGoKrArticleUrl(meta, no) {
  if (!meta) return "";
  return meta.art_url && /^\d/.test(String(no || "")) ? meta.art_url.replace("{art}", lawArtLabel(no)) : (meta.url || "");
}

// "https://www.law.go.kr/법령/산업안전보건법시행령/제43조" → { name: "산업안전보건법시행령", art: "43" }. 다른 모양은 null.
function lawFromGoKrUrl(url) {
  let path = "";
  try { path = decodeURIComponent(new URL(url).pathname); } catch (e) { return null; }
  const m = /^\/(법령|행정규칙)\/([^/]+)(?:\/제(\d+)조(?:의(\d+))?)?\/?$/.exec(path);
  if (!m) return null;
  return { name: m[2], art: m[3] ? (m[4] ? `${m[3]}의${m[4]}` : m[3]) : "" };
}

/* ── 목록·이름 ── */
function lawNormName(s) {
  return String(s || "").replace(/[\s·‧・•ㆍ「」]/g, "");
}

// id("law_000162") 또는 법령 이름(띄어쓰기·가운뎃점 무시) → index.json docs 의 한 줄, 없으면 null
function lawResolveDoc(index, key) {
  const docs = (index && index.docs) || [];
  const k = String(key || "").trim();
  if (!k) return null;
  return docs.find(d => d.id === k) || docs.find(d => lawNormName(d.name) === lawNormName(k)) || null;
}

// [{ kind, kind_word, docs }] — 법령 먼저, 이름순(index.json 순서 그대로)
function lawDocsByKind(index) {
  const out = [];
  for (const d of (index && index.docs) || []) {
    let g = out.find(x => x.kind === d.kind);
    if (!g) { g = { kind: d.kind, kind_word: d.kind_word, docs: [] }; out.push(g); }
    g.docs.push(d);
  }
  return out;
}

function lawFold(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, "");
}

// 말뭉치 찾기: 법령 이름 → 조문 제목·장절 제목(toc.json). [{ doc, name, no, t, title }] 이름 맞는 것 먼저.
function lawSearchCorpus(index, toc, q, limit = 60) {
  const f = lawFold(q);
  if (!f) return [];
  const names = Object.fromEntries(((index && index.docs) || []).map(d => [d.id, d.name]));
  const docs = ((index && index.docs) || []).filter(d => lawFold(d.name).includes(f))
    .map(d => ({ doc: d.id, name: d.name, no: "", t: "doc", title: "" }));
  const rows = ((toc && toc.rows) || []).filter(r => names[r[0]] && lawFold(r[3]).includes(f))
    .map(([doc, t, no, title]) => ({ doc, name: names[doc], no: t === "h" ? "" : no, t, title }));
  return [...docs, ...rows].slice(0, limit);
}

/* ── 본문 줄 ── */
// 행정규칙 본문(줄바꿈 없이 붙은 글)을 항(①)·호(1.)·목(가.) 앞에서 나눈다. [{ lvl: 0|1|2, text }]
function lawSplitBody(text) {
  const out = [];
  for (const raw of String(text || "").split("\n")) {
    const parts = raw
      .replace(/(?!^)([①-⑳])/g, "\n$1")
      .replace(/([^\d\s제,~\-])(?=\d{1,2}(?:의\d+)?\.\s)/g, "$1\n")
      .replace(LAW_MOK_SPLIT_RE, "$1\n")
      .split("\n");
    for (const p of parts) {
      const t = p.trim();
      if (!t) continue;
      const lvl = LAW_CIRCLED_RE.test(t[0]) ? 0 : /^\d{1,2}(?:의\d+)?\.\s/.test(t) ? 1 : LAW_MOK_RE.test(t) ? 2 : 0;
      out.push({ lvl, text: t });
    }
  }
  return out;
}

// 조문 하나 → 줄 [{ lvl, text }]: 머리(조문내용) 0, 항 0, 호 1, 목 2. 항/호/목이 없는 조문은 lawSplitBody.
function lawItemLines(item) {
  if (!item) return [];
  if (!item.paras) return lawSplitBody(item.text);
  const out = [];
  for (const line of String(item.head || "").split("\n")) if (line.trim()) out.push({ lvl: 0, text: line.trim() });
  for (const p of item.paras) {
    if (p.text) out.push({ lvl: 0, text: p.text });
    for (const it of p.items || []) {
      if (it.text) out.push({ lvl: 1, text: it.text });
      for (const s of it.sub || []) if (s.text) out.push({ lvl: 2, text: s.text });
    }
  }
  return out;
}

function lawItemText(item) {
  if (!item) return "";
  if (item.t === "h") return item.text || "";
  return [item.title || "", ...lawItemLines(item).map(l => l.text)].join("\n");
}

// 법령 하나 안에서 찾기: 맞는 조문(장절 제목 포함)의 순번 배열
function lawSearchItems(items, q) {
  const f = lawFold(q);
  if (!f) return [];
  const out = [];
  (items || []).forEach((it, i) => { if (lawFold(lawItemText(it)).includes(f)) out.push(i); });
  return out;
}

// 글 → [{ t, hit }] (찾을 말을 띄어쓰기 무시·대소문자 무시로 표시)
function lawHighlight(text, q) {
  const s = String(text || "");
  const f = lawFold(q);
  if (!f) return [{ t: s, hit: false }];
  const chars = [];
  for (let i = 0; i < s.length; i++) if (!/\s/.test(s[i])) chars.push(i);
  const folded = chars.map(i => s[i].toLowerCase()).join("");
  const out = [];
  let last = 0;
  let from = 0;
  for (;;) {
    const at = folded.indexOf(f, from);
    if (at < 0) break;
    const a = chars[at];
    const b = chars[at + f.length - 1] + 1;
    if (a > last) out.push({ t: s.slice(last, a), hit: false });
    out.push({ t: s.slice(a, b), hit: true });
    last = b;
    from = at + f.length;
  }
  if (last < s.length) out.push({ t: s.slice(last), hit: false });
  return out.length ? out : [{ t: s, hit: false }];
}

// 차례: [{ i, t: "h"|"a"|"b", no, label, title, depth }] — 장절은 편·장·절·관 깊이, 조문은 그 아래
function lawTocEntries(items) {
  let depth = 0;
  return (items || []).map((it, i) => {
    if (it.t === "h") {
      const m = /제\s*\d+\s*(?:의\s*\d+\s*)?(편|장|절|관)/.exec(it.text || "");
      depth = m ? LAW_HEADING_DEPTH[m[1]] : 0;
      return { i, t: "h", no: it.no, label: (it.text || "").trim(), title: "", depth };
    }
    return { i, t: it.t, no: it.no, label: lawArtLabel(it.no), title: it.title || "", depth: depth + 1 };
  });
}

/* ── 물질 패널 ── */
function lawCasBucket(cas, buckets, hash) {
  return hash(String(cas || "").trim()) % buckets;
}

// 물질 하나: 조각(cas_<n>.json 의 cas[CAS]) + lists.json + index.json → 화면 모양. 자료가 없으면 null.
//   { lists: [{ id, title, group, basis, cites: [{ ...cite, href, goKr, ext }] }], mentions: [{ doc, name, no, label, term, snippet, href, goKr }], mentionTotal, asOf }
function lawProvisionModel(entry, lists, index) {
  if (!entry) return null;
  const metaOf = id => ((index && index.docs) || []).find(d => d.id === id) || null;
  const cite = c => {
    const meta = metaOf(c.doc);
    const art = c.t === "art" ? c.no : "";
    return { ...c, href: lawViewHref(c.doc, art), goKr: lawGoKrArticleUrl(meta, art), ext: c.pdf || c.file || "" };
  };
  const L = (lists && lists.lists) || {};
  const outLists = (entry.l || []).filter(id => L[id]).map(id => ({ id, title: L[id].title, group: L[id].group, basis: L[id].basis,
    cites: (L[id].cites || []).map(cite) }));
  const mentions = (entry.m || []).map(([doc, no, term, snippet]) => {
    const meta = metaOf(doc);
    return { doc, name: meta ? meta.name : doc, no, label: lawArtLabel(no), term, snippet,
      href: lawViewHref(doc, /^\d/.test(no) || /^본문/.test(no) ? no : "", term), goKr: lawGoKrArticleUrl(meta, no) };
  });
  if (!outLists.length && !mentions.length) return null;
  return { lists: outLists, mentions, mentionTotal: entry.mn || mentions.length, asOf: (lists && lists.as_of) || (index && index.as_of) || "" };
}

Object.assign(window, {
  LAW_VIEW, lawReadParams, lawUrlWith, lawViewHref, lawArtLabel, lawArtAnchor, lawGoKrArticleUrl, lawFromGoKrUrl,
  lawNormName, lawResolveDoc, lawDocsByKind, lawSearchCorpus, lawSplitBody, lawItemLines, lawItemText, lawSearchItems,
  lawHighlight, lawTocEntries, lawCasBucket, lawProvisionModel,
});
