// API 층 · 온도별 물성(정적, 읽기 전용). 형식: scripts/static_export/CONTRACT.md "tp/".
// 뿌리 = 정적 자료가 켜져 있으면 static_config.jsx 의 pages 뿌리(배포: /data/v1, R2), 꺼져 있으면 같은 주소 /data/<version>
// (PC 사이트: Next → backend/api/routes/static_areas.py). 받기·gzip 풀기·캐시는 api_static.jsx 의 staticGetJson. 404 = 자료 없음 → null.
//
// 분리 계산기(flash·mccabe 등)용 증기압 찾기:
//   loadTpPsatFn(cas)  → Promise<{ fn(T K) → Pa | null, Tmin, Tmax, src, form, cas, name } | null>   파일을 받아 함수로(받은 것은 기억)
//   tpPsatFn(cas)      → 위 객체 또는 null — 이미 받은 파일에서만 찾는 동기 함수(요청 없음). 처음에는 loadTpPsatFn 으로 받아 둔다.
//   순수 판(파일을 직접 줄 때): tp_forms.jsx 의 tpPsatFromFile(file), 역함수 tpPsatInverse(psat, P) → T.
// 값은 맞춘 온도 범위 안에서만 나온다(밖이면 fn 이 null). 출처 src(chemsep_lite)와 라이선스는 파일의 sources 에 있다.

const TP_FALLBACK_BASE = "/data";
const TP_CAS_RE = /^\d{2,7}-\d{2}-\d$/;
const TP_LOADED = new Map();   // cas → 파일(null = 자료 없음)

function tpUrl(rel) {
  const cfg = staticConfig();
  const root = cfg.roots.pages || `${TP_FALLBACK_BASE}/${cfg.version}`;
  return `${root}/${rel}`;
}

function fetchTpProps(cas) {
  const c = String(cas || "").trim();
  if (!TP_CAS_RE.test(c)) return Promise.resolve(null);
  return staticGetJson(tpUrl(STATIC_LAYOUT.pages.tp.cas(c))).then(file => {
    TP_LOADED.set(c, file || null);
    return file || null;
  });
}

// 자료 있는 CAS 목록 [[cas, name, [props]]] (물질 고르기용). 받지 못하면 null
function fetchTpIndex() {
  return staticGetJson(tpUrl(STATIC_LAYOUT.pages.tp.index)).catch(() => null);
}

function tpPsatFn(cas) {
  const file = TP_LOADED.get(String(cas || "").trim());
  return file ? tpPsatFromFile(file) : null;
}

async function loadTpPsatFn(cas) {
  const file = await fetchTpProps(cas).catch(() => null);
  return file ? tpPsatFromFile(file) : null;
}

// 화면에 다가오면(enabled) 받는다.
function useTpProps(cas, enabled = true) {
  return useApi(() => (cas && enabled ? fetchTpProps(cas) : Promise.resolve(null)), [cas, enabled]);
}

Object.assign(window, { fetchTpProps, fetchTpIndex, tpPsatFn, loadTpPsatFn, useTpProps });
