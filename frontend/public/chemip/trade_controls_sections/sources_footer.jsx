// Trade controls · 자료 상태 — which data files are present / missing / invalid, plus the reading caveat.
// 모두 있으면 한 줄 요약만 보이고 파일별 상태는 접어 둔다. 빠진 파일이 있으면 펼친 채로 보인다.

function TradeSourcesFooter({ status }) {
  const L = TRADE_LABELS;
  const entries = Object.entries(status || {});
  const ok = entries.filter(([, s]) => s === "present").length;
  const allOk = entries.length > 0 && ok === entries.length;
  return (
    <div className="tc-sources">
      <Collapsible
        key={allOk ? "ok" : "partial"}
        defaultOpen={!allOk}
        className="tc-sources-group"
        summary={<span className="ui-hint">{allOk ? L.sourceSummary.all(entries.length) : L.sourceSummary.some(ok, entries.length)}</span>}
      >
        <div className="tc-tags">
          {entries.map(([file, s]) => (
            <Badge key={file} tone={s === "present" ? "safe" : s === "invalid" ? "hazard" : ""} title={file}>
              {L.sourceFiles[file] || file} · {L.sourceStatus[s] || s}
            </Badge>
          ))}
        </div>
      </Collapsible>
      <div className="ui-hint">{L.footer}</div>
    </div>
  );
}

Object.assign(window, { TradeSourcesFooter });
