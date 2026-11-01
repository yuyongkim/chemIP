// API 층 · 정적 자료(Cloudflare) 읽기. 주소는 static_config.jsx, 검색은 static_search*.jsx,
// 수출입 조립은 static_trade_assembly.jsx(순수)·api_static_intl.jsx(조각 합치기)가 맡고 여기서는 파일을 받아 이어 붙이기만 한다.
// 각 함수는 /api 와 같은 모양을 돌려준다. 정적 자료가 꺼져 있거나 그 물질 파일이 없으면 null(→ api_core.jsx 의 staticFirst 가 /api 로 간다).
// 파일 형식: scripts/static_export/CONTRACT.md. p/·g/ 는 R2 에 gzip 으로 있다(Content-Encoding 이 없어도 직접 푼다).
// 네트워크 오류는 그대로 던진다(역시 staticFirst 가 /api 로 넘긴다).

const STATIC_JSON_CACHE = new Map(); // 주소 → Promise<객체|null>. 같은 파일은 한 번만 받는다.
const STATIC_JSON_CACHE_MAX = 800;
const STATIC_GZIP_MAGIC = [0x1f, 0x8b];

// R2 가 gzip 바이트를 Content-Encoding 없이 내주더라도 읽히게 직접 푼다(헤더가 있으면 브라우저가 이미 풀었다).
async function staticDecodeBody(response) {
  const buf = new Uint8Array(await response.arrayBuffer());
  let bytes = buf;
  if (buf[0] === STATIC_GZIP_MAGIC[0] && buf[1] === STATIC_GZIP_MAGIC[1] && typeof DecompressionStream !== "undefined") {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return JSON.parse(new TextDecoder("utf-8").decode(bytes));
}

async function staticFetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), staticConfig().timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`static ${r.status}`);
    return await staticDecodeBody(r);
  } finally {
    clearTimeout(timer);
  }
}

function staticGetJson(url) {
  if (!url) return Promise.resolve(null);
  if (!STATIC_JSON_CACHE.has(url)) {
    if (STATIC_JSON_CACHE.size >= STATIC_JSON_CACHE_MAX) STATIC_JSON_CACHE.delete(STATIC_JSON_CACHE.keys().next().value);
    const p = staticFetchJson(url).catch(e => { STATIC_JSON_CACHE.delete(url); throw e; });
    STATIC_JSON_CACHE.set(url, p);
  }
  return STATIC_JSON_CACHE.get(url);
}

function staticLoader(area) {
  return rel => staticGetJson(staticUrl(area, rel));
}

// 검색 색인은 뿌리 주소마다 하나(설정이 바뀌면 새로 만든다).
let staticIndexState = { root: "", index: null };
function staticSearchIndex() {
  const root = staticConfig().roots.search;
  if (staticIndexState.root !== root || !staticIndexState.index) {
    staticIndexState = { root, index: new StaticSearchIndex(staticLoader("search")) };
  }
  return staticIndexState.index;
}

/* ── 검색 ── */
async function staticChemicalSearch(q, page = 1, limit = 20) {
  if (!staticEnabled("search")) return null;
  return staticChemicalSearchWith(staticSearchIndex(), q, page, limit);
}

async function staticAutocomplete(q, limit = 5) {
  if (!staticEnabled("search")) return null;
  return staticAutocompleteWith(staticSearchIndex(), q, limit);
}

/* ── 물질 파일 p/<chem_id>.json — detail + CAS 부분(trade·intl·permit_context·facts) 한 덩어리 ── */
const STATIC_CAS_RE = /^\d{2,7}-\d{2}-\d$/;

function staticPagesFile(rel) {
  return staticEnabled("pages") ? staticGetJson(staticUrl("pages", rel)) : Promise.resolve(null);
}

function staticPage(chemId) {
  return chemId ? staticPagesFile(STATIC_LAYOUT.pages.page(chemId)) : Promise.resolve(null);
}

// CAS 로 여는 쪽(수출입·국가별·통합허가). CAS 부분이 없는 파일(cas: null)은 /api 에 맡긴다.
async function staticPageForCas(cas) {
  const c = String(cas || "").replace(/\s+/g, "");
  if (!STATIC_CAS_RE.test(c)) return null;
  const page = await staticPage(c);
  return page && page.cas ? page : null;
}

async function staticChemicalDetail(chemId) {
  const page = await staticPage(chemId);
  return page && page.detail_status === 200 && page.detail ? page.detail : null;
}

// 수출입 조립(staticTradeControls)·국가별 규제(staticIntl)는 p/ 뒤 덧붙인 조각을 합쳐야 해서 api_static_intl.jsx 에 있다.

async function staticPermitContext(cas) {
  const page = await staticPageForCas(cas);
  return page && page.permit_context ? page.permit_context : null;
}

function staticTradeCatalog() {
  return staticPagesFile(STATIC_LAYOUT.pages.tradeCatalog);
}

// 정적 자료가 꺼져 있어도(PC 사이트) 같은 주소 /data/<version>/<rel> 로 읽는 파일의 주소. 특허 매핑(api_patents_static.jsx)·
// 사고 소식(api_feed.jsx)·관련 물질(api_discovery.jsx)이 같은 규칙이다(2026-10-31 공용으로 뺌, 앞의 둘은 아직 자기 사본).
function staticPagesUrlOrLocal(rel) {
  return staticUrl("pages", rel) || `/data/${staticConfig().version}/${rel}`;
}

Object.assign(window, {
  staticGetJson, staticPagesFile, staticChemicalSearch, staticAutocomplete, staticChemicalDetail,
  staticPageForCas, staticPermitContext, staticTradeCatalog, staticPagesUrlOrLocal,
});
