// 정적 검색 · 물질 검색 — 시범 static_search.py 의 검색 부분(TerminologyDB.search_chemicals 재현)을 옮겼다.
// 순서: 미리 계산한 답(a/ 조각의 q) → 별칭·동의어가 없으면 가벼운 FTS(lean) → 있으면 서버와 같은 전체 계산.
// 돌려주는 모양은 GET /api/chemicals?q=&page=&limit= 와 같다: { items: [...], total }.
// 파일은 StaticSearchIndex(static_search_index.jsx) 가 넘겨받은 load 로만 읽는다.

const SS_PRECOMPUTED_LIMIT = 20; // 미리 계산한 답은 화면이 쓰는 limit=20 기준(manifest.search_limit 이 있으면 그 값)
// casefold 와 lower 가 다를 수 있는 글자(ß·µ·ŉ·ǰ·그리스 변형·ς·아르메니아 합자·체로키·ẖ~ẞ·그리스 확장·합자). 보수적으로 넓게 잡는다.
const SS_CASEFOLD_UNSTABLE = new RegExp("[\u00b5\u00df\u0149\u017f\u01f0\u0390\u03b0\u03c2\u03d0\u03d1\u03d5\u03d6\u03f0\u03f1\u03f5\u0587\u13f8-\u13fd\u1e96-\u1e9e\u1f50-\u1f56\u1f80-\u1fff\uab70-\uabbf\ufb00-\ufb06\ufb13-\ufb17]", "u");

async function ssSerialize(index, docId) {
  const [name, cas, desc, nameEn, source] = await index.doc(docId);
  const d = desc || "";
  const chemId = d.startsWith("KOSHA_ID:") ? d.slice(d.indexOf(":") + 1) : null;
  return {
    id: docId, name: name || null, cas_no: cas || null,
    chem_id: chemId ? chemId : (cas ? cas : null),
    name_en: nameEn || null, source: source || null, has_msds: source === "KOSHA",
  };
}

// 여러 물질을 한꺼번에 펼친다. 문서 조각은 동시에 받는다(같은 조각은 staticGetJson 이 한 번만 받는다). 순서는 ids 그대로.
function ssSerializeAll(index, ids) {
  return Promise.all(ids.map(d => ssSerialize(index, d)));
}

function ssRankCompare(scoreOf) {
  return (a, b) => (scoreOf(b) - scoreOf(a)) || saCompare(a.name || "", b.name || "") || saCompare(a.source || "", b.source || "");
}

// 점수 규칙 — backend/core/terminology/ranking.py 를 그대로 옮겼다. 값은 manifest.ranking(= backend/data/search/ranking.json).
// manifest 에 ranking 이 없으면(시범 산출물) 시범 때 규칙(정확 CAS 260·이름 180, 괄호 주석 비교 없음, 동의어·보정 없음).
const SS_PILOT_RANKING = {
  pilot: true, alias_hit_base: 900, alias_hit_step: 40, synonym_hit_base: 900, fts_base: 500, fts_term_step: 40,
  fts_row_step: 6, exact_cas: 260, exact_name: 180, synonym_tier_bonus: {}, base_name: 0, kosha: 40,
  derivative_penalty: 0, derivative_terms: [],
};
const SS_LOCANTS = new RegExp("^[0-9]+(?:,[0-9]+)* ");
const SS_SYNONYM_PREFIX = "syn_"; // static_export config.SYNONYM_TYPE_PREFIX

function ssRanking(index) {
  return index.manifest.ranking || SS_PILOT_RANKING;
}

function ssBaseOf(value, w) {
  const v = value == null ? "" : String(value);
  return normalizeAlias(w.pilot ? v : v.split("(")[0]);
}

function ssScore(item, { base, query, synTier, heuristics }, w) {
  const nq = normalizeAlias(query);
  let s = base;
  if (saStrip(item.cas_no || "") === cleanAliasValue(query)) s += w.exact_cas;
  const bases = [ssBaseOf(item.name, w), ssBaseOf(item.name_en, w)];
  let bonus = bases.includes(nq) ? w.exact_name : 0;
  if (synTier) bonus = Math.max(bonus, w.synonym_tier_bonus[synTier] || 0);
  if (heuristics && !bonus && nq && bases.map(b => b.replace(SS_LOCANTS, "")).includes(nq)) bonus = w.base_name;
  s += bonus;
  if (item.source === "KOSHA") s += w.kosha;
  if (heuristics && bonus < w.exact_name) {
    const text = normalizeAlias(item.name) + " " + normalizeAlias(item.name_en);
    if (w.derivative_terms.some(t => text.includes(t) && !nq.includes(t))) s -= w.derivative_penalty;
  }
  return s;
}

