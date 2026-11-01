// 해외 규제 탭 옆줄 — KOTRA REACH 자료(따로 요청), 국내 규제·분류(KISCHEM·NCIS), 검색에 쓴 이름.
// 문구: PRODUCT_LABELS.regulation. 스타일: product_detail.css.

function KotraReachPanel({ kotra }) {
  const G = PRODUCT_LABELS.regulation;
  const ST = PRODUCT_LABELS.status;
  const items = kotra.data?.data || kotra.data?.items || [];
  return (
    <div className="panel">
      <h3><b><Abbr code="KOTRA" /> {G.kotraReach}</b> <span className="muted">{kotra.loading ? ST.loading : kotra.error ? ST.error(kotra.error) : G.recs(items.length)}</span></h3>
      <div className="body pd-flush">
        {items.length === 0 && !kotra.loading && !kotra.error && (
          <div className="muted pd-flush-empty-sm">{G.kotraNone}</div>
        )}
        {items.slice(0, 8).map((n, i) => {
          const title = n.newsTitl || n.title || "—";
          const url = n.kotraNewsUrl || n.newsUrl || "#";
          const summary = (n.cntntSumar || "").slice(0, 120);
          return (
            <div key={i} className="pd-kotra-item">
              <a className="pd-kotra-link" href={url} target="_blank" rel="noopener noreferrer">{title}</a>
              {summary && <div className="muted pd-news-sum">{summary}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KrClassificationPanel({ intel, kischem, ncis }) {
  const G = PRODUCT_LABELS.regulation;
  const classes = (ncis.data || [])[0]?.classifications || [];
  return (
    <div className="panel pd-stack">
      <h3><b>{G.krClass}</b> <span className="muted"><Abbr code="KISCHEM" /> · <Abbr code="NCIS" /></span></h3>
      <div className="body">
        <IntelPending intel={intel} />
        {intelReady(intel) && <>
          <div className="row"><div className="k"><Abbr code="KISCHEM" /></div><div className="v pd-v-sm">{G.kischemCount((kischem.data || []).length)}</div></div>
          <div className="row"><div className="k"><Abbr code="NCIS" /></div><div className="v pd-v-sm">{G.ncisCount((ncis.data || []).length)}</div></div>
          {classes.length > 0 && (
            <div className="pd-chip-row">
              {classes.map((c, i) => (<span key={i} className="chip hazard pd-chip-xs">{c}</span>))}
            </div>
          )}
        </>}
      </div>
    </div>
  );
}

function IntelTermsPanel({ intel, aliases, terms }) {
  const G = PRODUCT_LABELS.regulation;
  return (
    <div className="panel pd-stack">
      <PanelTitle t={G.intel} />
      <div className="body">
        <IntelPending intel={intel} />
        {intelReady(intel) && <>
          <div className="row"><div className="k">{G.aliases}</div><div className="v">{aliases.length}</div></div>
          <div className="row pd-row-top"><div className="k">{G.terms}</div><div className="v pd-v-sm">{terms.join(", ") || "—"}</div></div>
        </>}
      </div>
    </div>
  );
}

Object.assign(window, { KotraReachPanel, KrClassificationPanel, IntelTermsPanel });
