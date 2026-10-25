// Pure helpers for the "실제 통합허가 사례" section — /api/integrations/kr-permit-context/{cas} 응답 → 표시 값. No React, no fetch.

function kpcNum(v) {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toLocaleString("ko-KR", { maximumFractionDigits: 3 });
}

// 분포 한 건 → "6 ppm · 표준산소 12%" 처럼 값 뒤에 붙는 단위 글자.
function kpcUnitText(d) {
  const L = KR_PERMIT_CONTEXT_LABELS;
  return d?.o2_ref ? `${d.unit} · ${L.o2(d.o2_ref)}` : d?.unit || "";
}

function kpcIndustryName(ind) {
  return !ind || ind === "미상" ? KR_PERMIT_CONTEXT_LABELS.unknownIndustry : ind;
}

// 대표 분포 외의 분포(다른 단위·산소 기준), 건수 많은 순.
function kpcOtherDistributions(entry) {
  const p = entry?.primary;
  return (entry?.distributions || []).filter(d => !p || d.unit !== p.unit || d.o2_ref !== p.o2_ref)
    .slice(0, KR_PERMIT_CONTEXT_LABELS.maxOtherUnits);
}

// 업종 이름이 있는 상위 업종(사업장 수 순).
function kpcTopIndustries(entry, max) {
  return (entry?.industries || []).filter(i => i.industry && i.industry !== "미상").slice(0, max);
}

// 처리기간 전체 행(post_type 하나).
function kpcOverallDuration(data, postType) {
  return (data?.durations?.overall || []).find(d => d.post_type === postType) || null;
}

// 첫 항목의 상위 업종 중 처리기간 표본이 충분한(reliable) 업종의 통합허가 처리기간.
function kpcIndustryDurations(data, postType, max) {
  const rows = (data?.durations?.by_industry || []).filter(d => d.post_type === postType && d.reliable);
  const byInd = Object.fromEntries(rows.map(d => [d.industry, d]));
  const first = (data?.entries || [])[0];
  return (first?.industries || []).map(i => byInd[i.industry]).filter(Boolean).slice(0, max);
}

// 배출량 묶음 → 가장 최근 연도 한 줄.
function kpcLatestEmission(em) {
  const ys = em?.years || [];
  return ys.length ? ys[ys.length - 1] : null;
}

Object.assign(window, {
  kpcNum, kpcUnitText, kpcIndustryName, kpcOtherDistributions, kpcTopIndustries,
  kpcOverallDuration, kpcIndustryDurations, kpcLatestEmission,
});
