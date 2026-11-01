// 특허 탭 "관련 특허(공개 특허 문헌 매핑)" 절 셸 — 상태·훅·배치만.
// 열 때는 index.json 하나만 받는다(usePatentMappingIndex). 관할을 고르면 그 관할 파일을 받아 최신순 50건씩 넘긴다.
// 자료: api_patents_static.jsx · 순수 함수: product_patent_mapping_helpers.jsx · 문구: patent_mapping_labels.jsx
// 하위: patent_mapping_filter.jsx · patent_mapping_jurisdictions.jsx · patent_mapping_years.jsx · patent_mapping_list.jsx · patent_mapping_pager.jsx
// 스타일: product_detail.css(.pd-pm-*).

function PatentMappingSection({ cas }) {
  const L = PATENT_MAPPING_LABELS;
  const [jur, setJur] = React.useState("");
  const [page, setPage] = React.useState(1);
  React.useEffect(() => { setJur(""); setPage(1); }, [cas]);

  const idx = usePatentMappingIndex(cas);
  const rec = usePatentMappingRecords(cas, jur);
  const index = idx.data;

  const top = React.useMemo(() => pmTopJurisdictions(index), [index]);
  const years = React.useMemo(() => pmYearBars(index), [index]);
  const options = React.useMemo(() => pmJurisdictionOptions(index), [index]);
  const allRows = React.useMemo(() => pmRecordRows(jur ? rec.data : index?.recent), [jur, rec.data, index]);
  const paged = pmPage(allRows, page);
  const file = jur ? pmFileInfo(index, jur) : null;

  const pick = (code) => { setJur(code); setPage(1); };

  const head = (meta) => (
    <div className="pd-tab-head center">
      <div className="pd-inline">
        <h3 className="pd-tab-title-sm">{L.heading.ko}</h3>
        {meta && <span className="muted mono pd-meta">{meta}</span>}
      </div>
    </div>
  );

  if (idx.loading) return <section className="pd-pm">{head(L.loading)}</section>;
  if (idx.error) return <section className="pd-pm">{head()}<ErrorState message={idx.error} card /></section>;
  if (!index) return <section className="pd-pm">{head()}<EmptyState card>{L.none}</EmptyState></section>;

  const listCaption = jur
    ? L.listJurisdiction(`${jur} ${pmJurisdictionName(jur)}`, paged.from, paged.to, allRows.length)
    : L.listRecent(allRows.length);

  return (
    <section className="pd-pm">
      {head(L.total(index.total))}
      <div className="ui-hint pd-pm-provenance">{L.provenance}</div>
      <div className="layout-2col">
        <div>
          <div className="pd-pm-toolbar">
            <PmFilter options={options} value={jur} onChange={pick} />
            <span className="muted mono pd-meta">{rec.loading && jur ? L.loading : listCaption}</span>
          </div>
          {file?.truncated && <div className="ui-hint pd-pm-note">{L.truncated(file.records, file.total)}</div>}
          {jur && rec.error ? <ErrorState message={rec.error} card />
            : jur && !rec.loading && !rec.data ? <EmptyState card>{L.none}</EmptyState>
            : <PmRecordTable rows={paged.rows} />}
          <PmPager page={paged.page} pages={paged.pages} onPage={setPage} />
        </div>
        <aside>
          <div className="panel">
            <PanelTitle t={L.byJurisdiction} />
            <div className="body"><PmJurisdictionBars rows={top} active={jur} onPick={pick} /></div>
          </div>
          <div className="panel pd-stack">
            <PanelTitle t={L.byYear} />
            <div className="body"><PmYearBars data={years} /></div>
          </div>
        </aside>
      </div>
    </section>
  );
}

Object.assign(window, { PatentMappingSection });