// 한 alias_norm 아래 저장된 줄을 별칭(chemical_aliases)과 동의어(syn_*, 물질 행마다 한 줄)로 나눈다. 저장 순서 유지.
async function ssAliasEntries(index, norm) {
  const types = index.manifest.alias_types;
  const shard = ssiOwn(await index.aliasShard(norm), "a") || {};
  const rows = [], syns = [];
  for (const e of ssiOwn(shard, norm) || []) {
    const t = Number.isInteger(e[1]) ? types[e[1]] : e[1];
    (String(t).startsWith(SS_SYNONYM_PREFIX) ? syns : rows).push([e, t]);
  }
  return { rows, syns };
}

async function ssAliasMatches(index, query, limit) {
  const rows = new Map();
  for (const cand of buildSearchCandidates(query)) {
    const norm = normalizeAlias(cand);
    if (!norm) continue;
    for (const [[alias, , conf, ref], atype] of (await ssAliasEntries(index, norm)).rows.slice(0, Math.max(1, limit))) {
      let canon, name, nameEn, cas, source;
      if (Number.isInteger(ref)) {
        const [n, c, desc, ne, src] = await index.doc(ref);
        [name, cas, nameEn, source] = [n, c, ne, src];
        canon = pickCanonicalChemId({ rowId: ref, description: desc, casNo: cas, source });
      } else {
        [canon, name, nameEn, cas, source] = ref;
      }
      const item = rows.get(canon);
      const confidence = Number(conf || 0);
      if (item === undefined || confidence > item.confidence) {
        rows.set(canon, {
          canonical_id: canon, alias, alias_type: atype,
          name: name || "", name_en: nameEn || "", cas_no: cas || "", source: source || "", confidence,
        });
      }
    }
  }
  return [...rows.values()];
}

// 후보어마다 동의어 줄의 [물질 id, 맞은 이름] (서버: SynonymIndex.hits → 그 CAS 의 행 전부).
async function ssSynonymDocs(index, query) {
  const out = [];
  if (ssRanking(index).pilot) return out;
  for (const cand of buildSearchCandidates(query)) {
    const norm = normalizeAlias(cand);
    if (norm) for (const [e] of (await ssAliasEntries(index, norm)).syns) out.push([e[3], e[0]]);
  }
  return out;
}

// 질의 전체(정규화)가 어느 CAS 의 등록명/이명인지: cas → tier (서버: SynonymIndex.tier).
async function ssSynonymTiers(index, nq) {
  const tiers = new Map();
  if (!nq || ssRanking(index).pilot) return tiers;
  for (const [e, t] of (await ssAliasEntries(index, nq)).syns) tiers.set((await index.doc(e[3]))[1], t.slice(SS_SYNONYM_PREFIX.length));
  return tiers;
}

// 서버 search_chemicals 그대로(동의어 행 → 별칭 일치 → FTS 하위 검색, 후보어 FTS, 점수 합치기).
async function ssSearchChemicals(index, query, limit = 10, offset = 0) {
  const candidates = buildSearchCandidates(query);
  if (!candidates.length) return { items: [], total: 0 };
  const w = ssRanking(index);
  const aliasHits = await ssAliasMatches(index, query, Math.max(6, limit * 2));
  const synDocs = await ssSynonymDocs(index, query);
  const heuristics = aliasHits.length > 0 || synDocs.length > 0;
  const tiers = await ssSynonymTiers(index, normalizeAlias(query));
  const merged = new Map();
  const merge = (item, base, matched = "") => {
    const score = ssScore(item, { base, query, synTier: tiers.get(saStrip(item.cas_no || "")), heuristics }, w);
    const ex = merged.get(item.id);
    if (ex === undefined || score > ex._score) merged.set(item.id, { ...item, _score: score, _matched_alias: matched });
  };
  (await ssSerializeAll(index, synDocs.map(([d]) => d))).forEach((item, i) => merge(item, w.synonym_hit_base, synDocs[i][1]));
  for (let hi = 0; hi < aliasHits.length; hi++) {
    const hit = aliasHits[hi];
    const terms = extractAliasCandidates(hit.alias, hit.name, hit.name_en, hit.cas_no).slice(0, 4);
    for (const term of terms) {
      for (const item of await ssSerializeAll(index, await index.fts(term, Math.max(8, limit * 3)))) {
        if (hit.cas_no && item.cas_no !== hit.cas_no && item.chem_id !== hit.canonical_id) continue;
        merge(item, w.alias_hit_base - hi * w.alias_hit_step, hit.alias || "");
      }
    }
  }
  const cands = candidates.slice(0, 5);
  for (let ti = 0; ti < cands.length; ti++) {
    const items = await ssSerializeAll(index, await index.fts(cands[ti], Math.max(12, limit * 4)));
    items.forEach((item, ri) => merge(item, w.fts_base - ti * w.fts_term_step - ri * w.fts_row_step));
  }
  const ranked = [...merged.values()].sort(ssRankCompare(it => it._score));
  const page = ranked.slice(offset, offset + Math.max(1, limit));
  const strip = it => Object.fromEntries(Object.entries(it).filter(([k]) => !k.startsWith("_")));
  return { items: page.map(strip), total: ranked.length };
}

