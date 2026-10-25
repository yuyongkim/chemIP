// Trade controls · HS 품목번호 — HS6 / EU CN8 rows (ECICS) for this CAS, plus Korean HSK10 candidates under the same HS6.

function HsCodesSection({ data }) {
  const S = TRADE_LABELS.sections.hs;
  const ready = tcSourceReady(data.sources_status, "hs");
  const hs = data.hs || [];
  const hsk = data.hsk10_candidates || [];
  return (
    <SectionPanel id={TRADE_ANCHORS.hs} title={S.title} aside={data.hs_meta?.retrieved || ""}>
      {!ready && <EmptyState kind="preparing" />}
      {ready && hs.length === 0 && <EmptyState>{S.empty}</EmptyState>}
      {hs.map((h, i) => (
        <div key={i} className="tc-item">
          <span className="mono tnum"><b>HS {tcHsDots(h.hs6) || "—"}</b>{h.cn8 ? ` · CN ${h.cn8}` : ""}{h.hsk10 ? ` · HSK ${h.hsk10}` : ""}</span>
          <div className="tc-line tc-muted">{h.title_ko || h.title_en || ""}{h.description ? ` · ${h.description}` : ""}</div>
        </div>
      ))}
      {hsk.length > 0 && (
        <div className="tc-subblock">
          <b>{S.hskTitle}</b>
          <div className="ui-hint">{S.hskHint}</div>
          {hsk.map(k => (
            <div key={k.hsk10} className="tc-line"><span className="mono tnum">{k.hsk10}</span> {k.name_ko || k.name_en}</div>
          ))}
        </div>
      )}
      {hs.length > 0 && (
        <div className="tc-subblock">
          <div className="ui-hint">{S.notBinding}</div>
          <div className="ui-hint">{S.attribution}<SourceLink url={data.hs_meta?.ecics_info_url} /></div>
        </div>
      )}
    </SectionPanel>
  );
}

Object.assign(window, { HsCodesSection });
