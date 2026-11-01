// Product · Search view — chemical lookup + results grid.

/* ── Search view ──────────────────────── */
function SearchView({ onOpen, initialQuery, onQuerySubmit }) {
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
    // 검색어와 이름·영문명·CAS 가 정확히 같은 물질을 맨 앞에 둔다(예: "벤젠" → 벤젠 (Benzene)).
    const term = submitted.trim().toLowerCase();
    const exact = (it) => {
      const names = [it.cas_no, it.name_en, it.name, String(it.name || "").replace(/\s*\(.*\)\s*$/, "")];
      return names.some(n => String(n || "").trim().toLowerCase() === term);
    };
    const rank = (it) => {
      if (term && exact(it)) return -1;
      const s = (it.source || "").toLowerCase();
      if (s === "kosha" && it.has_msds) return 0;
      if (s === "kosha") return 1;
      if (s === "echa") return 2;
      return 3;
    };
    return [...filtered].sort((a, b) => rank(a) - rank(b));
  }, [rawItems, sourceFilter, submitted]);

  const submit = () => { const t = q.trim(); setSubmitted(t); if (t) onQuerySubmit && onQuerySubmit(t); };
  const onKey = (e) => { if (e.key === "Enter") submit(); };

  const S = PRODUCT_LABELS.search;
  return (
    <div>
      <div style={{ maxWidth: 720, margin: "60px auto 28px", textAlign: "center" }}>
        <h1 style={{ fontSize: 48, letterSpacing: "-0.035em", marginBottom: 12 }}>{S.title}</h1>
        <div className="muted" style={{ fontSize: 16, marginBottom: 28 }}>{S.sub}</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "4px 4px 4px 14px", background: "var(--bg-elevated)", boxShadow: "var(--shadow-2)" }}>
          <Icon name="search" size={18} style={{ color: "var(--fg-subtle)" }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            style={{ border: 0, outline: 0, background: "transparent", fontSize: 16, padding: "12px 0" }}
            placeholder={S.placeholder}
            aria-label={S.placeholder}
          />
          <button className="btn primary" onClick={submit}>{S.button}</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: 12, marginRight: 4 }}>{S.tryLabel}</span>
          {S.tryTerms.map(r => (
            <span key={r} className="chip" style={{ cursor: "pointer" }} onClick={() => { setQ(r); setSubmitted(r); onQuerySubmit && onQuerySubmit(r); }}>{r}</span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: 12, marginRight: 4 }}>{S.openLabel}</span>
          {FEATURED_CHEMICALS.map(c => (
            <a key={c.chem_id} className="btn sm" style={{ borderColor: "var(--accent)", color: "var(--accent-ink)" }} href={`?view=product&pv=chemical&chem=${c.chem_id}`}>
              {c.name} <span className="kbd">{c.cas_no}</span>
            </a>
          ))}
        </div>
      </div>

      {submitted && (
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0, letterSpacing: "-0.01em" }}>
              {S.results(submitted)}
              {loading && <span className="muted" style={{ fontSize: 12, marginLeft: 10 }}>{PRODUCT_LABELS.status.loading}</span>}
            </h3>
            <span className="muted mono" style={{ fontSize: 11 }}>
              {error ? PRODUCT_LABELS.status.error(error) : S.hits(items.length, rawItems.length)}
            </span>
          </div>

          {rawItems.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
              <span className="upper" style={{ color: "var(--fg-muted)", marginRight: 4 }}>{S.sourceLabel}</span>
              <div className="seg" style={{ height: 28 }}>
                <button aria-pressed={sourceFilter === "all"} onClick={() => setSourceFilter("all")}>{S.all} · {sourceCounts.all}</button>
                <button aria-pressed={sourceFilter === "kosha"} onClick={() => setSourceFilter("kosha")}>KOSHA · {sourceCounts.kosha}</button>
                <button aria-pressed={sourceFilter === "echa"} onClick={() => setSourceFilter("echa")}>ECHA · {sourceCounts.echa}</button>
                {sourceCounts.other > 0 && (
                  <button aria-pressed={sourceFilter === "other"} onClick={() => setSourceFilter("other")}>{S.other} · {sourceCounts.other}</button>
                )}
              </div>
              <span className="muted mono" style={{ fontSize: 11, marginLeft: "auto" }}>
                {S.sortNote}
              </span>
            </div>
          )}

          {items.length === 0 && !loading && !error && (
            <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)" }}>{S.none}</div>
          )}
          {items.length > 0 && (() => {
            // Visually group by source — insert section headers between groups
            const rows = [];
            let lastGroup = null;
            items.forEach(it => {
              const s = (it.source || "").toLowerCase();
              const groupKey = s === "kosha" && it.has_msds ? S.groupMsds : (it.source || S.other);
              if (groupKey !== lastGroup) {
                rows.push({ kind: "header", key: `h-${groupKey}`, label: groupKey });
                lastGroup = groupKey;
              }
              rows.push({ kind: "row", key: `${it.id}-${it.chem_id}`, it });
            });
            return (
              <div style={{ overflowX: "auto" }}>
              <table className="pat-table" style={{ tableLayout: "fixed", minWidth: 720 }}>
                <colgroup><col style={{ width: "38%" }} /><col style={{ width: "22%" }} /><col style={{ width: "13%" }} /><col style={{ width: "10%" }} /><col style={{ width: "11%" }} /><col style={{ width: "6%" }} /></colgroup>
                <thead><tr><th>{S.cols.name}</th><th>{S.cols.en}</th><th>{S.cols.cas}</th><th>{S.cols.id}</th><th>{S.cols.source}</th><th></th></tr></thead>
                <tbody>
                  {rows.map(r => r.kind === "header" ? (
                    <tr key={r.key}>
                      <td colSpan="6" style={{ background: "var(--bg-sunken)", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--fg-muted)", padding: "8px 14px" }}>
                        § <Abbr code={String(r.label).split(" ")[0]}>{r.label}</Abbr>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.key} style={{ cursor: "pointer" }} tabIndex={0} onClick={() => onOpen(r.it)} onKeyDown={e => { if (e.key === "Enter") onOpen(r.it); }}>
                      <td style={{ overflowWrap: "anywhere" }}><b>{r.it.name}</b></td>
                      <td className="muted" style={{ fontSize: 12, overflowWrap: "anywhere" }}>{r.it.name_en || "—"}</td>
                      <td className="mono" style={{ whiteSpace: "nowrap" }}>{r.it.cas_no || "—"}</td>
                      <td className="mono muted" style={{ fontSize: 11 }}>{r.it.chem_id}</td>
                      <td>{r.it.has_msds ? <Chip tone="chip safe"><span className="dot" /><Abbr code={r.it.source} /></Chip> : <Chip><Abbr code={r.it.source} /></Chip>}</td>
                      <td><span className="muted" style={{ fontSize: 11 }}>{S.open}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            );
          })()}
        </div>
      )}

      {!submitted && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 40 }}>
          {S.cards.map(card => (
            <div key={card.t} className="card" style={{ padding: 20 }}>
              <Icon name={card.ic} size={18} style={{ color: "var(--accent)" }} />
              <h4 style={{ margin: "10px 0 4px", fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-0.01em" }}>{card.t}</h4>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }} lang="en">{card.k}</div>
              <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SearchView });
