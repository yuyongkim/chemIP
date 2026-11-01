// 정적 자료(Cloudflare) 설정 — 주소·버전·파일 배치를 정하는 단 한 곳.
// 배포 화면은 이 파일보다 먼저 window.CHEMIP_STATIC = { base, searchBase, version } 을 둘 수 있다.
// base 가 비어 있으면 정적 자료를 쓰지 않는다(지금처럼 모든 훅이 /api 를 부른다).
//
//   base        물질 파일(p/)·공용 파일(g/)의 뿌리 주소(R2, 예: "https://data.chemip.yule.pics"). 끝의 "/" 는 뗀다.
//   searchBase  검색 색인(search/)의 뿌리 주소(Pages). 비우면 base 를 쓴다.
//   version     자료 형식 버전 = 경로 한 칸(<base>/v1/p/...). 형식이 바뀌면 뿌리가 바뀐다(v2/).
//
// 파일 이름 규칙은 STATIC_LAYOUT 에만 둔다. 근거: scripts/static_export/CONTRACT.md (format v1).

const STATIC_DEFAULTS = { base: "", searchBase: "", version: "v1", timeoutMs: 12000 };

const STATIC_LAYOUT = {
  search: {
    dir: "search",
    manifest: "manifest.json",
    docmeta: "docmeta.json",
    tokenShard: n => `t/${n}.json`,
    aliasShard: n => `a/${n}.json`,
    docBucket: n => `d/${n}.json`,
  },
  pages: {
    page: chemId => `p/${encodeURIComponent(chemId)}.json`, // chem_id(검색 결과의 chem_id 또는 CAS) 하나에 한 파일
    rulebook: "g/rulebook.json",
    tradeCommon: "g/trade_common.json",
    tradeCatalog: "g/trade_catalog.json",
    // 물질 하나의 아래 패널·안전 가이드(guides·handlers·incidents·enforcement). 2026-10-28 추가, 같은 v1 뿌리.
    extras: chemId => `p/${encodeURIComponent(chemId)}.x.json`,
    guideStatus: "g/guides_status.json",
    // KOSHA 기술지침 목록(통합 검색) — [번호, 제목, 공표일, 원문 주소] 행. 2026-10-30 추가, 같은 v1 뿌리.
    guideIndex: "g/guide_index.json",
    // 텍사스 배출사고(TCEQ) — CAS 하나에 한 파일, 사고가 있는 CAS 에만 있다(없으면 "사고 없음"). 2026-10-30 추가, 같은 v1 뿌리.
    tceq: cas => `tx/${encodeURIComponent(cas)}.json`,
    // 근거 조문(EPC 법령 본문 검색) — CAS 하나에 한 파일(나라별 답 모음), 정해 둔 물질에만 있다. 2026-10-30 추가, 같은 v1 뿌리.
    provisions: cas => `pv/${encodeURIComponent(cas)}.json`,
    // PRTR 취급 사업장 지도 — 자료 있는 물질 목록 + CAS 하나에 한 파일(지역별 수·신고량, 사업장 목록). 2026-10-31 추가, CONTRACT.md "prtr/".
    prtrIndex: "prtr/index.json",
    prtr: cas => `prtr/${encodeURIComponent(cas)}.json`,
    // 노출기준 비교 — CAS 하나에 한 파일(출처별 TWA·STEL·C·IDLH), 자료 있는 물질 목록은 g/oel_summary.json. 2026-10-31 추가, CONTRACT.md "oel/".
    oel: cas => `oel/${encodeURIComponent(cas)}.json`,
    oelSummary: "g/oel_summary.json",
    // 비상대응 기준(AEGL·ERPG via DOE PAC·PAC·RIVM probit) — CAS 하나에 한 파일 + 목록. 2026-10-31 추가, CONTRACT.md "el/".
    el: { cas: cas => `el/${encodeURIComponent(cas)}.json`, index: "el/index.json" },
    // 물성·식별자·운송 사실(f/<CAS>.json, 없으면 "자료 없음"), EC·KE·InChIKey → CAS 조각, UN 번호 목록. 2026-10-31 추가, CONTRACT.md "f/<CAS>.json".
    facts: { cas: cas => `f/${encodeURIComponent(cas)}.json`, idShard: n => `f/id_${n}.json`, idBuckets: 128, unIndex: "g/un_index.json" },
    // KOSHA 기술지침 본문 검색 색인(gs/: 목록·두 글자 조각·지침별 쪽 본문). 2026-10-31 추가, 같은 v1 뿌리. CONTRACT.md "gs/".
    guideText: { manifest: "gs/manifest.json", shard: n => `gs/t_${n}.json`, doc: no => `gs/d_${encodeURIComponent(no)}.json` },
    // 화학사고 소식 — 최근 소식 한 파일 + 물질별(CAS) 파일. 2026-10-31 추가, CONTRACT.md "feed/". Worker 정기 실행이 latest 를 갱신할 수 있다.
    feed: { latest: "feed/latest.json", byCas: cas => `feed/by-cas/${encodeURIComponent(cas)}.json` },
    // 관련 물질(같은 규제 목록·GHS 유해성·계열) 상위 8개와 이유 — CAS 하나에 한 파일, 없으면 "관련 물질 없음". 2026-10-31 추가, CONTRACT.md "rel/<CAS>.json".
    related: cas => `rel/${encodeURIComponent(cas)}.json`,
    // 안전 도구 — CAS → 반응성 분류(저장 혼촉 매트릭스), CAS → CLP 부속서 VI 조화 분류(혼합물 GHS 분류). 2026-10-31 추가, CONTRACT.md "g/reactive_class.json".
    safety: { reactiveClass: "g/reactive_class.json", clpAnnex6: "g/clp_annex6.json" },
    // 온도별 물성 상관식 — CAS 하나에 한 파일(없으면 "자료 없음"), 자료 있는 CAS 목록·라이선스 원문. 2026-10-31 추가, CONTRACT.md "tp/".
    tp: { cas: cas => `tp/${encodeURIComponent(cas)}.json`, index: "tp/index.json", licenses: "tp/licenses.json" },
    // 국내 법령 말뭉치(법제처 OPEN API 현행 본문) — 법령 목록·조문 제목 색인·목록별 근거 조문·법령 하나에 한 파일·CAS 조각(n = fnv1a32(CAS) % index.cas_buckets). 2026-10-31 추가, CONTRACT.md "law/".
    law: { index: "law/index.json", toc: "law/toc.json", lists: "law/lists.json", doc: id => `law/${encodeURIComponent(id)}.json`, casShard: n => `law/cas_${n}.json` },
    // p/ 내보내기 뒤에 추가된 상대국 법령 목록 등재(EU REACH 등록 등) — 머리 + CAS 조각(n = fnv1a32(CAS) % index.buckets). 2026-11-01 추가, CONTRACT.md "g/intl_add.json".
    intlAdd: { index: "g/intl_add.json", shard: n => `g/intl_add_${n}.json` },
    // p/ 내보내기 뒤에 적재한 국가별 규제 DB 코드(US DOT HMT·일본 化管法/安衛法 등) — 머리 + CAS 조각. 2026-11-01 추가, CONTRACT.md "g/intl_reg_add.json".
    intlRegAdd: { index: "g/intl_reg_add.json", shard: n => `g/intl_reg_add_${n}.json` },
  },
};

