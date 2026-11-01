// KOSHA 기술지침 본문 검색 · 순수 함수(React·fetch 없음). 파일 받기는 api_guide_text.jsx, 묶음은 usearch_provider_guides.jsx.
// 색인 형식: scripts/static_export/CONTRACT.md "gs/ — KOSHA guide full text". 만드는 쪽 scripts/static_export/guide_text_build.py 와
// 정규화·두 글자 조각·조각 번호가 같아야 한다(시험 frontend/scripts/tests/test_guide_text.cjs).
//   정규화 = NFKC → 소문자 → 글자·숫자만 남김.  조각(bigram) = 정규화한 글자의 연속 두 글자.  조각 번호 = fnv1a32(조각) % shards.
// PDF 에서 뽑은 한글 본문은 띄어쓰기가 거의 없어 낱말 색인 대신 두 글자 조각 색인을 쓰고, 마지막에 본문에서 정확히 맞는지 다시 본다.

const GT_NORM = "nfkc-lower-alnum-bigram";
const GT_KEEP_RE = /[\p{L}\p{N}]/u;
const GT_MAX_BIGRAMS = 8;      // 긴 검색어는 고르게 8조각만 받는다(후보는 넓어지고, 본문 확인이 정확히 거른다)
const GT_SNIPPET_BEFORE = 50;
const GT_SNIPPET_AFTER = 110;

function gtNorm(s) {
  let out = "";
  for (const ch of String(s == null ? "" : s).normalize("NFKC").toLowerCase()) if (GT_KEEP_RE.test(ch)) out += ch;
  return out;
}

// 정규화한 글자와, 정규화 글자 하나하나가 원문 몇 번째 글자에서 왔는지(map[i] = 원문 위치).
function gtNormMap(text) {
  const src = String(text == null ? "" : text);
  let norm = "";
  const map = [];
  let at = 0;
  for (const ch of src) {
    for (const n of ch.normalize("NFKC").toLowerCase()) {
      if (GT_KEEP_RE.test(n)) { norm += n; for (let k = 0; k < n.length; k++) map.push(at); }
    }
    at += ch.length;
  }
  return { norm, map };
}

function gtBigrams(norm) {
  const chars = Array.from(norm || "");
  const seen = new Set();
  const out = [];
  for (let i = 0; i + 1 < chars.length; i++) {
    const b = chars[i] + chars[i + 1];
    if (!seen.has(b)) { seen.add(b); out.push(b); }
  }
  return out;
}

// 받을 조각: 다른 조각 가운데 고르게 GT_MAX_BIGRAMS 개(처음과 끝은 늘 포함).
function gtPickBigrams(list, max = GT_MAX_BIGRAMS) {
  if (list.length <= max) return list.slice();
  const out = [];
  for (let i = 0; i < max; i++) out.push(list[Math.round((i * (list.length - 1)) / (max - 1))]);
  return [...new Set(out)];
}

function gtShardOf(bigram, shards) {
  return ssiFnv1a32(bigram) % shards;
}

// [docDelta, tf, docDelta, tf, ...] → Map(doc 번호 → tf)
function gtDecode(arr) {
  const out = new Map();
  let doc = 0;
  for (let j = 0; j + 1 < (arr || []).length; j += 2) { doc += arr[j]; out.set(doc, arr[j + 1]); }
  return out;
}

// 조각마다의 목록 → 모든 조각이 든 문서와 그 가운데 가장 작은 tf(구절 횟수의 위 한계). 조각 하나라도 없으면 [].
function gtCandidates(postingsByBigram, bigrams) {
  let acc = null;
  for (const b of bigrams) {
    const m = gtDecode(postingsByBigram[b]);
    if (!m.size) return [];
    if (!acc) { acc = m; continue; }
    const next = new Map();
    for (const [doc, tf] of acc) if (m.has(doc)) next.set(doc, Math.min(tf, m.get(doc)));
    acc = next;
    if (!acc.size) return [];
  }
  return acc ? [...acc].map(([doc, tf]) => ({ doc, tf })) : [];
}

// 확인할 순서: 제목에 검색어가 든 지침 먼저, 그다음 tf 큰 순, 같으면 문서 순서.
function gtOrderCandidates(cands, rows, qnorm) {
  const inTitle = (c) => (gtNorm((rows[c.doc] || [])[1]).includes(qnorm) ? 1 : 0);
  return cands.map(c => ({ ...c, title: inTitle(c) })).sort((a, b) => b.title - a.title || b.tf - a.tf || a.doc - b.doc);
}

// 본문(쪽 배열)에서 정규화한 검색어 찾기 → { count, page(1부터), snippet } 또는 null(없음).
// 발췌 자리: 표지(1쪽)·목차(점선 ····· 이 이어진 곳)가 아닌 첫 자리를 고른다. 그런 자리가 없으면 맨 처음 자리.
const GT_TOC_RE = /[·.․…]{5,}/;

function gtFindInPages(pages, qnorm) {
  if (!qnorm) return null;
  let count = 0;
  let first = null;
  let best = null;
  (pages || []).forEach((text, i) => {
    const { norm, map } = gtNormMap(text);
    let at = norm.indexOf(qnorm);
    while (at !== -1) {
      count++;
      const hit = { page: i + 1, text, start: map[at], end: map[at + qnorm.length - 1] + 1 };
      if (!first) first = hit;
      if (!best && i > 0 && !GT_TOC_RE.test(gtSnippet(text, hit.start, hit.end))) best = hit;
      at = norm.indexOf(qnorm, at + qnorm.length);
    }
  });
  if (!first) return null;
  const pick = best || first;
  return { count, page: pick.page, snippet: gtSnippet(pick.text, pick.start, pick.end) };
}

function gtSnippet(text, start, end) {
  const s = String(text || "");
  const a = Math.max(0, start - GT_SNIPPET_BEFORE);
  const b = Math.min(s.length, end + GT_SNIPPET_AFTER);
  return `${a > 0 ? "… " : ""}${s.slice(a, b).trim()}${b < s.length ? " …" : ""}`;
}

Object.assign(window, {
  GT_NORM, GT_MAX_BIGRAMS, gtNorm, gtNormMap, gtBigrams, gtPickBigrams, gtShardOf, gtDecode, gtCandidates, gtOrderCandidates,
  gtFindInPages, gtSnippet,
});
