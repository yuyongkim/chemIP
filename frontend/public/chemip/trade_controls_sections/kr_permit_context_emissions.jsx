// 실제 통합허가 사례 · CleanSYS 굴뚝자동측정(TMS) 연간 배출량 — 물질(군)별 가장 최근 연도 한 줄.
// emissions: kr_permit_context_store._emissions() 결과 목록. 문구: KR_PERMIT_CONTEXT_LABELS.

function KrPermitContextEmissions({ emissions }) {
  const L = KR_PERMIT_CONTEXT_LABELS;
  const lines = (emissions || []).map(em => ({ em, y: kpcLatestEmission(em) })).filter(x => x.y);
  if (lines.length === 0) return null;
  return (
    <div className="tc-subblock">
      <div className="tc-item-title">{L.emissionsTitle}</div>
      {lines.map(({ em, y }) => (
        <div key={em.entity} className="tc-line">{L.emissionsItem(em.label, y.year, y.n_sites, kpcNum(y.total_kg))}</div>
      ))}
      <div className="ui-hint">{L.emissionsNote}</div>
    </div>
  );
}

Object.assign(window, { KrPermitContextEmissions });
