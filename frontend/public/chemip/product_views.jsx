// Product · Thin link-style views — Patents, Trade, Drugs, Guides, Empty.

/* ── Other product views (thinner, link-style) ── 문구: PRODUCT_LABELS.views */
function ViewTitle({ t }) {
  return <h1>{t.ko}<span className="title-en" lang="en">{t.en}</span></h1>;
}

function PatentsView({ selected }) {
  const V = PRODUCT_LABELS.views.patents;
  if (!selected) {
    return <EmptyView icon="doc" title={V.title.ko} hint={V.emptyHint} />;
  }
  return (
    <div>
      <ViewTitle t={V.title} />
      <div className="sub">{V.sub} <span className="mono">{selected.name_en || selected.name}</span></div>
      <PatentsTab selected={selected} />
    </div>
  );
}
function TradeView({ selected }) {
  const V = PRODUCT_LABELS.views.trade;
  if (!selected) {
    return <EmptyView icon="globe" title={V.title.ko} hint={V.emptyHint} />;
  }
  return (
    <div>
      <ViewTitle t={V.title} />
      <div className="sub">{V.sub} <span className="mono">{selected.name_en || selected.name}</span></div>
      <MarketTab selected={selected} />
    </div>
  );
}
function DrugsView() {
  const V = PRODUCT_LABELS.views.drugs;
  const [q, setQ] = useState("acetaminophen");
  const [submitted, setSubmitted] = useState("acetaminophen");
  const { data, loading, error } = useDrugSearch(submitted);

  // Backend shape: { query, mfds: {total, items}, openfda: {total, items}, pubmed: {count, articles} }
  const mfds = data?.mfds?.items || [];
  const openfda = data?.openfda?.items || [];
  const pubmed = data?.pubmed?.articles || data?.pubmed?.items || [];
  const totals = {
    mfds: data?.mfds?.total ?? 0,
    openfda: data?.openfda?.total ?? 0,
    pubmed: data?.pubmed?.count ?? data?.pubmed?.total ?? 0,
  };
  const grand = totals.mfds + openfda.length + pubmed.length;

  // Extract a brand name from the messy SPL field
  const cleanProduct = (item) => {
    const raw = (item.spl_product_data_elements?.[0]) || item.brand_name?.[0] || item.openfda?.brand_name?.[0] || "";
    return String(raw).split(/\s+/).slice(0, 5).join(" ") || "OpenFDA label";
  };

  return (
    <div>
      <ViewTitle t={V.title} />
      <div className="sub">{V.sub(totals.mfds + totals.openfda + totals.pubmed)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "4px 4px 4px 14px", background: "var(--bg-elevated)", margin: "16px 0", maxWidth: 600 }}>
        <Icon name="search" size={16} style={{ color: "var(--fg-subtle)" }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") setSubmitted(q.trim()); }}
          style={{ border: 0, outline: 0, background: "transparent", fontSize: 14, padding: "10px 0" }}
          placeholder={V.placeholder}
          aria-label={V.placeholder}
        />
        <button className="btn sm primary" onClick={() => setSubmitted(q.trim())}>{V.button}</button>
      </div>
      <div className="muted mono" style={{ fontSize: 11, marginBottom: 16 }}>
        {loading ? PRODUCT_LABELS.status.loading : error ? PRODUCT_LABELS.status.error(error) : V.totals(totals, openfda.length, pubmed.length)}
      </div>

      {/* MFDS approvals */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <PanelTitle t={V.mfds}><span className="muted">{V.results(totals.mfds)}</span></PanelTitle>
        <div className="body" style={{ padding: 0 }}>
          {mfds.length === 0 && (
            <div style={{ padding: "14px 18px", color: "var(--fg-muted)", fontSize: 13 }}>
              {V.mfdsNone(submitted)}
            </div>
          )}
          {mfds.slice(0, 10).map((r, i) => (
            <div key={i} style={{ padding: "12px 18px", borderTop: i === 0 ? 0 : "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr auto", gap: 16 }}>
              <div>
                <b>{r.itemName || r.product_name || r.name || "—"}</b>
                <div className="muted" style={{ fontSize: 12 }}>{r.entpName || r.company || ""}</div>
                {(r.efcyQesitm || r.indication) && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{(r.efcyQesitm || r.indication).slice(0, 200)}</div>}
              </div>
              <Chip tone="chip safe"><span className="dot" />{r.itemSeq || r.permit_no || "MFDS"}</Chip>
            </div>
          ))}
        </div>
      </div>

      {/* OpenFDA labels */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <PanelTitle t={V.openfda}><span className="muted">{V.results(totals.openfda)} · {V.openfdaNote}</span></PanelTitle>
        <div className="body" style={{ padding: 0 }}>
          {openfda.length === 0 && !loading && (
            <div style={{ padding: "14px 18px", color: "var(--fg-muted)", fontSize: 13 }}>{V.openfdaNone(submitted)}</div>
          )}
          {openfda.slice(0, 10).map((r, i) => (
            <div key={i} style={{ padding: "12px 18px", borderTop: i === 0 ? 0 : "1px solid var(--border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "baseline" }}>
                <b>{cleanProduct(r)}</b>
                <Chip>OpenFDA</Chip>
              </div>
              {r.active_ingredient?.[0] && (
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  <span className="upper" style={{ marginRight: 6 }}>{V.ing}</span>
                  {String(r.active_ingredient[0]).slice(0, 120)}
                </div>
              )}
              {r.purpose?.[0] && (
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  <span className="upper" style={{ marginRight: 6 }}>{V.use}</span>
                  {String(r.purpose[0]).slice(0, 120)}
                </div>
              )}
              {r.warnings?.[0] && (
                <div style={{ fontSize: 11, color: "var(--hazard)", marginTop: 2 }}>
                  <span className="upper" style={{ marginRight: 6 }}>{V.warn}</span>
                  {String(r.warnings[0]).slice(0, 160)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* PubMed citations */}
      <div className="panel">
        <PanelTitle t={V.pubmed}><span className="muted">{V.pubmedNote(totals.pubmed, pubmed.length)}</span></PanelTitle>
        <div className="body" style={{ padding: 0 }}>
          {pubmed.length === 0 && !loading && (
            <div style={{ padding: "14px 18px", color: "var(--fg-muted)", fontSize: 13 }}>{V.pubmedNone}</div>
          )}
          {pubmed.slice(0, 10).map((r, i) => (
            <div key={r.pmid || i} style={{ padding: "12px 18px", borderTop: i === 0 ? 0 : "1px solid var(--border)", display: "grid", gridTemplateColumns: "70px 1fr auto", gap: 12, alignItems: "baseline" }}>
              <a className="mono" style={{ fontSize: 11, color: "var(--accent-ink)" }} href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`} target="_blank" rel="noopener">PMID {r.pmid}</a>
              <div>
                <b style={{ fontSize: 13 }}>{r.title || "—"}</b>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{r.source || ""}{r.authors ? ` · ${(Array.isArray(r.authors) ? r.authors.slice(0, 3).join(", ") : r.authors)}` : ""}</div>
              </div>
              <span className="mono muted" style={{ fontSize: 11 }}>{r.pubdate || ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function GuidesView({ selected }) {
  const V = PRODUCT_LABELS.views.guides;
  if (!selected) {
    return <EmptyView icon="book" title={V.title.ko} hint={V.emptyHint} />;
  }
  return (
    <div>
      <ViewTitle t={V.title} />
      <div className="sub">{V.sub} <span className="mono">{selected.name_en || selected.name}</span></div>
      <GuidesTab selected={selected} />
    </div>
  );
}

function EmptyView({ icon, title, hint }) {
  return (
    <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)", maxWidth: 480, margin: "60px auto" }}>
      <Icon name={icon} size={28} style={{ color: "var(--fg-subtle)" }} />
      <h3 style={{ marginTop: 12, fontFamily: "var(--font-display)" }}>{title}</h3>
      <p style={{ fontSize: 13 }}>{hint}</p>
    </div>
  );
}

Object.assign(window, { PatentsView, TradeView, DrugsView, GuidesView, EmptyView });
