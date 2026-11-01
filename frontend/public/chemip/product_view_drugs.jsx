// 보조 화면 "의약품" — 식약처 허가 · 미국 FDA 표시사항 · PubMed 문헌을 한 번에(useDrugSearch).
// 문구: PRODUCT_LABELS.views.drugs. 스타일: product_views.css(.pv-*).

// Extract a brand name from the messy SPL field
function drugProductName(item, fallback) {
  const raw = (item.spl_product_data_elements?.[0]) || item.brand_name?.[0] || item.openfda?.brand_name?.[0] || "";
  return String(raw).split(/\s+/).slice(0, 5).join(" ") || fallback;
}

function DrugMfdsPanel({ rows, total, submitted }) {
  const V = PRODUCT_LABELS.views.drugs;
  return (
    <div className="panel pv-panel">
      <PanelTitle t={V.mfds}><span className="muted">{V.results(total)}</span></PanelTitle>
      <div className="body pd-flush">
        {rows.length === 0 && <div className="pv-empty">{V.mfdsNone(submitted)}</div>}
        {rows.slice(0, 10).map((r, i) => (
          <div key={i} className="pv-row grid">
            <div>
              <b>{r.itemName || r.product_name || r.name || "—"}</b>
              <div className="muted pd-note">{r.entpName || r.company || ""}</div>
              {(r.efcyQesitm || r.indication) && <div className="muted pv-line">{(r.efcyQesitm || r.indication).slice(0, 200)}</div>}
            </div>
            <Chip tone="chip safe"><span className="dot" />{r.itemSeq || r.permit_no || V.mfdsTag}</Chip>
          </div>
        ))}
      </div>
    </div>
  );
}

function DrugOpenFdaPanel({ rows, total, submitted, showEmpty }) {
  const V = PRODUCT_LABELS.views.drugs;
  return (
    <div className="panel pv-panel">
      <PanelTitle t={V.openfda}><span className="muted">{V.results(total)} · {V.openfdaNote}</span></PanelTitle>
      <div className="body pd-flush">
        {rows.length === 0 && showEmpty && <div className="pv-empty">{V.openfdaNone(submitted)}</div>}
        {rows.slice(0, 10).map((r, i) => (
          <div key={i} className="pv-row">
            <div className="pv-row-head">
              <b>{drugProductName(r, V.openfdaFallback)}</b>
              <Chip>{V.openfdaTag}</Chip>
            </div>
            {r.active_ingredient?.[0] && (
              <div className="muted pv-line">
                <span className="upper pv-tag">{V.ing}</span>
                {String(r.active_ingredient[0]).slice(0, 120)}
              </div>
            )}
            {r.purpose?.[0] && (
              <div className="muted pd-item-sub">
                <span className="upper pv-tag">{V.use}</span>
                {String(r.purpose[0]).slice(0, 120)}
              </div>
            )}
            {r.warnings?.[0] && (
              <div className="pv-warn">
                <span className="upper pv-tag">{V.warn}</span>
                {String(r.warnings[0]).slice(0, 160)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DrugPubmedPanel({ rows, total, showEmpty }) {
  const V = PRODUCT_LABELS.views.drugs;
  return (
    <div className="panel">
      <PanelTitle t={V.pubmed}><span className="muted">{V.pubmedNote(total, rows.length)}</span></PanelTitle>
      <div className="body pd-flush">
        {rows.length === 0 && showEmpty && <div className="pv-empty">{V.pubmedNone}</div>}
        {rows.slice(0, 10).map((r, i) => (
          <div key={r.pmid || i} className="pv-row pubmed">
            <a className="mono pv-pmid" href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`} target="_blank" rel="noopener">{V.pmid(r.pmid)}</a>
            <div>
              <b className="pd-item-title">{r.title || "—"}</b>
              <div className="muted pd-item-sub">{r.source || ""}{r.authors ? ` · ${(Array.isArray(r.authors) ? r.authors.slice(0, 3).join(", ") : r.authors)}` : ""}</div>
            </div>
            <span className="mono muted pd-meta">{r.pubdate || ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DrugsView() {
  const V = PRODUCT_LABELS.views.drugs;
  const [q, setQ] = useState(V.defaultQuery);
  const [submitted, setSubmitted] = useState(V.defaultQuery);
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
  const settled = !loading && !error;

  return (
    <div>
      <ViewTitle t={V.title} />
      <div className="sub">{V.sub(totals.mfds + totals.openfda + totals.pubmed)}</div>
      <div className="pv-box">
        <Icon name="search" size={16} className="ps-box-icon" />
        <input
          className="pv-input"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") setSubmitted(q.trim()); }}
          placeholder={V.placeholder}
          aria-label={V.placeholder}
        />
        <button className="btn sm primary" onClick={() => setSubmitted(q.trim())}>{V.button}</button>
      </div>
      <div className="muted mono pv-totals">
        {loading ? PRODUCT_LABELS.status.loading : error ? PRODUCT_LABELS.status.error(error) : V.totals(totals, openfda.length, pubmed.length)}
      </div>

      <DrugMfdsPanel rows={mfds} total={totals.mfds} submitted={submitted} />
      <DrugOpenFdaPanel rows={openfda} total={totals.openfda} submitted={submitted} showEmpty={settled} />
      <DrugPubmedPanel rows={pubmed} total={totals.pubmed} showEmpty={settled} />
    </div>
  );
}

Object.assign(window, { DrugsView });
