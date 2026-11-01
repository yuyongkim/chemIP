// 해외 규제 탭의 하위 패널 공용 상태 — 규제 정보(useRegulatoryIntelligence) 요청이 진행 중이거나 실패했으면
// 건수("0건")·"자료가 없습니다" 대신 불러오는 중 / 공용 ErrorState(연결 끊김이면 API_LABELS.offline)를 보인다.

// 요청이 끝나 결과가 있을 때만 true. 하위 패널은 이때만 건수와 목록을 그린다.
function intelReady(intel) {
  return !intel.loading && !intel.error;
}

// 머리 오른쪽 건수 글: 결과가 있을 때만
function intelMeta(intel, text) {
  return intelReady(intel) ? text : "";
}

function IntelPending({ intel }) {
  if (intel.loading) return <div className="muted pd-note">{PRODUCT_LABELS.status.loading}</div>;
  if (intel.error) return <ErrorState message={intel.error} />;
  return null;
}

Object.assign(window, { intelReady, intelMeta, IntelPending });
