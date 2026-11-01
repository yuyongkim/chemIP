// API 층 · 정적 자료(Cloudflare) — 물성·식별자·운송 사실: f/<CAS>.json, f/id_<n>.json(EC·KE·InChIKey → CAS), g/un_index.json.
// 파일 형식: scripts/static_export/CONTRACT.md "f/<CAS>.json". 같은 모양의 /api 는 없다 — 정적 자료가 꺼져 있으면 null.
// 파일이 없으면(404) null = "자료 없음"(이 영역은 정적 파일이 전부라 집 PC 로 넘기지 않는다). 네트워크 오류는 던진다.
// 파일 받기·캐시는 api_static.jsx 의 staticPagesFile(같은 파일은 한 번만 받는다).

const STATIC_FACTS_CAS_RE = /^\d{2,7}-\d{2}-\d$/;

// f/<CAS>.json 본문, 없거나 정적 자료가 꺼져 있으면 null
function staticFacts(cas) {
  const c = String(cas || "").trim();
  if (!staticEnabled("pages") || !STATIC_FACTS_CAS_RE.test(c)) return Promise.resolve(null);
  return staticPagesFile(STATIC_LAYOUT.pages.facts.cas(c));
}

// f/id_<n>.json 의 keys 객체(n = ssiFnv1a32(key) % idBuckets), 없으면 null
async function staticIdShard(key) {
  if (!staticEnabled("pages")) return null;
  const F = STATIC_LAYOUT.pages.facts;
  const shard = await staticPagesFile(F.idShard(factsIdBucket(key, F.idBuckets, ssiFnv1a32)));
  return shard && shard.keys ? shard.keys : null;
}

// g/un_index.json 의 rows 객체({ "<UN>": { name, class, pg, mp, ems, n, cas } }), 없으면 null
async function staticUnIndex() {
  if (!staticEnabled("pages")) return null;
  const idx = await staticPagesFile(STATIC_LAYOUT.pages.facts.unIndex);
  return idx && idx.rows ? idx.rows : null;
}

Object.assign(window, { staticFacts, staticIdShard, staticUnIndex });
