// API 층 · 물질 → 특허 매핑 파일(정적, 읽기 전용). 형식: scripts/patent_export/README.md.
//   <뿌리>/pat/<CAS>/index.json   요약(관할·연도·자료원별 건수, 관할별 파일 목록, 최신 20건)
//   <뿌리>/pat/<CAS>/<JUR>.json   관할 한 곳의 기록(최신순, gzip). 고를 때만 받는다.
// 뿌리 = 정적 자료가 켜져 있으면 static_config.jsx 의 pages 뿌리(배포: /data/v1), 꺼져 있으면 같은 주소 /data/<version>
// (PC 사이트: Next 가 백엔드 backend/api/routes/patent_mapping.py 로 넘긴다). 받기·gzip 풀기·캐시는 api_static.jsx 의 staticGetJson.
// 404 = 자료 없음 → null. 화면 컴포넌트는 fetch 하지 않고 아래 훅만 쓴다.

const PATENT_MAPPING_LAYOUT = {
  fallbackBase: "/data",
  dir: "pat",
  index: "index.json",
  jurisdiction: (jur) => `${jur}.json`,
};
const PATENT_MAPPING_CAS_RE = /^\d{2,7}-\d{2}-\d$/;
const PATENT_MAPPING_JUR_RE = /^[A-Z]{2}$/;

function patentMappingUrl(cas, file) {
  const cfg = staticConfig();
  const root = cfg.roots.pages || `${PATENT_MAPPING_LAYOUT.fallbackBase}/${cfg.version}`;
  return `${root}/${PATENT_MAPPING_LAYOUT.dir}/${encodeURIComponent(cas)}/${file}`;
}

function fetchPatentMappingIndex(cas) {
  if (!PATENT_MAPPING_CAS_RE.test(cas || "")) return Promise.resolve(null);
  return staticGetJson(patentMappingUrl(cas, PATENT_MAPPING_LAYOUT.index));
}

function fetchPatentMappingRecords(cas, jur) {
  if (!PATENT_MAPPING_CAS_RE.test(cas || "") || !PATENT_MAPPING_JUR_RE.test(jur || "")) return Promise.resolve(null);
  return staticGetJson(patentMappingUrl(cas, PATENT_MAPPING_LAYOUT.jurisdiction(jur)));
}

// 탭을 열 때는 index.json 하나만.
function usePatentMappingIndex(cas) {
  return useApi(() => fetchPatentMappingIndex(cas), [cas]);
}

// 관할을 고르면 그 관할 파일(jur 가 비면 요청하지 않는다).
function usePatentMappingRecords(cas, jur) {
  return useApi(() => (jur ? fetchPatentMappingRecords(cas, jur) : Promise.resolve(null)), [cas, jur]);
}

Object.assign(window, { usePatentMappingIndex, usePatentMappingRecords });
