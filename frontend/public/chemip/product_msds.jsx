// 상세 탭 "MSDS" — 16개 항목 격자, 고른 항목 본문, 옆에 §9 물리화학적 특성·§15 법적 규제 현황.
// 문구: PRODUCT_LABELS.msds, 항목 이름: msdsSectionName(data_en.jsx). 순수 함수: product_msds_helpers.jsx. 스타일: product_detail.css.
// 2항 "그림문자"(B0402) 값은 그림으로(GhsMsdsPictograms, ghs_msds_pictograms.jsx).

function MsdsRegulationPanel({ rows, flags }) {
  const M = PRODUCT_LABELS.msds;
  return (
    <div className="panel pd-stack">
      <PanelTitle t={M.regulation}><span className="muted">§ 15</span></PanelTitle>
      <div className="body">
        {rows.length === 0 && <div className="muted pd-note">{M.noSec15}</div>}
        {flags.length > 0 && (
          <div className="pd-flag-row">
            {flags.map((f, i) => <span key={i} className={`pd-flag ${f.tone}`}>{f.label}</span>)}
          </div>
        )}
        {rows.map((r, i) => {
          const items = splitReg(r.v);
          const none = items.length === 0; // only "해당없음"
          return (
            <div key={i} className="row pd-row-top">
              <div className="k" title={r.k}>{r.k.slice(0, 16)}</div>
              <div className="v pd-v-sm">
                {none ? <span className="muted">{M.none}</span>
                  : items.map((it, j) => (
                      <div key={j} className="pd-reg-item">· {it}</div>
                    ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MSDSTab({ selected, sections, loading, error }) {
  const M = PRODUCT_LABELS.msds;
  const [expanded, setExpanded] = useState(2);
  const sectionsByNum = React.useMemo(() => {
    const m = {};
    (sections || []).forEach(s => { m[s.section_seq] = s; });
    return m;
  }, [sections]);

  const expandedSection = sectionsByNum[expanded];
  const expandedMeta = MSDS_SECTIONS[expanded - 1];
  const expandedRows = parseSectionRows(expandedSection);
  const sec9rows = parseSectionRows(sectionsByNum[9]);
  const sec15rows = parseSectionRows(sectionsByNum[15]);
  const sec2rows = parseSectionRows(sectionsByNum[2]);
  const regFlags = regChips([sec15rows, sec2rows]);

  return (
    <div className="layout-2col pd-msds">
      <div>
        <div className="pd-tab-head">
          <h3 className="pd-tab-title">{M.heading.ko}{M.heading.en !== M.heading.ko && <span className="title-en" lang="en">{M.heading.en}</span>}</h3>
          <span className="muted mono pd-meta">
            {M.source(selected.chem_id)}
            {loading && ` · ${PRODUCT_LABELS.status.loading}`}
            {error && ` · ${error}`}
          </span>
        </div>
        {M.sourceLangNote && <div className="ui-hint pd-note">{M.sourceLangNote}</div>}
        <div className="msds-grid">
          {MSDS_SECTIONS.map(s => {
            const sec = sectionsByNum[s.n];
            const status = sec ? sectionStatus(sec) : "missing";
            const isExpanded = expanded === s.n;
            return (
              <div
                key={s.n}
                className={`msds-item ${s.hazard ? "hazard" : ""}${isExpanded ? " is-open" : ""}`}
                onClick={() => setExpanded(s.n)}
              >
                <div className="n">§ {String(s.n).padStart(2, "0")}</div>
                <div className="t">{msdsSectionName(s)}</div>
                {msdsSectionName(s) !== s.en && <div className="kr" lang="en">{s.en}</div>}
                <div className="status">
                  <span>{status === "ok" ? M.cached : status === "empty" ? M.noData : "—"}</span>
                  <span>{status === "ok" ? "OK" : status === "empty" ? "—" : (loading ? "…" : "○")}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel pd-section-panel">
          <h3>
            <b>§ {String(expanded).padStart(2, "0")} · {msdsSectionName(expandedMeta)}{expandedMeta && msdsSectionName(expandedMeta) !== expandedMeta.en && <span className="title-en" lang="en">{expandedMeta.en}</span>}</b>
          </h3>
          <div className="body">
            {expandedRows.length === 0 && (
              <div className="muted pd-empty-line">
                {loading ? M.loadingSection : error ? PRODUCT_LABELS.status.error(error) : M.noSection}
              </div>
            )}
            {expandedRows.map((r, i) => (
              <div key={`${r.code}-${i}`} className="row">
                <div className="k">{r.code || "·"}</div>
                <div className="v">{r.k}: {r.code === GHS_MSDS_ITEMS.pictograms ? <GhsMsdsPictograms text={r.v} /> : <span className="muted">{r.v}</span>}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="pd-msds-side">
        <div className="panel">
          <PanelTitle t={M.physical}><span className="muted">§ 09</span></PanelTitle>
          <div className="body">
            {sec9rows.length === 0 && <div className="muted pd-note">{M.noSec9}</div>}
            {sec9rows.slice(0, 10).map((r, i) => (
              <div key={i} className="row">
                <div className="k">{r.k.slice(0, 14)}</div>
                <div className="v pd-v-sm">{r.v}</div>
              </div>
            ))}
          </div>
        </div>
        <MsdsRegulationPanel rows={sec15rows} flags={regFlags} />
      </aside>
    </div>
  );
}

Object.assign(window, { MSDSTab });
