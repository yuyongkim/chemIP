// API 층 · 국내 법령 말뭉치(정적, 읽기 전용). 형식: scripts/static_export/CONTRACT.md "law/".
// 뿌리는 다른 정적 영역(api_el.jsx)과 같다: 정적 자료가 켜져 있으면 static_config.jsx 의 pages 뿌리(배포 /data/v1, 집 PC 가 꺼져도 R2),
// 꺼져 있으면 같은 주소 /data/<version>(PC 사이트: Next → backend/api/routes/static_areas.py). 404 = 자료 없음 → null.
// 화면 컴포넌트는 fetch 하지 않고 아래 함수·훅만 쓴다. 받기·gzip·캐시 = staticGetJson(api_static.jsx).
//   fetchLawIndex()              law/index.json(법령 목록·조각 수)
//   fetchLawToc()                law/toc.json(조문 제목·장절 — 말뭉치 찾기)
//   fetchLawDoc(id)              law/<id>.json(본문·별표·연혁)
//   fetchLawProvisions(cas)      물질 하나의 근거 조문 모양(lawProvisionModel) 또는 null
//   useLawIndex(on) · useLawToc(on) · useLawDoc(id) · useLawProvisions(cas, on)

const LAW_FALLBACK_BASE = "/data";
const LAW_ID_RE = /^(law|admrul)_[0-9A-Za-z]+$/;
const LAW_CAS_RE = /^\d{2,7}-\d{2}-\d$/;

function lawUrl(rel) {
  const cfg = staticConfig();
  const root = cfg.roots.pages || `${LAW_FALLBACK_BASE}/${cfg.version}`;
  return `${root}/${rel}`;
}

function fetchLawIndex() {
  return staticGetJson(lawUrl(STATIC_LAYOUT.pages.law.index));
}

function fetchLawToc() {
  return staticGetJson(lawUrl(STATIC_LAYOUT.pages.law.toc));
}

function fetchLawLists() {
  return staticGetJson(lawUrl(STATIC_LAYOUT.pages.law.lists));
}

function fetchLawDoc(id) {
  if (!LAW_ID_RE.test(id || "")) return Promise.resolve(null);
  return staticGetJson(lawUrl(STATIC_LAYOUT.pages.law.doc(id)));
}

async function fetchLawProvisions(cas) {
  const c = String(cas || "").trim();
  if (!LAW_CAS_RE.test(c)) return null;
  const index = await fetchLawIndex();
  if (!index || !index.cas_buckets) return null;
  const n = lawCasBucket(c, index.cas_buckets, ssiFnv1a32);
  const [shard, lists] = await Promise.all([staticGetJson(lawUrl(STATIC_LAYOUT.pages.law.casShard(n))), fetchLawLists()]);
  return lawProvisionModel(shard && shard.cas ? shard.cas[c] : null, lists, index);
}

function useLawIndex(enabled = true) {
  return useApi(() => (enabled ? fetchLawIndex() : Promise.resolve(null)), [enabled]);
}

function useLawToc(enabled = true) {
  return useApi(() => (enabled ? fetchLawToc() : Promise.resolve(null)), [enabled]);
}

function useLawDoc(id) {
  return useApi(() => (id ? fetchLawDoc(id) : Promise.resolve(null)), [id]);
}

function useLawProvisions(cas, enabled = true) {
  return useApi(() => (cas && enabled ? fetchLawProvisions(cas) : Promise.resolve(null)), [cas, enabled]);
}

Object.assign(window, { lawUrl, fetchLawIndex, fetchLawToc, fetchLawLists, fetchLawDoc, fetchLawProvisions,
  useLawIndex, useLawToc, useLawDoc, useLawProvisions });