// 별칭·동의어가 하나도 없으면 이름·CAS 가산점과 보정(ranking.py heuristics)이 생길 수 없다(이름·영문명·CAS 는 모두 별칭 열쇠).
// 그래서 FTS 순서와 KOSHA 표시(docmeta)만으로 점수가 정해지고, 물질 기록은 한 쪽(+동점)만 받는다.
async function ssLean(index, query, limit) {
  const w = ssRanking(index);
  const scores = new Map();
  const docmeta = await index.docmeta();
  const cands = buildSearchCandidates(query).slice(0, 5);
  for (let ti = 0; ti < cands.length; ti++) {
    const docs = await index.fts(cands[ti], Math.max(12, limit * 4));
    docs.forEach((d, ri) => {
      const s = w.fts_base - ti * w.fts_term_step - ri * w.fts_row_step + (docmeta[d] & 1 ? w.kosha : 0);
      if (s > (scores.has(d) ? scores.get(d) : -1e9)) scores.set(d, s);
    });
  }
  const order = [...scores.keys()].sort((a, b) => scores.get(b) - scores.get(a));
  if (!order.length) return { items: [], total: 0 };
  const cutoff = scores.get(order[Math.min(limit, order.length) - 1]);
  const head = await ssSerializeAll(index, order.filter(d => scores.get(d) >= cutoff));
  head.sort(ssRankCompare(it => scores.get(it.id)));
  return { items: head.slice(0, limit), total: order.length };
}

// 운영 경로. mode 는 시험·진단용(화면은 쓰지 않는다).
async function ssSearch(index, query, limit = SS_PRECOMPUTED_LIMIT) {
  await index.init();
  const cleaned = cleanAliasValue(query);
  const key = cleaned.toLowerCase();
  if (!key) return { items: [], total: 0, mode: "empty" };
  // 미리 계산한 답의 열쇠는 파이썬 casefold(). lower 와 같은(casefold 안정) 질의에서만 쓴다(CONTRACT "Search keys").
  const stable = !SS_CASEFOLD_UNSTABLE.test(key) && saCasefold(cleaned) === key;
  const shard = await index.aliasShard(normalizeAlias(query));
  const pre = stable ? ssiOwn(ssiOwn(shard, "q") || {}, key) : undefined;
  if (pre != null && limit === (index.manifest.search_limit || SS_PRECOMPUTED_LIMIT)) {
    return { items: await ssSerializeAll(index, pre.slice(1)), total: pre[0], mode: "precomputed" };
  }
  const hasSynonym = (await ssSynonymDocs(index, query)).length > 0;
  if ((await ssAliasMatches(index, query, Math.max(6, limit * 2))).length || hasSynonym) {
    return { ...(await ssSearchChemicals(index, query, limit)), mode: "client_full" };
  }
  return { ...(await ssLean(index, query, limit)), mode: "client_fts" };
}

// GET /api/chemicals?q=&page=&limit= 와 같은 모양.
async function staticChemicalSearchWith(index, q, page = 1, limit = 10) {
  const query = saStrip(q || "");
  if (!query) return { items: [], total: 0 };
  await index.init();
  const offset = (Math.max(1, page) - 1) * limit;
  const res = offset === 0 ? await ssSearch(index, query, limit) : await ssSearchChemicals(index, query, limit, offset);
  return { items: res.items, total: res.total };
}

// GET /api/chemicals/autocomplete?q=&limit= 와 같은 모양(항목 배열).
async function staticAutocompleteWith(index, q, limit = 5) {
  const query = saStrip(q || "");
  if (!query) return [];
  await index.init();
  return (await ssSearchChemicals(index, query, limit, 0)).items;
}

Object.assign(window, { ssSearch, ssSearchChemicals, ssLean, ssAliasMatches, ssScore, staticChemicalSearchWith, staticAutocompleteWith });
