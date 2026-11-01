// API · 해외 규제: 규제 정보(ECHA·NIOSH·CompTox·KISCHEM·NCIS, 실시간 → 집 PC 전용 originGet),
// KOTRA REACH 자료(Worker 가 직접 답한다), 국가별 규제 목록(정적 자료 먼저).

/* ── Regulatory intelligence (ECHA / NIOSH / CompTox / KISCHEM / NCIS) ── */
function useRegulatoryIntelligence(chemId, nonce = 0) {
  return useApi(
    () => chemId
      ? originGet(`/regulations/intelligence/${encodeURIComponent(chemId)}?limit=6`, 30000)
      : Promise.resolve(null),
    [chemId, nonce]
  );
}

function useKotraReach(name) {
  return useApi(
    () => apiGetTimeout(`/regulations/kotra/reach?q=${encodeURIComponent(name || "")}&limit=8`, 15000).catch(apiKeepOffline(() => ({ data: [] }))),
    [name]
  );
}

/* ── International regulation listings (by CAS) ── */
function useIntlRegulations(cas) {
  return useApi(
    () => cas
      ? fetchIntlCombined(cas) // 국가별 규제 DB + 상대국 법령 목록, 이름 표기 합침(api_intl.jsx)
      : Promise.resolve(null),
    [cas]
  );
}

Object.assign(window, { useRegulatoryIntelligence, useKotraReach, useIntlRegulations });
