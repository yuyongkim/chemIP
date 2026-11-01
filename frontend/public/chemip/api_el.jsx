// API 층 · 비상대응 기준(정적, 읽기 전용). 형식: scripts/static_export/CONTRACT.md "el/<CAS>.json"·"el/index.json".
// 뿌리는 노출기준(api_oel.jsx)과 같다: 정적 자료가 켜져 있으면 static_config.jsx 의 pages 뿌리(배포 /data/v1, 집 PC 가 꺼져도 R2),
// 꺼져 있으면 같은 주소 /data/<version>(PC 사이트: Next → backend/api/routes/static_areas.py). 404 = 이 물질 자료 없음 → null.
// 화면 컴포넌트는 fetch 하지 않고 아래 함수·훅만 쓴다.
//   fetchEl(cas)                 el/<CAS>.json 또는 null
//   fetchElIndex()               el/index.json(자료 있는 CAS 목록·출처) 또는 null
//   fetchElAnswer(q)             "<물질> AEGL·ERPG·PAC" → 답 카드 모양(elAnswer) 또는 null
//   useEmergencyLimits(cas, on)  { data: { file, index }, loading, error } — 화면에 다가오면(on) 받는다

const EL_FALLBACK_BASE = "/data";
const EL_CAS_RE = /^\d{2,7}-\d{2}-\d$/;
const EL_SEARCH_LIMIT = 20;   // 물질 검색과 같은 요청(미리 계산한 답이 limit 20)

function elUrl(rel) {
  const cfg = staticConfig();
  const root = cfg.roots.pages || `${EL_FALLBACK_BASE}/${cfg.version}`;
  return `${root}/${rel}`;
}

function fetchEl(cas) {
  const c = String(cas || "").trim();
  if (!EL_CAS_RE.test(c)) return Promise.resolve(null);
  return staticGetJson(elUrl(STATIC_LAYOUT.pages.el.cas(c)));
}

function fetchElIndex() {
  return staticGetJson(elUrl(STATIC_LAYOUT.pages.el.index)).catch(() => null);
}

async function fetchElPanel(cas) {
  const [file, index] = await Promise.all([fetchEl(cas), fetchElIndex()]);
  return { file, index };
}

// 낱말을 뗀 물질 이름으로 물질 검색 → CAS 있는 결과 가운데 이름이 같은 것(없으면 첫 것) → 목록에 있으면 그 파일 → 답.
async function fetchElAnswer(q, labelSets = [EL_LABELS_KO, EL_LABELS_EN]) {
  const parsed = elParseQuery(q, labelSets);
  if (!parsed) return null;
  const found = await fetchChemicalSearch(parsed.substance, EL_SEARCH_LIMIT);
  const item = factsPickItem(found && found.items, parsed.substance);
  if (!item) return null;
  const index = await fetchElIndex();
  if (index && Array.isArray(index.cas) && !index.cas.includes(item.cas_no)) return null;
  const file = await fetchEl(item.cas_no).catch(() => null);
  return elAnswer(file, parsed.kind, item, EL_LABELS, CHEMIP_LANG, parsed.substance);
}

function useEmergencyLimits(cas, enabled = true) {
  return useApi(() => (cas && enabled ? fetchElPanel(cas) : Promise.resolve(null)), [cas, enabled]);
}

Object.assign(window, { fetchEl, fetchElIndex, fetchElPanel, fetchElAnswer, useEmergencyLimits });
