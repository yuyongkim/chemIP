// 정적 검색 · 물질 검색 — 시범 static_search.py 의 검색 부분(TerminologyDB.search_chemicals 재현)을 옮겼다.
// 순서: 미리 계산한 답(a/ 조각의 q) → 별칭이 없으면 가벼운 FTS(lean) → 별칭이 있으면 서버와 같은 전체 계산.
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

function ssRankCompare(scoreOf) {
  return (a, b) => (scoreOf(b) - scoreOf(a)) || saCompare(a.name || "", b.name || "") || saCompare(a.source || "", b.source || "");
}

async function ssAliasMatches(index, query, limit) {
  const types = index.manifest.alias_types;
  const rows = new Map();
  for (const cand of buildSearchCandidates(query)) {
    const norm = normalizeAlias(cand);
    if (!norm) continue;
    const shard = ssiOwn(await index.aliasShard(norm), "a") || {};
    for (const [alias, tcode, conf, ref] of (ssiOwn(shard, norm) || []).slice(0, Math.max(1, limit))) {
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
          canonical_id: canon, alias, alias_type: Number.isInteger(tcode) ? types[tcode] : tcode,
          name: name || "", name_en: nameEn || "", cas_no: cas || "", source: source || "", confidence,
        });
      }
    }
  }
  return [...rows.values()];
}

// 서버 search_chemicals 그대로(별칭 일치 → FTS 하위 검색, 후보어 FTS, 점수 합치기).
async function ssSearchChemicals(index, query, limit = 10, offset = 0) {
  const candidates = buildSearchCandidates(query);
  if (!candidates.length) return { items: [], total: 0 };
  const nq = normalizeAlias(query);
  const cleanedQuery = cleanAliasValue(query);
  const aliasHits = await ssAliasMatches(index, query, Math.max(6, limit * 2));
  const merged = new Map();
  const merge = (item, base, matched = "") => {
    let score = base;
    if (saStrip(item.cas_no || "") === cleanedQuery) score += 260;
    if (normalizeAlias(item.name) === nq || normalizeAlias(item.name_en) === nq) score += 180;
    if (item.source === "KOSHA") score += 40;
    const ex = merged.get(item.id);
    if (ex === undefined || score > ex._score) merged.set(item.id, { ...item, _score: score, _matched_alias: matched });
  };
  for (let hi = 0; hi < aliasHits.length; hi++) {
    const hit = aliasHits[hi];
    const terms = extractAliasCandidates(hit.alias, hit.name, hit.name_en, hit.cas_no).slice(0, 4);
    for (const term of terms) {
      for (const d of await index.fts(term, Math.max(8, limit * 3))) {
        const item = await ssSerialize(index, d);
        if (hit.cas_no && item.cas_no !== hit.cas_no && item.chem_id !== hit.canonical_id) continue;
        merge(item, 900 - hi * 40, hit.alias || "");
      }
    }
  }
  const cands = candidates.slice(0, 5);
  for (let ti = 0; ti < cands.length; ti++) {
    const docs = await index.fts(cands[ti], Math.max(12, limit * 4));
    for (let ri = 0; ri < docs.length; ri++) merge(await ssSerialize(index, docs[ri]), 500 - ti * 40 - ri * 6);
  }
  const ranked = [...merged.values()].sort(ssRankCompare(it => it._score));
  const page = ranked.slice(offset, offset + Math.max(1, limit));
  const strip = it => Object.fromEntries(Object.entries(it).filter(([k]) => !k.startsWith("_")));
  return { items: page.map(strip), total: ranked.length };
}

// 별칭이 하나도 없으면 이름·CAS 정확 일치 가산점이 생길 수 없다(이름·영문명·CAS 는 모두 별칭 열쇠).
// 그래서 FTS 순서와 KOSHA 표시(docmeta)만으로 점수가 정해지고, 물질 기록은 한 쪽(+동점)만 받는다.
async function ssLean(index, query, limit) {
  const scores = new Map();
  const docmeta = await index.docmeta();
  const cands = buildSearchCandidates(query).slice(0, 5);
  for (let ti = 0; ti < cands.length; ti++) {
    const docs = await index.fts(cands[ti], Math.max(12, limit * 4));
    docs.forEach((d, ri) => {
      const s = 500 - ti * 40 - ri * 6 + (docmeta[d] & 1 ? 40 : 0);
      if (s > (scores.has(d) ? scores.get(d) : -1e9)) scores.set(d, s);
    });
  }
  const order = [...scores.keys()].sort((a, b) => scores.get(b) - scores.get(a));
  if (!order.length) return { items: [], total: 0 };
  const cutoff = scores.get(order[Math.min(limit, order.length) - 1]);
  const head = [];
  for (const d of order) if (scores.get(d) >= cutoff) head.push(await ssSerialize(index, d));
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
    const items = [];
    for (const d of pre.slice(1)) items.push(await ssSerialize(index, d));
    return { items, total: pre[0], mode: "precomputed" };
  }
  if ((await ssAliasMatches(index, query, Math.max(6, limit * 2))).length) {
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

Object.assign(window, { ssSearch, ssSearchChemicals, ssLean, ssAliasMatches, staticChemicalSearchWith, staticAutocompleteWith });
