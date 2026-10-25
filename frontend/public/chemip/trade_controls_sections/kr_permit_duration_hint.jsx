// Trade controls · 인허가 카드 아래 "실제 처리기간" 한 줄 — KR_PERMIT_CONTEXT_LABELS.durationHintPermitIds 에 든 인허가에만 붙는다.
// Data: useKrPermitContext (api.jsx, 같은 CAS 는 한 번만 요청). 문구: trade_controls_permit_context_labels.jsx.

function KrPermitDurationHint({ cas, permitId }) {
  const L = KR_PERMIT_CONTEXT_LABELS;
  const wanted = L.durationHintPermitIds.includes(permitId);
  const { data } = useKrPermitContext(wanted ? cas : "");
  const d = wanted ? kpcOverallDuration(data, L.durationPostType) : null;
  if (!d) return null;
  return (
    <div className="tc-line ui-hint">
      {L.durationHint(kpcNum(d.median), d.n, kpcNum(d.p25), kpcNum(d.p75))}
      <SourceLink url={data?.attribution?.ieps_board_url} label={`${L.durationHintSource} ↗`} />
    </div>
  );
}

Object.assign(window, { KrPermitDurationHint });
