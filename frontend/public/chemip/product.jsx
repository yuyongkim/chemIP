// Product prototype — desktop, wired to FastAPI backend via /api/* rewrite
const PRODUCT_VIEWS = ["search", "chemical", "patents", "trade", "drugs", "guides"];

// Default seed chemical so the Chemical view is never empty on first load
const DEFAULT_CHEMICAL = {
  id: 5294,
  chem_id: "001067",
  name: "아세톤 (Acetone)",
  name_en: "Acetone",
  cas_no: "67-64-1",
  source: "KOSHA",
  has_msds: true,
};

function Product() {
  const [view, setView] = useState(() => localStorage.getItem("chemip-view") || "chemical");
  const [tab, setTab] = useState("msds");
  const [selected, setSelected] = useSelectedChemical();
  // Top-bar query state — shared between ProductCmd and SearchView
  const [pendingQuery, setPendingQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => { localStorage.setItem("chemip-view", view); }, [view]);
  // First-load default: seed acetone so Chemical/Patents/AI/Guides aren't blank
  useEffect(() => { if (!selected) setSelected(DEFAULT_CHEMICAL); }, []);

  const openChemical = (chem) => { setSelected(chem); setView("chemical"); };
  const submitTopSearch = (q) => {
    const trimmed = (q || "").trim();
    if (!trimmed) return;
    setSearchQuery(trimmed);
    setView("search");
  };

  return (
    <div className="product">
      <ProductRail view={view} setView={setView} />
      <div className="work">
        <ProductCmd
          view={view}
          selected={selected}
          query={pendingQuery}
          setQuery={setPendingQuery}
          onSubmit={() => submitTopSearch(pendingQuery)}
        />
        <div className="frame">
          {view === "search" && <SearchView onOpen={openChemical} initialQuery={searchQuery} />}
          {view === "chemical" && <ChemicalView tab={tab} setTab={setTab} selected={selected} />}
          {view === "patents" && <PatentsView selected={selected} />}
          {view === "trade" && <TradeView selected={selected} />}
          {view === "drugs" && <DrugsView />}
          {view === "guides" && <GuidesView selected={selected} />}
        </div>
      </div>
    </div>
  );
}

function ProductRail({ view, setView }) {
  const items = [
    { k: "search", ic: "search", label: "SRCH" },
    { k: "chemical", ic: "atom", label: "CHEM" },
    { k: "patents", ic: "doc", label: "PAT" },
    { k: "trade", ic: "globe", label: "TRD" },
    { k: "drugs", ic: "pill", label: "DRG" },
    { k: "guides", ic: "book", label: "GDE" },
  ];
  return (
    <aside className="rail">
      {items.map(it => (
        <button key={it.k} aria-current={view === it.k ? "page" : undefined} onClick={() => setView(it.k)} title={it.label}>
          <Icon name={it.ic} size={16} />
        </button>
      ))}
      <div className="spacer" />
      <div className="tag">CHEMIP · v0.9.2</div>
    </aside>
  );
}

function ProductCmd({ view, selected, query, setQuery, onSubmit }) {
  const chemCrumbs = selected
    ? ["Chemicals", selected.cas_no || selected.chem_id, `${selected.name_en || selected.name}${selected.name && selected.name_en ? ` · ${selected.name}` : ""}`]
    : ["Chemicals", "—", "Search a chemical"];
  const crumbs = {
    search: ["Search"],
    chemical: chemCrumbs,
    patents: ["Patents", "KIPRIS + Global index"],
    trade: ["Trade", "KOTRA feeds"],
    drugs: ["Drugs", "MFDS + OpenFDA + PubMed"],
    guides: ["Guides", "KOSHA dataset"],
  }[view] || [];
  return (
    <div className="cmd">
      <div className="crumbs">
        <Icon name="layers" size={14} />
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span>{i === crumbs.length - 1 ? <b>{c}</b> : c}</span>
            {i < crumbs.length - 1 && <Icon name="chev" size={11} style={{ opacity: .4 }} />}
          </React.Fragment>
        ))}
      </div>
      <div className="right">
        <div className="search">
          <Icon name="search" size={14} style={{ color: "var(--fg-subtle)" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
            placeholder="Search chemicals · patents · countries · drugs  —  name, CAS, HS code"
          />
          <span className="kbd">⌘ K</span>
        </div>
        <button className="btn sm" onClick={onSubmit}><Icon name="search" size={12} /> Search</button>
      </div>
    </div>
  );
}

