// Product · Handling companies — PRTR 배출·이동량 신고 사업장, 사고 이력.
// Rendered at the bottom of the chemical detail page; fetches lazily on scroll.

const HANDLER_PREVIEW = 10;

function fmtKg(kg) {
  const n = Number(kg || 0);
  if (!isFinite(n) || n === 0) return "0";
  if (n >= 1000) return `${(n / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}t`;
  return `${n.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}kg`;
}

// Fetch only once the section is near the viewport — a PRTR cache miss falls
// back to a live portal probe, so we do not pay for it on every page view.
function useInView(ref, force = false) {
  const [inView, setInView] = React.useState(force);
  React.useEffect(() => {
    if (force) { setInView(true); return; }
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [inView, force]);
  return inView;
}

function HandlersPanel({ selected, anchor = "" }) {
  const anchorRef = React.useRef(null);
  const targeted = anchor === "handlers";      // ?anchor=handlers — the paper's deep link
  const inView = useInView(anchorRef, targeted);
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error } = useHandlers(selected, inView);

  // A deep-linked visit should land on the panel, not at the top of the page.
  React.useEffect(() => {
    if (!targeted || !anchorRef.current) return;
    const t = setTimeout(() => anchorRef.current?.scrollIntoView({ block: "start" }), 400);
    return () => clearTimeout(t);
  }, [targeted, selected?.chem_id]);

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
    <section ref={anchorRef} id="handlers" style={{ marginTop: 28 }}>
      <SectionHeading t={HL.heading} meta={`${HL.sourceNote} · ${statusText}`} />

      {companyCount > 0 && (
        <div className="chem-hdr" style={{ marginBottom: 14 }}>
          <div className="stats-mini" style={{ width: "100%" }}>
            <div>
              <div className="m">{HL.stats.sites.m}</div>
              <div className="v tnum">{companyCount.toLocaleString("ko-KR")}</div>
              <div className="muted" style={{ fontSize: 11 }}>{HL.stats.sites.sub}</div>
            </div>
            <div>
              <div className="m">{HL.stats.release.m}</div>
              <div className="v tnum">{fmtKg(releaseKg)}</div>
              <div className="muted" style={{ fontSize: 11 }}>{HL.stats.release.sub}</div>
            </div>
            <div>
              <div className="m">{HL.stats.transfer.m}</div>
              <div className="v tnum">{fmtKg(transferKg)}</div>
              <div className="muted" style={{ fontSize: 11 }}>{HL.stats.transfer.sub}</div>
            </div>
            <div>
              <div className="m">{HL.stats.year.m}</div>
              <div className="v tnum">{year || "—"}</div>
              <div className="muted" style={{ fontSize: 11 }}>{HL.stats.year.sub}</div>
            </div>
          </div>
        </div>
      )}

      <table className="pat-table">
        <thead>
          <tr>
            <th style={{ width: 44 }}>#</th>
            <th>{HL.company}</th>
            <th className="handler-addr">소재지</th>
            <th style={{ textAlign: "right" }}>배출</th>
            <th style={{ textAlign: "right" }}>이동</th>
            <th style={{ textAlign: "right" }}>합계</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "var(--fg-muted)", padding: 24 }}>
                {!inView ? "아래로 스크롤하면 조회합니다."
                  : loading ? "PRTR 조회 중…"
                  : error ? `조회 실패: ${error}`
                  : "이 물질에 대한 PRTR 배출·이동량 신고 사업장이 없습니다."}
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
              <td className="handler-addr muted" style={{ fontSize: 12 }}>{f.address || "—"}</td>
              <td className="tnum" style={{ textAlign: "right", fontSize: 12 }}>{fmtKg(f.total_release_kg)}</td>
              <td className="tnum" style={{ textAlign: "right", fontSize: 12 }}>{fmtKg(f.total_transfer_kg)}</td>
              <td style={{ textAlign: "right" }}>
                <div className="tnum" style={{ fontSize: 12, fontWeight: 600 }}>{fmtKg(f.reported_total_kg)}</div>
                <div style={{ height: 3, borderRadius: 2, marginTop: 3, background: "var(--accent)", opacity: 0.75,
                  width: `${Math.max(4, (Number(f.reported_total_kg || 0) / maxTotal) * 100)}%`, marginLeft: "auto" }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {facilities.length > HANDLER_PREVIEW && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span className="muted mono" style={{ fontSize: 11 }}>
            상위 {Math.min(facilities.length, expanded ? facilities.length : HANDLER_PREVIEW)}
            {facilityTotal > facilities.length ? ` / 신고 ${facilityTotal.toLocaleString("ko-KR")}곳` : ""}
            {" · 배출+이동 합계 기준 정렬"}
          </span>
          <button className="btn" onClick={() => setExpanded(v => !v)}>
            {expanded ? "접기" : `${facilities.length}곳 모두 보기`}
          </button>
        </div>
      )}

      {(accidents.length > 0 || gyeonggi.length > 0) && (
        <div className="layout-2col" style={{ marginTop: 18 }}>
          {accidents.length > 0 && (
            <div className="panel">
              <h3><b>화학사고 이력</b> <span className="muted">{accidents.length}건</span></h3>
              <div className="body">
                {accidents.slice(0, 8).map((a, i) => (
                  <div key={a.data_no || i} className="row" style={{ alignItems: "flex-start" }}>
                    <div className="k">{a.date || "—"}</div>
                    <div className="v" style={{ fontSize: 12 }}>
                      {a.place || a.area || "—"}{a.type && <span className="muted" style={{ fontWeight: 400 }}> · {a.type}</span>}
                      {a.address && <div className="muted" style={{ fontWeight: 400 }}>{a.address}</div>}
                      {a.summary && <div className="muted" style={{ fontWeight: 400 }}>{a.summary}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {gyeonggi.length > 0 && (
            <div className="panel">
              <h3><b>경기도 위험물 취급</b> <span className="muted">{gyeonggi.length}곳</span></h3>
              <div className="body">
                {gyeonggi.slice(0, 8).map((g, i) => (
                  <div key={i} className="row" style={{ alignItems: "flex-start" }}>
                    <div className="k" title={g.company_name}>{(g.company_name || "—").slice(0, 12)}</div>
                    <div className="v" style={{ fontSize: 12 }}>
                      {g.road_address || g.lot_address || g.sigun || "—"}
                      {g.materials_text && <div className="muted" style={{ fontWeight: 400 }}>{g.materials_text.slice(0, 80)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

Object.assign(window, { HandlersPanel, fmtKg, useInView });
