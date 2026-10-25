// Research view — the five-paper story built on the ChemIP database.

function useJson(url) {
  const key = url.split("/").pop().replace(/\.json$/, "");
  const inline = (typeof window !== "undefined" && window.__CHSB && window.__CHSB[key]) || null;
  const [state, setState] = useState(inline ? { data: inline, loading: false, error: null } : { data: null, loading: true, error: null });
  useEffect(() => {
    if (inline) return;
    let alive = true;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status + ""); return r.json(); })
      .then(d => { if (alive) setState({ data: d, loading: false, error: null }); })
      .catch(e => { if (alive) setState({ data: null, loading: false, error: String(e.message || e) }); });
    return () => { alive = false; };
  }, [url]);
  return state;
}

const PAPER_BANDS = { 1: "var(--fg)", 2: "var(--accent)", 3: "var(--hazard)", 4: "var(--safe)", 5: "var(--warn, #d9a441)" };

function Research({ setView }) {
  const { data: meta, loading } = useJson("data/research_meta.json");
  const { data: cmp } = useJson("data/multimodel_comparison.json");

  return (
    <div className="paper-wrap">
      <header className="paper-hero">
        <div className="eyebrow"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} /> RESEARCH · CHEMIP</div>
        <h1>One database, <em>five papers.</em></h1>
        <p>ChemIP pulls Korean and international chemical-safety records into one auditable,
           CAS-centered evidence base. Five papers grow out of that base — the platform itself,
           an entity-resolution workflow, a regulatory-gap study, a source-grounded faithfulness
           benchmark, and an emission-versus-hazard-authority overlay. Every one of them describes
           a screen you can open here: each card links to the running view its figures came from.</p>
      </header>

      {loading && <div className="muted" style={{ padding: "40px 0", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading research summary…</div>}

      {meta && <>
        <div className="paper-grid">
          {meta.papers.map(p => (
            <article className="paper-card" key={p.id} style={{ "--band": PAPER_BANDS[p.id] }}>
              <div className="pc-id">
                PAPER {p.id} · {p.code}
                {p.status && <span className="pc-status">{p.status}</span>}
              </div>
              <h3>{p.title}</h3>
              <div className="pc-contrib">{p.contribution}</div>
              <div className="pc-venue">{p.venue}
                {(p.impact || p.cost) && <small>{[p.impact, p.cost].filter(Boolean).join(" · ")}</small>}
              </div>
              <div className="pc-stats">
                {p.stats.map(([label, val]) => (
                  <div className="pc-stat" key={label}><b>{val}</b><span>{label}</span></div>
                ))}
              </div>
              {p.screen && (
                <a className="pc-screen" href={p.screen.href}>
                  <Icon name="atom" size={13} />
                  <span>{p.screen.label}</span>
                  <span className="pc-arrow">→</span>
                </a>
              )}
            </article>
          ))}
        </div>

        <FindingBlock finding={meta.finding} cmp={cmp} />

        <SectionHead no="4" eyebrow="SUBMISSION STATUS" title="Where each paper is headed" />
        <div className="mtable-scroll" style={{ marginTop: 4 }}>
          <table className="mtable">
            <thead><tr><th>Paper</th><th>Venue</th><th>Status</th><th>Cost</th><th>Live screen</th></tr></thead>
            <tbody>
              {meta.papers.map(p => (
                <tr key={p.id}>
                  <th>{p.id} · {p.code}</th>
                  <td>{p.venue}{p.impact ? ` · ${p.impact}` : ""}</td>
                  <td>{p.status || "—"}</td>
                  <td>{p.cost || "—"}</td>
                  <td>{p.screen ? <a href={p.screen.href}>{p.screen.label}</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 40, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => setView("benchmark")}><Icon name="spark" size={13} /> Explore the benchmark</button>
          <a className="btn ghost" href="https://github.com/yuyongkim/chemIP" target="_blank" rel="noopener"><Icon name="git" size={13} /> Source &amp; data</a>
        </div>
      </>}
    </div>
  );
}

function FindingBlock({ finding, cmp }) {
  // The same model, same questions, same grader — only the decoding budget differs.
  // The truncated run is what produced the retracted "grounding collapse".
  const bars = useMemo(() => {
    if (!cmp) return [];
    const setting = "ChemIP hybrid RAG + abstention";
    const p = cmp.matrix.claim_support_precision[setting] || {};
    const pick = [
      { key: "deepseek-v4-flash (truncated)", label: "flash · 420-token budget", color: "var(--hazard)" },
      { key: "deepseek-v4-flash", label: "flash · 8,000-token budget", color: "var(--safe)" },
      { key: "deepseek-v4-pro", label: "pro · unchanged", color: "var(--accent)" },
    ];
    return pick.filter(b => p[b.key] != null).map(b => ({ ...b, val: p[b.key] }));
  }, [cmp]);

  return (
    <div className="finding">
      <div className="eyebrow">§ 3 · HEADLINE FINDING</div>
      <h2>{finding.headline}</h2>
      <p>{finding.detail}</p>
      {bars.length > 0 && (
        <div className="fbars">
          {bars.map(b => (
            <div className="fbar" key={b.key}>
              <div className="fb-lab">{b.label}</div>
              <div className="fb-track"><div className="fb-fill" style={{ width: (b.val * 100) + "%", background: b.color }} /></div>
              <div className="fb-val">{b.val.toFixed(3)}</div>
            </div>
          ))}
          <div className="fbar" style={{ background: "transparent", display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "color-mix(in oklch, var(--fg-inverse) 62%, transparent)" }}>
              Claim-support precision, <b>hybrid retrieval + abstention</b>. The first two bars are the
              same model on the same questions; only the token budget differs.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Research });