/* ── Search view ──────────────────────── */
function SearchView({ onOpen, initialQuery }) {
  const [q, setQ] = useState(initialQuery || "");
  const [submitted, setSubmitted] = useState(initialQuery || "");
  // When the parent pushes a new query (top-bar Enter), pick it up
  useEffect(() => {
    if (initialQuery && initialQuery !== submitted) {
      setQ(initialQuery);
      setSubmitted(initialQuery);
    }
  }, [initialQuery]);
  const { data, loading, error } = useChemicalSearch(submitted);
  const rawItems = data?.items || [];
  const [sourceFilter, setSourceFilter] = useState("all");

  // Group + sort: KOSHA+has_msds first, then KOSHA, then ECHA, then everything else.
  // Within each group preserve backend order (already relevance-ranked).
  const sourceCounts = React.useMemo(() => {
    const c = { all: rawItems.length, kosha: 0, echa: 0, other: 0 };
    rawItems.forEach(it => {
      const s = (it.source || "").toLowerCase();
      if (s === "kosha") c.kosha += 1;
      else if (s === "echa") c.echa += 1;
      else c.other += 1;
    });
    return c;
  }, [rawItems]);

  const items = React.useMemo(() => {
    const filtered = sourceFilter === "all" ? rawItems : rawItems.filter(it => {
      const s = (it.source || "").toLowerCase();
      if (sourceFilter === "other") return s !== "kosha" && s !== "echa";
      return s === sourceFilter;
    });
    const rank = (it) => {
      const s = (it.source || "").toLowerCase();
      if (s === "kosha" && it.has_msds) return 0;
      if (s === "kosha") return 1;
      if (s === "echa") return 2;
      return 3;
    };
    return [...filtered].sort((a, b) => rank(a) - rank(b));
  }, [rawItems, sourceFilter]);

  const submit = () => setSubmitted(q.trim());
  const onKey = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div>
      <div style={{ maxWidth: 720, margin: "60px auto 28px", textAlign: "center" }}>
        <h1 style={{ fontSize: 48, letterSpacing: "-0.035em", marginBottom: 12 }}>화학물질 통합검색</h1>
        <div className="muted" style={{ fontSize: 16, marginBottom: 28 }}>Unified chemical · patent · trade · drug search · live KOSHA index</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "4px 4px 4px 14px", background: "var(--bg-elevated)", boxShadow: "var(--shadow-2)" }}>
          <Icon name="search" size={18} style={{ color: "var(--fg-subtle)" }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            style={{ border: 0, outline: 0, background: "transparent", fontSize: 16, padding: "12px 0" }}
            placeholder="Name, CAS, or substance identifier — e.g. 아세톤 / 67-64-1 / methanol"
          />
          <button className="btn primary" onClick={submit}>Search →</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: 12, marginRight: 4 }}>Try:</span>
          {["아세톤", "67-64-1", "methanol", "ethanol", "벤젠"].map(r => (
            <span key={r} className="chip" style={{ cursor: "pointer" }} onClick={() => { setQ(r); setSubmitted(r); }}>{r}</span>
          ))}
        </div>
      </div>

      {submitted && (
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0, letterSpacing: "-0.01em" }}>
              Results · "{submitted}"
              {loading && <span className="muted" style={{ fontSize: 12, marginLeft: 10 }}>loading…</span>}
            </h3>
            <span className="muted mono" style={{ fontSize: 11 }}>
              {error ? `error: ${error}` : `${items.length} of ${rawItems.length} hits`}
            </span>
          </div>

          {rawItems.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
              <span className="upper" style={{ color: "var(--fg-muted)", marginRight: 4 }}>SOURCE</span>
              <div className="seg" style={{ height: 28 }}>
                <button aria-pressed={sourceFilter === "all"} onClick={() => setSourceFilter("all")}>All · {sourceCounts.all}</button>
                <button aria-pressed={sourceFilter === "kosha"} onClick={() => setSourceFilter("kosha")}>KOSHA · {sourceCounts.kosha}</button>
                <button aria-pressed={sourceFilter === "echa"} onClick={() => setSourceFilter("echa")}>ECHA · {sourceCounts.echa}</button>
                {sourceCounts.other > 0 && (
                  <button aria-pressed={sourceFilter === "other"} onClick={() => setSourceFilter("other")}>Other · {sourceCounts.other}</button>
                )}
              </div>
              <span className="muted mono" style={{ fontSize: 11, marginLeft: "auto" }}>
                Sorted: KOSHA+MSDS → KOSHA → ECHA → Other
              </span>
            </div>
          )}

          {items.length === 0 && !loading && !error && (
            <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)" }}>No results.</div>
          )}
          {items.length > 0 && (() => {
            // Visually group by source — insert section headers between groups
            const rows = [];
            let lastGroup = null;
            items.forEach(it => {
              const s = (it.source || "").toLowerCase();
              const groupKey = s === "kosha" && it.has_msds ? "KOSHA · MSDS available" : (it.source || "Other");
              if (groupKey !== lastGroup) {
                rows.push({ kind: "header", key: `h-${groupKey}`, label: groupKey });
                lastGroup = groupKey;
              }
              rows.push({ kind: "row", key: `${it.id}-${it.chem_id}`, it });
            });
            return (
              <table className="pat-table">
                <thead><tr><th>Name</th><th>EN</th><th>CAS</th><th>chem_id</th><th>Source</th><th></th></tr></thead>
                <tbody>
                  {rows.map(r => r.kind === "header" ? (
                    <tr key={r.key}>
                      <td colSpan="6" style={{ background: "var(--bg-sunken)", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--fg-muted)", padding: "8px 14px" }}>
                        § {r.label}
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.key} style={{ cursor: "pointer" }} onClick={() => onOpen(r.it)}>
                      <td><b>{r.it.name}</b></td>
                      <td className="muted" style={{ fontSize: 12 }}>{r.it.name_en || "—"}</td>
                      <td className="mono">{r.it.cas_no || "—"}</td>
                      <td className="mono muted" style={{ fontSize: 11 }}>{r.it.chem_id}</td>
                      <td>{r.it.has_msds ? <Chip tone="chip safe"><span className="dot" />{r.it.source}</Chip> : <Chip>{r.it.source}</Chip>}</td>
                      <td><span className="muted" style={{ fontSize: 11 }}>open →</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {!submitted && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 40 }}>
          {[
            { t: "Chemical-first", k: "화학물질 중심", desc: "Start from a name or CAS. MSDS + patents + AI fan out.", ic: "atom" },
            { t: "Patent-first", k: "특허 중심", desc: "KIPRIS keyword search with local global index cross-check.", ic: "doc" },
            { t: "AI evidence", k: "AI 근거 분석", desc: "Evidence-based safety summary with cited sources.", ic: "spark" },
          ].map(card => (
            <div key={card.t} className="card" style={{ padding: 20 }}>
              <Icon name={card.ic} size={18} style={{ color: "var(--accent)" }} />
              <h4 style={{ margin: "10px 0 4px", fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-0.01em" }}>{card.t}</h4>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{card.k}</div>
              <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Chemical detail (MAIN) ───────────── */
function ChemicalView({ tab, setTab, selected }) {
  // Hooks must run in stable order — call before any early return
  const detail = useChemicalDetail(selected?.chem_id);
  if (!selected) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)" }}>
        <Icon name="atom" size={28} style={{ color: "var(--fg-subtle)" }} />
        <h3 style={{ marginTop: 12, fontFamily: "var(--font-display)" }}>No chemical selected</h3>
        <p style={{ fontSize: 13 }}>Use the search rail (left) or the search view to pick a substance.</p>
      </div>
    );
  }
  const sections = detail.data?.sections || [];
  const tabs = [
    { k: "msds", label: "MSDS", n: `${sections.length}/16` },
    { k: "patents", label: "Patents", n: "↻" },
    { k: "market", label: "Market", n: "—" },
    { k: "guides", label: "Guides", n: "↻" },
    { k: "ai", label: "AI Analysis", n: "★" },
  ];
  return (
    <div>
      <ChemHeader selected={selected} sections={sections} loading={detail.loading} error={detail.error} />
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.k} aria-selected={tab === t.k} onClick={() => setTab(t.k)}>
            {t.label} <span className="n">{t.n}</span>
          </button>
        ))}
      </div>
      {tab === "msds" && <MSDSTab selected={selected} sections={sections} loading={detail.loading} error={detail.error} />}
      {tab === "patents" && <PatentsTab selected={selected} />}
      {tab === "market" && <MarketTab selected={selected} />}
      {tab === "guides" && <GuidesTab selected={selected} />}
      {tab === "ai" && <AITab selected={selected} />}
    </div>
  );
}

function ChemHeader({ selected, sections, loading, error }) {
  // Pull display name pieces from the selected chemical
  const krName = selected?.name || "—";
  const enName = selected?.name_en || "";
  // Hazards are derived from MSDS section 2 if available
  const sec2 = sections?.find(s => s.section_seq === 2);
  const hazardText = sec2?.content?.find(c => c.itemDetail && c.itemDetail !== "자료없음")?.itemDetail || "";
  const isFlammable = /인화성|flammable/i.test(hazardText);
  const isIrritant = /자극|irritant/i.test(hazardText);
  return (
    <div className="chem-hdr">
      <div className="title">
        <div className="id-row">
          {selected?.cas_no && <span className="chip accent">CAS {selected.cas_no}</span>}
          <span className="mono">chem_id {selected?.chem_id}</span>
          <span>·</span>
          <span>{selected?.source || "—"}</span>
          {loading && <span className="muted">· loading MSDS…</span>}
          {error && <span style={{ color: "var(--hazard)" }}>· {error}</span>}
        </div>
        <h1>{enName || krName} {enName && krName !== enName && <span className="muted" style={{ fontWeight: 400 }}>· {krName}</span>}</h1>
        <div className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
          {sections?.length ? `${sections.length}/16 MSDS sections cached` : "MSDS not yet fetched"}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {isFlammable && <Chip tone="chip hazard"><span className="dot" />FLAMMABLE · 인화성</Chip>}
          {isIrritant && <Chip tone="chip hazard"><span className="dot" />IRRITANT · 자극성</Chip>}
          {!isFlammable && !isIrritant && hazardText && <Chip tone="chip hazard"><span className="dot" />HAZARD FLAGGED</Chip>}
          {selected?.has_msds && <Chip tone="chip safe"><span className="dot" />MSDS available</Chip>}
        </div>
      </div>
      <div className="stats-mini">
        <div>
          <div className="m">MSDS</div>
          <div className="v tnum">{sections?.length || 0}<span className="unit" style={{ fontSize: 14, color: "var(--fg-muted)" }}>/16</span></div>
          <div className="muted" style={{ fontSize: 11 }}>KOSHA sections</div>
        </div>
        <div>
          <div className="m">CAS</div>
          <div className="v tnum mono" style={{ fontSize: 16 }}>{selected?.cas_no || "—"}</div>
          <div className="muted" style={{ fontSize: 11 }}>registry no.</div>
        </div>
        <div>
          <div className="m">Source</div>
          <div className="v" style={{ fontSize: 16 }}>{selected?.source || "—"}</div>
          <div className="muted" style={{ fontSize: 11 }}>upstream feed</div>
        </div>
        <div>
          <div className="m">Status</div>
          <div className="v" style={{ fontSize: 16, color: error ? "var(--hazard)" : "var(--safe)" }}>{loading ? "…" : error ? "ERR" : "OK"}</div>
          <div className="muted" style={{ fontSize: 11 }}>backend</div>
        </div>
      </div>
    </div>
  );
}

function MSDSTab({ selected, sections, loading, error }) {
  const [expanded, setExpanded] = useState(2);
  const sectionsByNum = React.useMemo(() => {
    const m = {};
    (sections || []).forEach(s => { m[s.section_seq] = s; });
    return m;
  }, [sections]);

  const expandedSection = sectionsByNum[expanded];
  const expandedRows = parseSectionRows(expandedSection);
  const sec9rows = parseSectionRows(sectionsByNum[9]);
  const sec15rows = parseSectionRows(sectionsByNum[15]);

  return (
    <div className="layout-2col">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0, letterSpacing: "-0.01em" }}>MSDS · 16 Regulated Sections</h3>
          <span className="muted mono" style={{ fontSize: 11 }}>
            Source: KOSHA · /api/chemicals/{selected.chem_id}
            {loading && " · loading…"}
            {error && ` · ${error}`}
          </span>
        </div>
        <div className="msds-grid">
          {MSDS_SECTIONS.map(s => {
            const sec = sectionsByNum[s.n];
            const status = sec ? sectionStatus(sec) : "missing";
            const isExpanded = expanded === s.n;
            return (
              <div
                key={s.n}
                className={`msds-item ${s.hazard ? "hazard" : ""}`}
                style={isExpanded ? { background: "var(--accent-soft)" } : {}}
                onClick={() => setExpanded(s.n)}
              >
                <div className="n">§ {String(s.n).padStart(2, "0")}</div>
                <div className="t">{s.en}</div>
                <div className="kr">{s.kr}</div>
                <div className="status">
                  <span>{status === "ok" ? "cached" : status === "empty" ? "no data" : "—"}</span>
                  <span>{status === "ok" ? "OK" : status === "empty" ? "—" : (loading ? "…" : "○")}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }} className="panel">
          <h3>
            <b>§ {String(expanded).padStart(2, "0")} · {MSDS_SECTIONS[expanded - 1]?.en}</b>
            <span className="muted">{MSDS_SECTIONS[expanded - 1]?.kr}</span>
          </h3>
          <div className="body">
            {expandedRows.length === 0 && (
              <div className="muted" style={{ fontSize: 13, padding: "8px 0" }}>
                {loading ? "Loading section…" : error ? `Error: ${error}` : "No data for this section."}
              </div>
            )}
            {expandedRows.map((r, i) => (
              <div key={`${r.code}-${i}`} className="row">
                <div className="k">{r.code || "·"}</div>
                <div className="v">{r.k}: <span className="muted">{r.v}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside>
        <div className="panel">
          <h3><b>Physical · 물리화학</b> <span className="muted">§ 09</span></h3>
          <div className="body">
            {sec9rows.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No § 9 data.</div>}
            {sec9rows.slice(0, 10).map((r, i) => (
              <div key={i} className="row">
                <div className="k">{r.k.slice(0, 14)}</div>
                <div className="v" style={{ fontSize: 12 }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <h3><b>Regulation · 규제</b> <span className="muted">§ 15</span></h3>
          <div className="body">
            {sec15rows.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No § 15 data.</div>}
            {sec15rows.slice(0, 8).map((r, i) => (
              <div key={i} className="row">
                <div className="k">{r.k.slice(0, 14)}</div>
                <div className="v" style={{ fontSize: 12 }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function PatentsTab({ selected }) {
  const q = selected?.name_en || selected?.name || "";
  const { data, loading, error } = usePatents(q, 30);
  const results = data?.results || [];

  // Highlight terms: search query + EN name + KR name (de-duped, length > 1)
  const hlTerms = React.useMemo(() => {
    const seen = new Set();
    const out = [];
    [q, selected?.name_en, selected?.name, selected?.cas_no].forEach(t => {
      if (!t) return;
      const trimmed = String(t).trim();
      if (trimmed.length < 2) return;
      // Strip trailing parenthetical (e.g. "아세톤 (Acetone)" → "아세톤" + "Acetone")
      const matches = trimmed.match(/[^\s()]+/g) || [];
      [trimmed, ...matches].forEach(m => {
        const key = m.toLowerCase();
        if (m.length > 1 && !seen.has(key)) { seen.add(key); out.push(m); }
      });
    });
    return out;
  }, [q, selected?.name_en, selected?.name, selected?.cas_no]);

  // Compute year histogram + top applicants from real data
  const { yearBars, topApplicants } = React.useMemo(() => {
    const years = {};
    const apps = {};
    results.forEach(r => {
      const yr = (r.applicationDate || "").slice(0, 4);
      if (yr) years[yr] = (years[yr] || 0) + 1;
      const a = r.applicantName || "—";
      apps[a] = (apps[a] || 0) + 1;
    });
    const sortedYears = Object.entries(years).sort(([a], [b]) => a.localeCompare(b));
    const sortedApps = Object.entries(apps).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = Math.max(1, ...Object.values(years));
    return {
      yearBars: sortedYears.map(([y, n]) => ({ y, n, p: n / max })),
      topApplicants: sortedApps.map(([n, v]) => ({ n, v, p: v / Math.max(1, sortedApps[0]?.[1] || 1) })),
    };
  }, [results]);

  return (
    <div className="layout-2col">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, margin: 0 }}>KIPRIS · "{q}"</h3>
            <span className="muted mono" style={{ fontSize: 11 }}>
              {loading ? "loading…" : error ? `error: ${error}` : `${results.length} patents`}
            </span>
          </div>
        </div>
        <table className="pat-table">
          <thead><tr><th>App. No.</th><th>Title · 제목</th><th>Applicant</th><th>Filed</th></tr></thead>
          <tbody>
            {results.length === 0 && !loading && (
              <tr><td colSpan="4" style={{ textAlign: "center", color: "var(--fg-muted)", padding: 24 }}>No KIPRIS hits.</td></tr>
            )}
            {results.slice(0, 30).map(p => (
              <tr key={p.applicationNumber}>
                <td><span className="pid">{p.applicationNumber}</span></td>
                <td className="title-cell">
                  <b><Highlight text={p.inventionTitle} terms={hlTerms} /></b>
                  {p.abstract && (
                    <span className="kr" style={{ display: "block", marginTop: 4, lineHeight: 1.4 }}>
                      <Highlight text={(p.abstract || "").slice(0, 200) + (p.abstract.length > 200 ? "…" : "")} terms={hlTerms} />
                    </span>
                  )}
                </td>
                <td style={{ fontSize: 12 }}>{p.applicantName || "—"}</td>
                <td className="mono">{(p.applicationDate || "").slice(0, 4) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <aside>
        <div className="panel">
          <h3><b>Filing trend</b> <span className="muted">연도별 출원</span></h3>
          <div className="body">
            {yearBars.length === 0 && <div className="muted" style={{ fontSize: 12 }}>—</div>}
            {yearBars.length > 0 && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${yearBars.length}, 1fr)`, gap: 4, alignItems: "end", height: 100 }}>
                  {yearBars.map(b => (
                    <div key={b.y} title={`${b.y}: ${b.n}`} style={{ height: `${Math.max(8, b.p * 90)}px`, background: "var(--accent)", opacity: 0.3 + b.p * 0.7, borderRadius: "2px 2px 0 0" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", marginTop: 6 }}>
                  <span>{yearBars[0]?.y}</span><span>{yearBars[yearBars.length - 1]?.y}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <h3><b>Top applicants</b></h3>
          <div className="body">
            {topApplicants.length === 0 && <div className="muted" style={{ fontSize: 12 }}>—</div>}
            {topApplicants.map(r => (
              <div key={r.n} className="series-row">
                <div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>{r.n}</div>
                  <div style={{ height: 3, background: "var(--bg-sunken)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${r.p * 100}%`, background: "var(--accent)" }} />
                  </div>
                </div>
                <div className="mono tnum muted" style={{ fontSize: 12 }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function MarketTab({ selected }) {
  // Use both English and Korean names for best Naver news coverage
  const enKey = selected?.name_en || selected?.name || "";
  const krKey = selected?.name || enKey;
  const kotra = useTradeNews(enKey);
  const naver = useNaverTradeNews(krKey);

  const kotraItems = kotra.data?.data || kotra.data?.items || [];
  const naverItems = naver.data?.data || naver.data?.items || [];

  // Highlight terms — same logic as PatentsTab
  const hlTerms = React.useMemo(() => {
    const seen = new Set();
    const out = [];
    [enKey, krKey, selected?.cas_no].forEach(t => {
      if (!t) return;
      const trimmed = String(t).trim();
      if (trimmed.length < 2) return;
      const matches = trimmed.match(/[^\s()]+/g) || [];
      [trimmed, ...matches].forEach(m => {
        const key = m.toLowerCase();
        if (m.length > 1 && !seen.has(key)) { seen.add(key); out.push(m); }
      });
    });
    return out;
  }, [enKey, krKey, selected?.cas_no]);

  return (
    <div className="layout-2col">
      <div>
        <div className="panel">
          <h3>
            <b>KOTRA news · 무역 뉴스</b>
            <span className="muted">
              /api/trade/news?q={enKey} ·
              {kotra.loading ? " loading…" : kotra.error ? ` error: ${kotra.error}` : ` ${kotraItems.length} items`}
            </span>
          </h3>
          <div className="body" style={{ padding: 0 }}>
            {kotraItems.length === 0 && !kotra.loading && (
              <div style={{ padding: "16px 18px", color: "var(--fg-muted)", fontSize: 13 }}>
                No KOTRA news for "{enKey}". KOTRA upstream is sparse for chemical-name queries — Naver fallback below covers Korean coverage.
              </div>
            )}
            {kotraItems.slice(0, 8).map((n, i) => {
              const title = n.newsTitl || n.title || n.titleNm || "—";
              const date = (n.newsWrtDt || n.regDate || "").slice(0, 16);
              const summary = (n.cntntSumar || n.newsBdt || n.summary || "").slice(0, 200);
              const url = n.newsUrl || n.kotraNewsUrl || "#";
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 16, padding: "14px 18px", borderTop: i === 0 ? 0 : "1px solid var(--border)", alignItems: "center" }}>
                  <Chip tone="chip accent">KOTRA</Chip>
                  <div>
                    <b style={{ fontSize: 13 }}><Highlight text={title} terms={hlTerms} /></b>
                    {summary && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}><Highlight text={summary} terms={hlTerms} /></div>}
                  </div>
                  <div className="mono muted" style={{ fontSize: 11 }}>{date}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h3>
            <b>Naver news · 네이버 뉴스</b>
            <span className="muted">
              /api/trade/naver-news?q={krKey} ·
              {naver.loading ? " loading…" : naver.error ? ` error: ${naver.error}` : ` ${naverItems.length} items`}
            </span>
          </h3>
          <div className="body" style={{ padding: 0 }}>
            {naverItems.length === 0 && !naver.loading && (
              <div style={{ padding: "16px 18px", color: "var(--fg-muted)", fontSize: 13 }}>No Naver news for "{krKey}".</div>
            )}
            {naverItems.slice(0, 10).map((n, i) => {
              const title = n.newsTitl || n.title || "—";
              const date = (n.newsWrtDt || "").slice(0, 16);
              const summary = (n.cntntSumar || n.newsBdt || "").replace(/<[^>]+>/g, "").slice(0, 200);
              const cntry = n.cntryNm || "";
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 16, padding: "14px 18px", borderTop: i === 0 ? 0 : "1px solid var(--border)", alignItems: "start" }}>
                  <Chip>NAVER {cntry && `· ${cntry}`}</Chip>
                  <div>
                    <b style={{ fontSize: 13 }}><Highlight text={title} terms={hlTerms} /></b>
                    {summary && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}><Highlight text={summary} terms={hlTerms} /></div>}
                  </div>
                  <div className="mono muted" style={{ fontSize: 11 }}>{date}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside>
        <div className="panel">
          <h3><b>Source</b> <span className="muted">{selected?.name_en || selected?.name}</span></h3>
          <div className="body">
            <div className="row"><div className="k">EN</div><div className="v">{selected?.name_en || "—"}</div></div>
            <div className="row"><div className="k">KR</div><div className="v">{selected?.name || "—"}</div></div>
            <div className="row"><div className="k">CAS</div><div className="v mono">{selected?.cas_no || "—"}</div></div>
            <div className="row"><div className="k">CHEM_ID</div><div className="v mono">{selected?.chem_id || "—"}</div></div>
          </div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <h3><b>Endpoints used</b></h3>
          <div className="body">
            <div className="row"><div className="k">KOTRA</div><div className="v mono" style={{ fontSize: 11 }}>/trade/news?q={enKey}</div></div>
            <div className="row"><div className="k">NAVER</div><div className="v mono" style={{ fontSize: 11 }}>/trade/naver-news?q={krKey}</div></div>
            <div className="row"><div className="k">PRICES</div><div className="v muted" style={{ fontSize: 11 }}>/trade/prices — currently empty for chem queries</div></div>
            <div className="row"><div className="k">FRAUD</div><div className="v muted" style={{ fontSize: 11 }}>/trade/fraud — country-scoped, not chem</div></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function GuidesTab({ selected }) {
  const reco = useGuideRecommendations(selected?.chem_id, selected?.name_en || selected?.name);
  const status = useGuideStatus();
  const items = reco.data?.items || reco.data?.recommendations || (Array.isArray(reco.data) ? reco.data : []);
  return (
    <div className="layout-2col">
      <div className="panel">
        <h3>
          <b>KOSHA Guides</b>
          <span className="muted">
            권장 가이드 · {reco.loading ? "loading…" : reco.error ? `error: ${reco.error}` : `${items.length} match`}
          </span>
        </h3>
        <div>
          {items.length === 0 && !reco.loading && (
            <div className="guide-row" style={{ color: "var(--fg-muted)", justifyContent: "center" }}>
              No guide recommendations for this substance.
            </div>
          )}
          {items.map((g, i) => {
            const code = g.guide_no || g.code || `G-${i + 1}`;
            const title = g.title_kr || g.title || g.guide_title || "—";
            const subtitle = g.title_en || g.summary || "";
            const score = g.score ?? g.similarity ?? g.confidence;
            // Score buckets: ≥80 strong, 30–79 moderate, <30 weak/generic
            const tier = typeof score !== "number" ? null
              : score >= 80 ? { label: "STRONG", tone: "chip safe", color: "var(--safe)" }
              : score >= 30 ? { label: "MODERATE", tone: "chip", color: "var(--fg-muted)" }
              : { label: "GENERIC", tone: "chip", color: "var(--warn)" };
            return (
              <div key={`${code}-${i}`} className="guide-row">
                <span className="code">{code}</span>
                <div>
                  <b style={{ fontSize: 14 }}>{title}</b>
                  {subtitle && <div className="muted" style={{ fontSize: 12 }}>{subtitle}</div>}
                  {tier?.label === "GENERIC" && (
                    <div style={{ fontSize: 10, color: "var(--warn)", marginTop: 2, fontFamily: "var(--font-mono)", letterSpacing: ".06em" }}>
                      ⚠ Low-confidence match — guide may not be specific to this substance.
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {tier && <span className="chip" style={{ color: tier.color, borderColor: tier.color, fontSize: 9 }}>{tier.label}</span>}
                  {typeof score === "number" && <span className="score mono">match {score.toFixed(0)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside>
        <div className="panel">
          <h3><b>Dataset status</b> <span className="muted">/api/guides/status</span></h3>
          <div className="body">
            {status.loading && <div className="muted" style={{ fontSize: 12 }}>Loading…</div>}
            {status.error && <div style={{ color: "var(--hazard)", fontSize: 12 }}>{status.error}</div>}
            {status.data && Object.entries(status.data).slice(0, 8).map(([k, v]) => (
              <div key={k} className="row">
                <div className="k">{k}</div>
                <div className="v mono" style={{ fontSize: 12 }}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function AITab({ selected }) {
  const ai = useAIAnalysis(selected.chem_id, selected.name_en || selected.name);
  const startedRef = React.useRef(null);
  React.useEffect(() => {
    const key = `${selected.chem_id}|${selected.name_en || selected.name}`;
    if (startedRef.current !== key) {
      startedRef.current = key;
      ai.run();
    }
  }, [selected.chem_id, selected.name_en, selected.name]);

  const analysisText = ai.data?.analysis || ai.data?.summary || "";
  const sources = ai.data?.sources || [];
  const confidence = ai.data?.confidence;
  const mode = ai.data?.mode || ai.data?.engine;

  return (
    <div className="layout-2col">
      <div>
        <div className="ai-card">
          <div className="hd">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="spark" size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent-ink)", letterSpacing: ".08em" }}>EVIDENCE-BASED SUMMARY</span>
            </div>
            {typeof confidence === "number" && (
              <div className="conf">confidence {confidence.toFixed(2)} <div className="bar"><span style={{ width: `${Math.round(confidence * 100)}%` }} /></div></div>
            )}
          </div>
          <h4>Safety analysis · {selected.name_en || selected.name} {selected.cas_no && `(${selected.cas_no})`}</h4>
          {ai.loading && <p className="muted">Asking the model… (LLM call may take 10–25 s)</p>}
          {ai.error && <p style={{ color: "var(--hazard)" }}>Error: {ai.error}</p>}
          {!ai.loading && !ai.error && analysisText && (
            <div style={{ fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "var(--fg)" }}>
              {analysisText}
            </div>
          )}
          {!ai.loading && !ai.error && !analysisText && (
            <p className="muted">Click "Re-run" to request a fresh analysis.</p>
          )}
          {sources.length > 0 && (
            <div className="sources">
              {sources.map((s, i) => (
                <div key={i} className="src">
                  <span className="n">[{i + 1}]</span>
                  <span className="src-kind">{s.kind || s.source || "REF"}</span>
                  <span style={{ fontSize: 12 }}>{s.title || s.text || s.snippet || JSON.stringify(s).slice(0, 80)}</span>
                  <span className="mono muted" style={{ fontSize: 11 }}>{s.date || ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h3><b>Backend status</b> <span className="muted">/api/ai/analyze</span></h3>
          <div className="body">
            <div className="row"><div className="k">MODE</div><div className="v mono">{mode || "llm + rule fallback"}</div></div>
            <div className="row"><div className="k">CHEM</div><div className="v mono">{selected.chem_id} · {selected.name_en || selected.name}</div></div>
            <div className="row"><div className="k">STATE</div><div className="v">{ai.loading ? "running…" : ai.error ? `error · ${ai.error}` : analysisText ? "completed" : "idle"}</div></div>
            <div className="row"><div className="k">FALLBACK</div><div className="v">Always deterministic — rule_v2 if Ollama unreachable</div></div>
          </div>
        </div>
      </div>

      <aside>
        <div className="panel">
          <h3>
            <b>Re-run analysis</b>
            <button className="btn sm primary" onClick={ai.run} disabled={ai.loading}>
              {ai.loading ? "Running…" : "Run again"}
            </button>
          </h3>
          <div className="body">
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Each run posts <code className="inline">{`{ chemId: "${selected.chem_id}", chemicalName: "${selected.name_en || selected.name}" }`}</code> to <code className="inline">/api/ai/analyze</code>. Capped at 25 s server-side per CLAUDE.md.
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ── Other product views (thinner, link-style) ── */
function PatentsView({ selected }) {
  if (!selected) {
    return <EmptyView icon="doc" title="Patent search" hint="Pick a chemical first to see KIPRIS results." />;
  }
  return (
    <div>
      <h1>Patent Search · 특허 검색</h1>
      <div className="sub">KIPRIS live · query: <span className="mono">{selected.name_en || selected.name}</span></div>
      <PatentsTab selected={selected} />
    </div>
  );
}
function TradeView({ selected }) {
  if (!selected) {
    return <EmptyView icon="globe" title="Trade Intelligence" hint="Pick a chemical first to see KOTRA + Naver news for it." />;
  }
  return (
    <div>
      <h1>Trade Intelligence · 무역 인텔리전스</h1>
      <div className="sub">KOTRA feeds with Naver fallback for <span className="mono">{selected.name_en || selected.name}</span></div>
      <MarketTab selected={selected} />
    </div>
  );
}
function DrugsView() {
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
      <h1>Drug Evidence · 의약품 근거</h1>
      <div className="sub">MFDS approval + OpenFDA labels + PubMed literature (unified) · {totals.mfds + totals.openfda + totals.pubmed} upstream hits</div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "4px 4px 4px 14px", background: "var(--bg-elevated)", margin: "16px 0", maxWidth: 600 }}>
        <Icon name="search" size={16} style={{ color: "var(--fg-subtle)" }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") setSubmitted(q.trim()); }}
          style={{ border: 0, outline: 0, background: "transparent", fontSize: 14, padding: "10px 0" }}
          placeholder="Drug name, ingredient, or brand — e.g. acetaminophen / 타이레놀"
        />
        <button className="btn sm primary" onClick={() => setSubmitted(q.trim())}>Search</button>
      </div>
      <div className="muted mono" style={{ fontSize: 11, marginBottom: 16 }}>
        {loading ? "loading…" : error ? `error: ${error}` : `MFDS ${totals.mfds} · OpenFDA ${totals.openfda} (showing ${openfda.length}) · PubMed ${totals.pubmed} (showing ${pubmed.length})`}
      </div>

      {/* MFDS approvals */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3><b>MFDS · 식약처 허가</b> <span className="muted">{totals.mfds} results</span></h3>
        <div className="body" style={{ padding: 0 }}>
          {mfds.length === 0 && (
            <div style={{ padding: "14px 18px", color: "var(--fg-muted)", fontSize: 13 }}>
              No MFDS hits for "{submitted}". Korean approvals are searchable by Korean ingredient names — try 타이레놀 or 아세트아미노펜.
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
        <h3><b>OpenFDA · US FDA labels</b> <span className="muted">{totals.openfda} results · brand → generic → substance fallback</span></h3>
        <div className="body" style={{ padding: 0 }}>
          {openfda.length === 0 && !loading && (
            <div style={{ padding: "14px 18px", color: "var(--fg-muted)", fontSize: 13 }}>No OpenFDA labels for "{submitted}".</div>
          )}
          {openfda.slice(0, 10).map((r, i) => (
            <div key={i} style={{ padding: "12px 18px", borderTop: i === 0 ? 0 : "1px solid var(--border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "baseline" }}>
                <b>{cleanProduct(r)}</b>
                <Chip>OpenFDA</Chip>
              </div>
              {r.active_ingredient?.[0] && (
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  <span className="upper" style={{ marginRight: 6 }}>ING</span>
                  {String(r.active_ingredient[0]).slice(0, 120)}
                </div>
              )}
              {r.purpose?.[0] && (
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  <span className="upper" style={{ marginRight: 6 }}>USE</span>
                  {String(r.purpose[0]).slice(0, 120)}
                </div>
              )}
              {r.warnings?.[0] && (
                <div style={{ fontSize: 11, color: "var(--hazard)", marginTop: 2 }}>
                  <span className="upper" style={{ marginRight: 6 }}>WARN</span>
                  {String(r.warnings[0]).slice(0, 160)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* PubMed citations */}
      <div className="panel">
        <h3><b>PubMed · 의학문헌</b> <span className="muted">{totals.pubmed} indexed citations · showing latest {pubmed.length}</span></h3>
        <div className="body" style={{ padding: 0 }}>
          {pubmed.length === 0 && !loading && (
            <div style={{ padding: "14px 18px", color: "var(--fg-muted)", fontSize: 13 }}>No PubMed articles.</div>
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
  if (!selected) {
    return <EmptyView icon="book" title="KOSHA Guides" hint="Pick a chemical first to see recommendations." />;
  }
  return (
    <div>
      <h1>KOSHA Guides · 가이드라인</h1>
      <div className="sub">Local dataset · embedding + keyword match for <span className="mono">{selected.name_en || selected.name}</span></div>
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

Object.assign(window, { Product });