function staticTrimSlash(s) {
  return String(s || "").trim().replace(/\/+$/, "");
}

// 호출할 때마다 읽는다(배포 화면·시험이 window.CHEMIP_STATIC 을 나중에 넣어도 반영되게).
function staticConfig() {
  const cfg = Object.assign({}, STATIC_DEFAULTS, (typeof window !== "undefined" && window.CHEMIP_STATIC) || {});
  const base = staticTrimSlash(cfg.base);
  const searchBase = staticTrimSlash(cfg.searchBase) || base;
  const version = staticTrimSlash(cfg.version);
  const join = (...parts) => parts.filter(Boolean).join("/");
  return {
    version,
    timeoutMs: Number(cfg.timeoutMs) || STATIC_DEFAULTS.timeoutMs,
    roots: {
      search: searchBase ? join(searchBase, version, STATIC_LAYOUT.search.dir) : "",
      pages: base ? join(base, version) : "",
    },
  };
}

// area: "search" | "pages"
function staticEnabled(area) {
  return Boolean(staticConfig().roots[area]);
}

function staticUrl(area, rel) {
  const root = staticConfig().roots[area];
  return root ? `${root}/${rel}` : "";
}

Object.assign(window, { STATIC_LAYOUT, staticConfig, staticEnabled, staticUrl });
