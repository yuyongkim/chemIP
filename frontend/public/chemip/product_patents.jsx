// 상세 탭 "특허" — 맨 위 "관련 특허(공개 특허 문헌 매핑)"(product_patent_mapping.jsx, CAS 기준 정적 파일),
// 아래 KIPRIS 결과 표와 연도별 출원 막대·주요 출원인. 링크 전용 모드면 KIPRIS 쪽은 바로가기만.
// 문구: PRODUCT_LABELS.patents. 순수 함수: product_tab_helpers.jsx(highlightTerms·patentStats). 스타일: product_detail.css.

function PatentYearBars({ bars }) {
  if (bars.length === 0) return <div className="muted pd-note">—</div>;
  return (
    <>
      <div className="pd-bars" style={{ "--cols": bars.length }}>
        {bars.map(b => (
          <div key={b.y} className="pd-bar" title={`${b.y}: ${b.n}`} style={{ "--h": `${Math.max(8, b.p * 90)}px`, "--o": 0.3 + b.p * 0.7 }} />
        ))}
      </div>
      <div className="pd-bars-axis">
        <span>{bars[0]?.y}</span><span>{bars[bars.length - 1]?.y}</span>
      </div>
    </>
  );
}

function PatentApplicants({ rows }) {
  if (rows.length === 0) return <div className="muted pd-note">—</div>;
  return rows.map(r => (
    <div key={r.n} className="series-row">
      <div>
        <div className="pd-series-name">{r.n}</div>
        <div className="pd-track"><div className="pd-track-fill" style={{ "--w": `${r.p * 100}%` }} /></div>
      </div>
      <div className="mono tnum muted pd-series-val">{r.v}</div>
    </div>
  ));
}

function PatentsTab({ selected }) {
  const P = PRODUCT_LABELS.patents;
  const ST = PRODUCT_LABELS.status;
  const q = selected?.name_en || selected?.name || "";
  const { data, loading, error } = usePatents(q, 30);
  const results = data?.results || [];

  const hlTerms = React.useMemo(
    () => highlightTerms([q, selected?.name_en, selected?.name, selected?.cas_no]),
    [q, selected?.name_en, selected?.name, selected?.cas_no]
  );
  const { yearBars, topApplicants } = React.useMemo(() => patentStats(results), [results]);

  const mapping = <PatentMappingSection cas={selected?.cas_no || ""} />;

  // KIPRIS_PUBLIC_DISPLAY=false → 결과 목록 대신 KIPRIS 바로가기만 (kipris_link_only.jsx)
  if (isKiprisLinkOnly(data)) {
    return <>{mapping}<KiprisLinkOnly data={data} query={q} /></>;
  }

  return (
    <>
    {mapping}
    <div className="layout-2col">
      <div>
        <div className="pd-tab-head center">
          <div className="pd-inline">
            <h3 className="pd-tab-title-sm">{P.heading(q)}</h3>
            <span className="muted mono pd-meta">
              {loading ? ST.loading : error ? ST.error(error) : P.count(results.length)}
            </span>
          </div>
        </div>
        <table className="pat-table">
          <thead><tr>{P.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {results.length === 0 && !loading && !error && (
              <tr><td colSpan="4" className="pd-table-empty">{P.none}</td></tr>
            )}
            {results.slice(0, 30).map(p => (
              <tr key={p.applicationNumber}>
                <td><span className="pid">{p.applicationNumber}</span></td>
                <td className="title-cell">
                  <b><Highlight text={p.inventionTitle} terms={hlTerms} /></b>
                  {p.abstract && (
                    <span className="kr pd-abstract">
                      <Highlight text={(p.abstract || "").slice(0, 200) + (p.abstract.length > 200 ? "…" : "")} terms={hlTerms} />
                    </span>
                  )}
                </td>
                <td className="pd-td-sm">{p.applicantName || "—"}</td>
                <td className="mono">{(p.applicationDate || "").slice(0, 4) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <aside>
        <div className="panel">
          <PanelTitle t={P.trend} />
          <div className="body"><PatentYearBars bars={yearBars} /></div>
        </div>
        <div className="panel pd-stack">
          <PanelTitle t={P.topApplicants} />
          <div className="body"><PatentApplicants rows={topApplicants} /></div>
        </div>
      </aside>
    </div>
    </>
  );
}

Object.assign(window, { PatentsTab });
