// Product · Handling companies — PRTR 배출·이동량 신고 사업장, 사고 이력.
// Rendered at the bottom of the chemical detail page; fetches lazily on scroll (useInView, use_in_view.jsx).
// 수치 표기: product_format.jsx(fmtKg). 문구: PRODUCT_LABELS.handlers. 스타일: product_detail.css.

const HANDLER_PREVIEW = 10;

function HandlerStats({ companyCount, releaseKg, transferKg, year }) {
  const S = PRODUCT_LABELS.handlers.stats;
  const cells = [
    [S.sites, companyCount.toLocaleString("ko-KR")], [S.release, fmtKg(releaseKg)],
    [S.transfer, fmtKg(transferKg)], [S.year, year || "—"],
  ];
  return (
    <div className="chem-hdr pd-lower-stats">
      <div className="stats-mini pd-full">
        {cells.map(([s, v]) => (
          <div key={s.m}>
            <div className="m">{s.m}</div>
            <div className="v tnum">{v}</div>
            <div className="muted pd-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HandlerSidePanels({ accidents, gyeonggi }) {
  const HL = PRODUCT_LABELS.handlers;
  if (!(accidents.length > 0 || gyeonggi.length > 0)) return null;
  return (
    <div className="layout-2col pd-side-panels">
      {accidents.length > 0 && (
        <div className="panel">
          <h3><b>{HL.accidents}</b> <span className="muted">{HL.accidentCount(accidents.length)}</span></h3>
          <div className="body">
            {accidents.slice(0, 8).map((a, i) => (
              <div key={a.data_no || i} className="row pd-row-top">
                <div className="k">{a.date || "—"}</div>
                <div className="v pd-v-sm">
                  {a.place || a.area || "—"}{a.type && <span className="muted pd-plain"> · {a.type}</span>}
                  {a.address && <div className="muted pd-plain">{a.address}</div>}
                  {a.summary && <div className="muted pd-plain">{a.summary}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {gyeonggi.length > 0 && (
        <div className="panel">
          <h3><b>{HL.gyeonggi}</b> <span className="muted">{HL.gyeonggiCount(gyeonggi.length)}</span></h3>
          <div className="body">
            {gyeonggi.slice(0, 8).map((g, i) => (
              <div key={i} className="row pd-row-top">
                <div className="k" title={g.company_name}>{(g.company_name || "—").slice(0, 12)}</div>
                <div className="v pd-v-sm">
                  {g.road_address || g.lot_address || g.sigun || "—"}
                  {g.materials_text && <div className="muted pd-plain">{g.materials_text.slice(0, 80)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HandlersPanel({ selected, anchor = "" }) {
  const anchorRef = React.useRef(null);
  const targeted = anchor === "handlers";      // ?anchor=handlers — the paper's deep link (스크롤은 section_anchor.jsx)
  const inView = useInView(anchorRef, targeted);
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error } = useHandlers(selected, inView);

  const sources = data?.sources || {};
  const summary = sources.prtr_summary?.data || null;
  const aggregates = sources.prtr_aggregates?.data?.material_totals || null;
  const facilities = sources.prtr_facilities?.data || [];
  const facilityTotal = sources.prtr_facilities?.total || 0;
  const accidents = sources.chemical_accidents?.data || [];
  const gyeonggi = sources.gyeonggi_facilities?.data || [];
  const year = sources.prtr_facilities?.year || sources.prtr_summary?.year || data?.query?.year;

  const rows = expanded ? facilities : facilities.slice(0, HANDLER_PREVIEW);
  const maxTotal = Math.max(1, ...facilities.map(f => Number(f.reported_total_kg || 0)));
  const companyCount = summary?.company_count || facilityTotal || 0;
  const releaseKg = aggregates?.release_total_kg ?? summary?.total_release_kg ?? 0;
  const transferKg = aggregates?.transfer_total_kg ?? summary?.total_transfer_kg ?? 0;

  const HL = PRODUCT_LABELS.handlers;
  const ST = PRODUCT_LABELS.status;
  const statusText = !inView ? ST.scrollToLoad
    : loading ? ST.loading
    : error ? ST.error(error)
    : facilityTotal ? HL.status(facilityTotal.toLocaleString("ko-KR"), year)
    : HL.none;

  return (
    <section ref={anchorRef} id="handlers" className="pd-lower">
      <SectionHeading t={HL.heading} meta={`${HL.sourceNote} · ${statusText}`} />

      {companyCount > 0 && <HandlerStats companyCount={companyCount} releaseKg={releaseKg} transferKg={transferKg} year={year} />}
      {facilityTotal > 0 && selected?.cas_no && (
        <div className="pd-more-row"><a className="ui-link-btn" href={prtrMapHref(selected.cas_no)}>{PRTR_MAP_LABELS.handlersLink} →</a></div>
      )}

      <table className="pat-table">
        <thead>
          <tr>
            <th className="pd-th-num">#</th>
            <th>{HL.company}</th>
            <th className="handler-addr">{HL.cols.address}</th>
            <th className="pd-num">{HL.cols.release}</th>
            <th className="pd-num">{HL.cols.transfer}</th>
            <th className="pd-num">{HL.cols.total}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan="6" className="pd-table-empty">
                {!inView ? HL.empty.scroll
                  : loading ? HL.empty.loading
                  : error ? HL.empty.failed(error)
                  : HL.empty.none}
              </td>
            </tr>
          )}
          {rows.map((f, i) => (
            <tr key={`${f.company_name}-${i}`}>
              <td className="pid">{i + 1}</td>
              <td className="title-cell">
                <b>{f.company_name || "—"}</b>
                <div className="handler-addr-inline muted">{f.address || "—"}</div>
              </td>
              <td className="handler-addr muted pd-td-sm">{f.address || "—"}</td>
              <td className="tnum pd-num pd-td-sm">{fmtKg(f.total_release_kg)}</td>
              <td className="tnum pd-num pd-td-sm">{fmtKg(f.total_transfer_kg)}</td>
              <td className="pd-num">
                <div className="tnum pd-total">{fmtKg(f.reported_total_kg)}</div>
                <div className="pd-total-bar" style={{ "--w": `${Math.max(4, (Number(f.reported_total_kg || 0) / maxTotal) * 100)}%` }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {facilities.length > HANDLER_PREVIEW && (
        <div className="pd-more-row">
          <span className="muted mono pd-meta">
            {HL.topN(Math.min(facilities.length, expanded ? facilities.length : HANDLER_PREVIEW))}
            {facilityTotal > facilities.length ? HL.reported(facilityTotal.toLocaleString("ko-KR")) : ""}
            {HL.sortNote}
          </span>
          <button className="btn" onClick={() => setExpanded(v => !v)}>
            {expanded ? HL.collapse : HL.showAll(facilities.length)}
          </button>
        </div>
      )}

      <HandlerSidePanels accidents={accidents} gyeonggi={gyeonggi} />
    </section>
  );
}

Object.assign(window, { HandlersPanel });
