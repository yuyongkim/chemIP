// API · 물질 상세 아래 패널: 취급 사업장(PRTR), 형제 프로젝트 연동(사고 사례·EPA 집행·텍사스 배출사고·근거 조문),
// 텍사스 TCEQ 배출사고 보고. 정적 파일이 없으면 staticTceqEvents 가 "사고 없음"을 돌려준다(집 PC 로 넘어가지 않음).
function useTceqEvents(cas, enabled = true) {
  return useApi(
    () => cas && enabled
      ? staticFirst(() => staticTceqEvents(cas), () => originGet(`/integrations/tceq-events/${encodeURIComponent(cas)}?limit=6`))
      : Promise.resolve(null),
    [cas, enabled]
  );
}

// 한국 통합허가 실제 사례·근거 조문도 정적 자료 먼저(api_static.jsx · api_static_extras.jsx),
// /api 는 집 PC 전용이라 originGet(api_origin.jsx) 으로 부른다.

/* ── Handling companies (PRTR) ──────────────────── */
// `enabled` lets the caller defer the call until the panel is scrolled into view.
function useHandlers(chem, enabled = true) {
  const chemId = chem?.chem_id || "";
  const cas = chem?.cas_no || "";
  const name = chem?.name || "";
  const nameEn = chem?.name_en || "";
  return useApi(
    () => {
      if (!enabled || (!chemId && !cas && !name)) return Promise.resolve(null);
      const params = new URLSearchParams({ chem_id: chemId, cas, name, name_en: nameEn, facility_limit: 50 });
      return staticFirst(() => staticHandlers(chemId || cas), () => originGet(`/handlers?${params.toString()}`));
    },
    [enabled, chemId, cas, name, nameEn]
  );
}

/* ── Sibling-project integrations (by CAS): Chem_Eng incidents · EPC provisions · ECHO enforcement ── */
function useIncidents(cas, enabled = true) {
  return useApi(
    () => cas && enabled
      ? staticFirst(() => staticIncidents(cas), () => originGet(`/integrations/incidents/${encodeURIComponent(cas)}?limit=8`))
      : Promise.resolve(null),
    [cas, enabled]
  );
}

function useEnforcement(cas, enabled = true) {
  return useApi(
    () => cas && enabled
      ? staticFirst(() => staticEnforcement(cas), () => originGet(`/integrations/enforcement/${encodeURIComponent(cas)}?limit=6`))
      : Promise.resolve(null),
    [cas, enabled]
  );
}

// 한국 통합허가 실제 사례. 같은 CAS 를 섹션과 인허가 카드가 함께 쓰므로 요청은 CAS 마다 한 번(성공한 것만 보관).
const KR_PERMIT_CONTEXT_CACHE = {};
function useKrPermitContext(cas) {
  return useApi(
    () => {
      if (!cas) return Promise.resolve(null);
      if (!KR_PERMIT_CONTEXT_CACHE[cas]) {
        KR_PERMIT_CONTEXT_CACHE[cas] = staticFirst(
          () => staticPermitContext(cas),
          () => originGet(`/integrations/kr-permit-context/${encodeURIComponent(cas)}`, 20000),
        ).catch(e => { delete KR_PERMIT_CONTEXT_CACHE[cas]; throw e; });
      }
      return KR_PERMIT_CONTEXT_CACHE[cas];
    },
    [cas]
  );
}

// 근거 조문. 미리 받아 둔 pv/<CAS>.json 에 그 나라·이름의 답이 있으면 그것(static_as_of 붙음), 없으면 집 PC 가 바로 찾는다.
function useProvisions(cas, country, name, enabled = true) {
  return useApi(
    () => cas && country && enabled
      ? staticFirst(
        () => staticProvisions(cas, country, name),
        () => originGet(`/integrations/provisions/${encodeURIComponent(cas)}?country=${encodeURIComponent(country)}&name=${encodeURIComponent(name || "")}`, 45000),
      )
      : Promise.resolve(null),
    [cas, country, name, enabled]
  );
}

Object.assign(window, { useHandlers, useIncidents, useEnforcement, useTceqEvents, useKrPermitContext, useProvisions });
