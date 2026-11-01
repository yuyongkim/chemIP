// 통합 검색 · 순수 함수(React·fetch 없음) — 글자 맞추기 점수, 문서 순위, 묶음 보기 모양, 묶음 순서, 강조 조각.
// 묶음(provider)은 usearch_provider_*.jsx, 등록은 usearch_providers.jsx, 요청 훅은 api_usearch.jsx, 화면은 usearch_view.jsx.
// 시험: frontend/scripts/tests/test_unified_search.cjs
//
// 문서(doc) 모양:  { id, fields: [{ t: 글자, w: 무게 0..1 }], item }
// 결과(item) 모양: { id, title, sub?, desc?, badge?, href?, external?, score }

const USEARCH_SCORE = { exact: 100, prefix: 85, wordPrefix: 70, contains: 55, allTokens: 40 };
const USEARCH_EXACT = 85;          // 묶음의 가장 좋은 점수가 이 이상이면 그 묶음을 맨 위로 올린다(이름이 딱 맞음)
const USEARCH_MIN_CONTAINS = 2;    // 가운데 포함 맞춤은 정규화한 검색어가 2자 이상일 때만(한 글자 잡음 방지)
const USEARCH_QUERY_MAX = 100;
// 비교할 때 지우는 글자: 공백·가운뎃점·하이픈·괄호·문장부호. "flash point" = "flashpoint", "71-43-2" = "71432".
const USEARCH_STRIP_RE = /[\s·・•_\-‐‑–—/\\().,:;'"`’‘“”\[\]{}|+]+/g;
const USEARCH_TOKEN_RE = /[\s·・•_\-‐‑–—/\\().,:;'"`’‘“”\[\]{}|+]+/;

function usCleanQuery(q) {
  return String(q == null ? "" : q).trim().replace(/\s+/g, " ").slice(0, USEARCH_QUERY_MAX);
}

function usNorm(s) {
  return String(s == null ? "" : s).normalize("NFKC").toLowerCase().replace(USEARCH_STRIP_RE, "");
}

function usTokens(s) {
  return String(s == null ? "" : s).normalize("NFKC").toLowerCase().split(USEARCH_TOKEN_RE).filter(Boolean);
}

// 글자 하나에 대한 맞춤 점수(0 = 안 맞음). 같음 > 앞부분 > 낱말 앞부분 > 가운데 포함 > 검색어 낱말이 모두 포함.
function usFieldScore(query, text) {
  const nq = usNorm(query);
  const nt = usNorm(text);
  if (!nq || !nt) return 0;
  if (nt === nq) return USEARCH_SCORE.exact;
  if (nt.startsWith(nq)) return USEARCH_SCORE.prefix;
  const qTokens = usTokens(query);
  const tTokens = usTokens(text);
  if (qTokens.length && tTokens.some(t => t.startsWith(qTokens[0])) && nt.includes(nq)) return USEARCH_SCORE.wordPrefix;
  if (nq.length >= USEARCH_MIN_CONTAINS && nt.includes(nq)) return USEARCH_SCORE.contains;
  if (qTokens.length > 1 && qTokens.every(t => nt.includes(usNorm(t)))) return USEARCH_SCORE.allTokens;
  return 0;
}

// 문서 점수 = 칸마다 (맞춤 점수 × 무게) 가운데 가장 큰 값.
function usDocScore(query, doc) {
  let best = 0;
  for (const f of (doc && doc.fields) || []) {
    if (!f || !f.t) continue;
    const s = usFieldScore(query, f.t) * (f.w == null ? 1 : f.w);
    if (s > best) best = s;
  }
  return Math.round(best * 10) / 10;
}

// 점수 > 0 인 문서의 item 을 점수 높은 순으로(같으면 원래 순서). item 에 score 를 붙여 새 객체로 돌려준다.
function usRankDocs(query, docs) {
  const q = usCleanQuery(query);
  if (!q) return [];
  return (docs || [])
    .map((doc, i) => ({ doc, i, score: usDocScore(q, doc) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(x => ({ ...x.doc.item, score: x.score }));
}

// 묶음 하나의 화면 모양. state = { status: "loading" | "done" | "error", items, total, moreHref?, error? }
function usGroupView(provider, state) {
  const st = state || { status: "loading", items: [], total: 0 };
  const items = st.items || [];
  const limit = provider.limit || 5;
  const total = Math.max(Number(st.total) || 0, items.length);
  const shown = items.slice(0, limit);
  return {
    k: provider.k,
    icon: provider.icon || "search",
    status: st.status,
    error: st.error || "",
    items: shown,
    extra: items.slice(limit, provider.max || items.length),
    total,
    hidden: Math.max(0, total - shown.length),
    moreHref: st.moreHref || "",
    best: items.reduce((m, it) => Math.max(m, Number(it.score) || 0), 0),
  };
}

// 묶음 순서: (0) 이름이 딱 맞는 결과가 있는 묶음 → (1) 결과가 있거나 찾는 중인 묶음 → (2) 결과 없음·실패. 같은 단계는 등록 순서.
function usGroupTier(g) {
  if (g.status === "loading") return 1;
  if (g.status === "done" && g.items.length) return g.best >= USEARCH_EXACT ? 0 : 1;
  return 2;
}

function usOrderGroups(groups) {
  return (groups || [])
    .map((g, i) => ({ g, i, tier: usGroupTier(g) }))
    .sort((a, b) => a.tier - b.tier || a.i - b.i)
    .map(x => x.g);
}

// 등록 목록 + 묶음별 상태 → { shown: 보일 묶음(순서대로), empty: 결과 없는 묶음, failed: 불러오지 못한 묶음, loading, total }
function usBuildResults(providers, states) {
  const groups = usOrderGroups((providers || []).map(p => usGroupView(p, (states || {})[p.k])));
  return {
    shown: groups.filter(g => usGroupTier(g) < 2),
    empty: groups.filter(g => g.status === "done" && !g.items.length),
    failed: groups.filter(g => g.status === "error"),
    loading: groups.some(g => g.status === "loading"),
    total: groups.reduce((n, g) => n + (g.status === "done" ? g.total : 0), 0),
  };
}

// 강조: text 를 [{ t, hit }] 조각으로(대소문자 무시, 검색어 그대로 또는 공백으로 나눈 낱말). 화면은 hit 조각만 <mark>.
function usHighlight(text, query) {
  const s = String(text == null ? "" : text);
  const words = usUnique([usCleanQuery(query), ...usTokens(query).filter(w => w.length >= USEARCH_MIN_CONTAINS)]);
  if (!s || !words.length) return [{ t: s, hit: false }];
  const lower = s.toLowerCase();
  const marks = new Array(s.length).fill(false);
  for (const w of words) {
    const lw = w.toLowerCase();
    let at = lower.indexOf(lw);
    while (at !== -1 && lw) {
      for (let i = at; i < at + lw.length; i++) marks[i] = true;
      at = lower.indexOf(lw, at + lw.length);
    }
  }
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const last = out[out.length - 1];
    if (last && last.hit === marks[i]) last.t += s[i];
    else out.push({ t: s[i], hit: marks[i] });
  }
  return out;
}

function usUnique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

Object.assign(window, {
  USEARCH_SCORE, USEARCH_EXACT, usCleanQuery, usNorm, usTokens, usFieldScore, usDocScore, usRankDocs,
  usGroupView, usGroupTier, usOrderGroups, usBuildResults, usHighlight, usUnique,
});
