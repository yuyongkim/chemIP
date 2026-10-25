// Product · Detail tabs — Patents, Market, Guides, AI.

function PatentsTab({ selected }) {
  const P = PRODUCT_LABELS.patents;
  const ST = PRODUCT_LABELS.status;
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

  // KIPRIS_PUBLIC_DISPLAY=false → 결과 목록 대신 KIPRIS 바로가기만 (kipris_link_only.jsx)
  if (isKiprisLinkOnly(data)) {
    return <KiprisLinkOnly data={data} query={q} />;
  }

  return (
    <div className="layout-2col">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, margin: 0 }}>{P.heading(q)}</h3>
            <span className="muted mono" style={{ fontSize: 11 }}>
              {loading ? ST.loading : error ? ST.error(error) : P.count(results.length)}
            </span>
          </div>
        </div>
        <table className="pat-table">
          <thead><tr>{P.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {results.length === 0 && !loading && (
              <tr><td colSpan="4" style={{ textAlign: "center", color: "var(--fg-muted)", padding: 24 }}>{P.none}</td></tr>
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
          <PanelTitle t={P.trend} />
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
          <PanelTitle t={P.topApplicants} />
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
  const K = PRODUCT_LABELS.market;
  const ST = PRODUCT_LABELS.status;
  // Use both English and Korean names for best Naver news coverage
  const enKey = selected?.name_en || selected?.name || "";
  const krKey = selected?.name || enKey;
  const kotra = useTradeNews(enKey);

  // KOTRA 블록에는 KOTRA 자료만. NAVER 결과는 아래 NaverResultsPanel(naver_results.jsx)이 따로 보인다.
  const kotraItems = (kotra.data?.data || kotra.data?.items || []).filter(n => n && n.source !== "naver");

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
          <PanelTitle t={K.kotra}>
            <span className="muted">
              {kotra.loading ? ST.loading : kotra.error ? ST.error(kotra.error) : K.items(kotraItems.length)}
            </span>
          </PanelTitle>
          <div className="body" style={{ padding: 0 }}>
            {kotraItems.length === 0 && !kotra.loading && (
              <div style={{ padding: "16px 18px", color: "var(--fg-muted)", fontSize: 13 }}>
                {K.kotraNone(enKey)}
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

        <NaverResultsPanel query={krKey} />
      </div>

      <aside>
        <div className="panel">
          <PanelTitle t={K.source} />
          <div className="body">
            <div className="row"><div className="k">{K.rows.kr}</div><div className="v">{selected?.name || "—"}</div></div>
            <div className="row"><div className="k">{K.rows.en}</div><div className="v">{selected?.name_en || "—"}</div></div>
            <div className="row"><div className="k">{K.rows.cas}</div><div className="v mono">{selected?.cas_no || "—"}</div></div>
            <div className="row"><div className="k">{K.rows.id}</div><div className="v mono">{selected?.chem_id || "—"}</div></div>
          </div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <PanelTitle t={K.endpoints} />
          <div className="body">
            <div className="row"><div className="k">KOTRA</div><div className="v mono" style={{ fontSize: 11 }}>/trade/news?q={enKey}</div></div>
            <div className="row"><div className="k">{K.naver.ko}</div><div className="v mono" style={{ fontSize: 11 }}>/trade/naver-news?q={krKey}</div></div>
            <div className="row"><div className="k">PRICES</div><div className="v muted" style={{ fontSize: 11 }}>{K.pricesNote}</div></div>
            <div className="row"><div className="k">FRAUD</div><div className="v muted" style={{ fontSize: 11 }}>{K.fraudNote}</div></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function GuidesTab({ selected }) {
  const G = PRODUCT_LABELS.guides;
  const ST = PRODUCT_LABELS.status;
  const reco = useGuideRecommendations(selected?.chem_id, selected?.name_en || selected?.name);
  const status = useGuideStatus();
  const items = reco.data?.items || reco.data?.recommendations || (Array.isArray(reco.data) ? reco.data : []);
  return (
    <div className="layout-2col">
      <div className="panel">
        <PanelTitle t={G.heading}>
          <span className="muted">
            {reco.loading ? ST.loading : reco.error ? ST.error(reco.error) : G.matches(items.length)}
          </span>
        </PanelTitle>
        <div>
          {items.length === 0 && !reco.loading && (
            <div className="guide-row" style={{ color: "var(--fg-muted)", justifyContent: "center" }}>
              {G.none}
            </div>
          )}
          {items.map((g, i) => {
            const code = g.guide_no || g.code || `G-${i + 1}`;
            const title = g.title_kr || g.title || g.guide_title || "—";
            const subtitle = g.title_en || g.summary || "";
            const score = g.score ?? g.similarity ?? g.confidence;
            // Score buckets: ≥80 strong, 30–79 moderate, <30 weak/generic
            const tier = typeof score !== "number" ? null
              : score >= 80 ? { key: "strong", label: G.tiers.strong, tone: "chip safe", color: "var(--safe)" }
              : score >= 30 ? { key: "moderate", label: G.tiers.moderate, tone: "chip", color: "var(--fg-muted)" }
              : { key: "generic", label: G.tiers.generic, tone: "chip", color: "var(--warn)" };
            return (
              <div key={`${code}-${i}`} className="guide-row">
                <span className="code">{code}</span>
                <div>
                  <b style={{ fontSize: 14 }}>{title}</b>
                  {subtitle && <div className="muted" style={{ fontSize: 12 }}>{subtitle}</div>}
                  {tier?.key === "generic" && (
                    <div style={{ fontSize: 10, color: "var(--warn)", marginTop: 2, fontFamily: "var(--font-mono)", letterSpacing: ".06em" }}>
                      {G.lowConfidence}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {tier && <span className="chip" style={{ color: tier.color, borderColor: tier.color, fontSize: 9 }}>{tier.label}</span>}
                  {typeof score === "number" && <span className="score mono">{G.match(score.toFixed(0))}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside>
        <div className="panel">
          <PanelTitle t={G.status} />
          <div className="body">
            {status.loading && <div className="muted" style={{ fontSize: 12 }}>{ST.loading}</div>}
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
  const A = PRODUCT_LABELS.ai;
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
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent-ink)", letterSpacing: ".08em" }}>{A.kicker}</span>
            </div>
            {typeof confidence === "number" && (
              <div className="conf">{A.confidence} {confidence.toFixed(2)} <div className="bar"><span style={{ width: `${Math.round(confidence * 100)}%` }} /></div></div>
            )}
          </div>
          <h4>{A.title(selected.name || selected.name_en, selected.cas_no)}</h4>
          {ai.loading && <p className="muted">{A.loading}</p>}
          {ai.error && <p style={{ color: "var(--hazard)" }}>{PRODUCT_LABELS.status.error(ai.error)}</p>}
          {!ai.loading && !ai.error && analysisText && (
            <div style={{ fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "var(--fg)" }}>
              {analysisText}
            </div>
          )}
          {!ai.loading && !ai.error && !analysisText && (
            <p className="muted">{A.rerunHint}</p>
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
          <PanelTitle t={A.backend} />
          <div className="body">
            <div className="row"><div className="k">{A.rows.mode}</div><div className="v mono">{mode || A.modeDefault}</div></div>
            <div className="row"><div className="k">{A.rows.chem}</div><div className="v mono">{selected.chem_id} · {selected.name || selected.name_en}</div></div>
            <div className="row"><div className="k">{A.rows.state}</div><div className="v">{ai.loading ? A.states.running : ai.error ? PRODUCT_LABELS.status.error(ai.error) : analysisText ? A.states.done : A.states.idle}</div></div>
            <div className="row"><div className="k">{A.rows.fallback}</div><div className="v">{A.fallbackNote}</div></div>
          </div>
        </div>
      </div>

      <aside>
        <div className="panel">
          <PanelTitle t={A.rerun}>
            <button className="btn sm primary" onClick={ai.run} disabled={ai.loading}>
              {ai.loading ? A.running : A.runAgain}
            </button>
          </PanelTitle>
          <div className="body">
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{A.note}</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function RegulationTab({ selected }) {
  const G = PRODUCT_LABELS.regulation;
  const name = selected?.name_en || selected?.name || "";
  const [nonce, setNonce] = useState(0);
  const intel = useRegulatoryIntelligence(selected?.chem_id, nonce);
  const kotra = useKotraReach(name);

  const sources = intel.data?.sources || {};
  const echa = sources.echa || { data: [] };
  const niosh = sources.niosh || { data: [] };
  const comptox = sources.comptox || { data: [] };
  const kischem = sources.kischem || { data: [] };
  const ncis = sources.ncis || { data: [] };
  const aliases = intel.data?.aliases || [];
  const terms = intel.data?.search_terms || [];
  const kotraItems = kotra.data?.data || kotra.data?.items || [];

  // De-dupe REACH statuses across all ECHA records
  const reachStatus = React.useMemo(() => {
    const out = [], seen = new Set();
    (echa.data || []).forEach(it => (it.reach_status || []).forEach(s => {
      if (s && s.code && !seen.has(s.code)) { seen.add(s.code); out.push(s); }
    }));
    return out;
  }, [echa.data]);

  return (
    <div className="layout-2col">
      <div>
        {/* REACH status banner */}
        <div className="panel">
          <h3><b>{G.reach}</b> <span className="muted"><Abbr code="ECHA" /> · REACH / CLP</span></h3>
          <div className="body">
            {intel.loading && <div className="muted" style={{ fontSize: 12 }}>해외 규제 DB(ECHA·NIOSH·CompTox) 조회 중…</div>}
            {!intel.loading && intel.error && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "var(--warn-ink, #9a6400)", fontSize: 12 }}>
                  조회가 지연되어 불러오지 못했습니다 ({intel.error}).
                </span>
                <button className="btn sm" onClick={() => setNonce(n => n + 1)}>다시 시도</button>
              </div>
            )}
            {!intel.loading && !intel.error && reachStatus.length === 0 && (
              <div className="muted" style={{ fontSize: 12 }}>이 물질은 REACH 규제목록(후보목록·인가·제한) 등재 정보가 확인되지 않습니다.</div>
            )}
            {reachStatus.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {reachStatus.map(s => (
                  <span key={s.code} style={{
                    fontSize: 11, fontWeight: 650, padding: "3px 10px", borderRadius: 11,
                    border: "1px solid " + (s.code === "REG_REGISTERED" ? "var(--safe, #2e7d32)" : "var(--warn, #d9a441)"),
                    color: s.code === "REG_REGISTERED" ? "var(--safe, #2e7d32)" : "var(--warn-ink, #9a6400)",
                    background: s.code === "REG_REGISTERED" ? "var(--safe-soft, #e9f7ef)" : "var(--warn-soft, #fff4e0)",
                  }}>{s.label}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ECHA records */}
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>
            <b><Abbr code="ECHA" /> {G.echaRecords}</b>
            <span className="muted">{echa.query_used ? `q:${echa.query_used} · ` : ""}{G.recs(echa.total || (echa.data || []).length)}</span>
          </h3>
          <div className="body">
            {echa.error && <div style={{ color: "var(--hazard)", fontSize: 12 }}>{echa.error}</div>}
            {!echa.error && (echa.data || []).length === 0 && <div className="muted" style={{ fontSize: 12 }}>{G.noEcha}</div>}
            {(echa.data || []).slice(0, 4).map((it, i) => (
              <div key={i} className="row" style={{ alignItems: "flex-start" }}>
                <div className="k mono" style={{ fontSize: 11 }}>{it.cas_number || it.rml_id || "—"}</div>
                <div className="v" style={{ fontSize: 12 }}>
                  <b>{it.name || it.iupac_name || "—"}</b>
                  {it.ec_number && <span className="muted"> · EC {it.ec_number}</span>}
                  {it.molecular_formula && <span className="muted"> · {it.molecular_formula}</span>}
                  {(it.reach_status || []).length > 0 && (
                    <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {it.reach_status.map(s => (<span key={s.code} className="chip" style={{ fontSize: 9 }}>{s.label}</span>))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NIOSH exposure limits */}
        <div className="panel" style={{ marginTop: 16 }}>
          <h3><b><Abbr code="NIOSH" /> {G.niosh}</b> <span className="muted">{G.recs(niosh.total || (niosh.data || []).length)}</span></h3>
          <div className="body">
            {(niosh.data || []).length === 0 && <div className="muted" style={{ fontSize: 12 }}>{G.noNiosh}</div>}
            {(niosh.data || []).slice(0, 3).map((it, i) => (
              <div key={i} style={{ padding: "6px 0", borderTop: i === 0 ? 0 : "1px solid var(--border)" }}>
                <b style={{ fontSize: 13 }}>{it.name || "—"}</b>
                {it.cas && <span className="muted mono" style={{ fontSize: 11 }}> · {it.cas}</span>}
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  REL {it.rel || "—"} · PEL {it.pel || "—"} · IDLH {it.idlh || "—"}
                </div>
                {it.target_organs && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>표적장기: {it.target_organs}</div>}
                {it.carcinogen && <span className="chip hazard" style={{ fontSize: 9, marginTop: 4, display: "inline-block" }}>발암 우려물질</span>}
              </div>
            ))}
          </div>
        </div>

        {/* CompTox */}
        <div className="panel" style={{ marginTop: 16 }}>
          <h3><b><Abbr code="CompTox" /></b> <span className="muted">{comptox.available === false ? "API key 미설정" : G.recs(comptox.total || (comptox.data || []).length)}</span></h3>
          <div className="body">
            {comptox.available === false && <div className="muted" style={{ fontSize: 12 }}>{comptox.message || G.comptoxNoKey}</div>}
            {comptox.available !== false && (comptox.data || []).length === 0 && <div className="muted" style={{ fontSize: 12 }}>{G.noComptox}</div>}
            {(comptox.data || []).slice(0, 3).map((it, i) => (
              <div key={i} className="row">
                <div className="k mono" style={{ fontSize: 11 }}>{it.dtxsid || "—"}</div>
                <div className="v" style={{ fontSize: 12 }}>{it.preferredName || it.preferred_name || it.name || "—"}{it.casrn && <span className="muted"> · {it.casrn}</span>}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside>
        {/* KOTRA REACH Q&A */}
        <div className="panel">
          <h3><b><Abbr code="KOTRA" /> · REACH 자료</b> <span className="muted">{kotra.loading ? PRODUCT_LABELS.status.loading : G.recs(kotraItems.length)}</span></h3>
          <div className="body" style={{ padding: 0 }}>
            {kotraItems.length === 0 && !kotra.loading && (
              <div style={{ padding: "12px 16px" }} className="muted" >REACH 관련 KOTRA 자료가 없습니다.</div>
            )}
            {kotraItems.slice(0, 8).map((n, i) => {
              const title = n.newsTitl || n.title || "—";
              const url = n.kotraNewsUrl || n.newsUrl || "#";
              const summary = (n.cntntSumar || "").slice(0, 120);
              return (
                <div key={i} style={{ padding: "10px 16px", borderTop: i === 0 ? 0 : "1px solid var(--border)" }}>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-ink)" }}>{title}</a>
                  {summary && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{summary}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Korean classification quick */}
        <div className="panel" style={{ marginTop: 16 }}>
          <h3><b>국내 규제·분류</b> <span className="muted"><Abbr code="KISCHEM" /> · <Abbr code="NCIS" /></span></h3>
          <div className="body">
            <div className="row"><div className="k"><Abbr code="KISCHEM" /></div><div className="v" style={{ fontSize: 12 }}>{(kischem.data || []).length} 노출·응급 자료</div></div>
            <div className="row"><div className="k"><Abbr code="NCIS" /></div><div className="v" style={{ fontSize: 12 }}>{(ncis.data || []).length} 분류 자료</div></div>
            {((ncis.data || [])[0]?.classifications || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {ncis.data[0].classifications.map((c, i) => (<span key={i} className="chip hazard" style={{ fontSize: 9 }}>{c}</span>))}
              </div>
            )}
          </div>
        </div>

        {/* Intelligence summary */}
        <div className="panel" style={{ marginTop: 16 }}>
          <PanelTitle t={G.intel} />
          <div className="body">
            <div className="row"><div className="k">{G.aliases}</div><div className="v">{aliases.length}</div></div>
            <div className="row" style={{ alignItems: "flex-start" }}><div className="k">{G.terms}</div><div className="v" style={{ fontSize: 12 }}>{terms.join(", ") || "—"}</div></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

Object.assign(window, { PatentsTab, MarketTab, GuidesTab, AITab, RegulationTab });
