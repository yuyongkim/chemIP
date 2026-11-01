// 통합 검색 묶음 등록 목록 — 묶음 하나 = usearch_provider_<이름>.jsx 파일 하나 + 아래 배열 한 줄(+ index.html 스크립트 한 줄).
// 배열 순서 = 기본 묶음 순서(이름이 딱 맞는 묶음은 usOrderGroups 가 맨 위로 올린다). 묶음 이름은 USEARCH_LABELS.groups[k].
//
// 묶음(provider) 형식:
//   k       묶음 key (USEARCH_LABELS.groups 에 이름)
//   icon    Icon 이름 (primitives.jsx)
//   limit   처음 보일 건수, max  "더 보기"로 펼칠 때 최대 건수(없으면 전부)
//   search(q) → { items: [{ id, title, sub?, desc?, badge?, href?, external?, score }], total, moreHref? } 또는 그 Promise
//           q 는 usCleanQuery 를 거친 글자. 자료 요청은 api_*.jsx 함수로만 한다(화면 컴포넌트는 fetch 하지 않는다).

const USEARCH_PROVIDERS = [
  USP_SUBSTANCES,
  USP_CALCULATORS,
  USP_TERMS,
  USP_MSDS,
  USP_GUIDES,
  USP_REGLISTS,
  USP_PRTR,
  USP_IDENTIFIERS,
  USP_TRANSPORT,
  USP_OEL,
  USP_GHS_LABEL,
  USP_FEED,
  USP_SCREENS,
];

Object.assign(window, { USEARCH_PROVIDERS });
