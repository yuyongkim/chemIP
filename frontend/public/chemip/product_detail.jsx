// Product · Chemical detail view — header, MSDS 16 sections, regulation panel (§15).

/* ── Chemical detail (MAIN) ───────────── */
function ChemicalView({ tab, setTab, selected, anchor = "" }) {
  // Hooks must run in stable order — call before any early return
  const detail = useChemicalDetail(selected?.chem_id);
  if (!selected) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)" }}>
        <Icon name="atom" size={28} style={{ color: "var(--fg-subtle)" }} />
        <h3 style={{ marginTop: 12, fontFamily: "var(--font-display)" }}>{PRODUCT_LABELS.chem.emptyTitle}</h3>
        <p style={{ fontSize: 13 }}>{PRODUCT_LABELS.chem.emptyHint}</p>
      </div>
    );
  }
  const sections = detail.data?.sections || [];
  const T = PRODUCT_LABELS.tabs;
  // 중소기업 실무에 가장 필요한 "규제·인허가 / 수출입" 탭을 MSDS 바로 뒤에 둔다.
  const tabs = [
    { k: "msds", label: T.msds.ko, n: `${sections.length}/16` },
    // 새 탭은 Component 를 단 한 줄로 등록한다(탭 본문은 아래에서 Component 로 그린다).
    { k: "trade", label: TRADE_LABELS.tabLabel, n: "↔", Component: TradeControlsTab },
    { k: "regulation", label: T.regulation.ko, n: "EU" },
    { k: "patents", label: T.patents.ko, n: "↻" },
    { k: "market", label: T.market.ko, n: "—" },
    { k: "guides", label: T.guides.ko, n: "↻" },
    { k: "ai", label: T.ai.ko, n: "★" },
  ];
  return (
    <div>
      <ChemHeader selected={selected} sections={sections} loading={detail.loading} error={detail.error} />
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.k} aria-selected={tab === t.k} onClick={() => setTab(t.k)} title={T[t.k]?.en}>
            {t.label} <span className="n">{t.n}</span>
          </button>
        ))}
      </div>
      {tab === "msds" && <MSDSTab selected={selected} sections={sections} loading={detail.loading} error={detail.error} />}
      {tab === "patents" && <PatentsTab selected={selected} />}
      {tab === "market" && <MarketTab selected={selected} />}
      {tab === "guides" && <GuidesTab selected={selected} />}
      {tab === "regulation" && <RegulationTab selected={selected} />}
      {(() => { const C = tabs.find(t => t.k === tab)?.Component; return C ? <C selected={selected} /> : null; })()}
      {tab === "ai" && <AITab selected={selected} />}
      <IntlRegulationPanel selected={selected} />
      <IncidentPanel selected={selected} />
      <EnforcementPanel selected={selected} />
      <HandlersPanel selected={selected} anchor={anchor} />
    </div>
  );
}

function ChemHeader({ selected, sections, loading, error }) {
  const L = PRODUCT_LABELS.chem;
  // Pull display name pieces from the selected chemical
  const enName = selected?.name_en || "";
  // 이름이 "벤젠 (Benzene)" 처럼 영문명을 괄호로 달고 오면 머리에서 영문이 두 번 보이지 않게 뗀다.
  const rawKr = selected?.name || "—";
  const krName = enName && rawKr.toLowerCase().endsWith(`(${enName.toLowerCase()})`) ? rawKr.slice(0, -(enName.length + 2)).trim() || rawKr : rawKr;
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
          <span className="mono">{L.idLabel} {selected?.chem_id}</span>
          <span>·</span>
          <span>{selected?.source || "—"}</span>
          {loading && <span className="muted">· {L.loadingMsds}</span>}
          {error && <span style={{ color: "var(--hazard)" }}>· {error}</span>}
        </div>
        <h1>{krName !== "—" ? krName : enName} {enName && krName !== enName && krName !== "—" && <span className="muted" style={{ fontWeight: 400 }}>· {enName}</span>}</h1>
        <div className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
          {loading ? L.loadingMsds
            : sections?.length ? L.msdsCount(sections.length)
            : selected?.has_msds ? L.msdsPending
            : L.msdsNone}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {isFlammable && <Chip tone="chip hazard"><span className="dot" />{L.flammable}</Chip>}
          {isIrritant && <Chip tone="chip hazard"><span className="dot" />{L.irritant}</Chip>}
          {!isFlammable && !isIrritant && hazardText && <Chip tone="chip hazard"><span className="dot" />{L.hazard}</Chip>}
          {selected?.has_msds && <Chip tone="chip safe"><span className="dot" />{L.msdsAvailable}</Chip>}
        </div>
        <a className="detail-open-link" href={`/chemical/${selected?.chem_id}`}>
          <Icon name="ext" size={13} /> {L.openFull}
        </a>
        <FeedbackReportLink selected={selected} />
      </div>
      <div className="stats-mini">
        <div>
          <div className="m">{L.stats.msds.m}</div>
          <div className="v tnum">{sections?.length || 0}<span className="unit" style={{ fontSize: 14, color: "var(--fg-muted)" }}>/16</span></div>
          <div className="muted" style={{ fontSize: 11 }}>{L.stats.msds.sub}</div>
        </div>
        <div>
          <div className="m">{L.stats.cas.m}</div>
          <div className="v tnum mono" style={{ fontSize: 16 }}>{selected?.cas_no || "—"}</div>
          <div className="muted" style={{ fontSize: 11 }}>{L.stats.cas.sub}</div>
        </div>
        <div>
          <div className="m">{L.stats.source.m}</div>
          <div className="v" style={{ fontSize: 16 }}>{selected?.source || "—"}</div>
          <div className="muted" style={{ fontSize: 11 }}>{L.stats.source.sub}</div>
        </div>
        <div>
          <div className="m">{L.stats.status.m}</div>
          <div className="v" style={{ fontSize: 16, color: error ? "var(--hazard)" : (!sections?.length && !loading) ? "var(--warn)" : "var(--safe)" }}>
            {loading ? "…" : error ? L.stats.status.err : !sections?.length ? L.stats.status.noMsds : L.stats.status.ok}
          </div>
          <div className="muted" style={{ fontSize: 11 }}>{!sections?.length && !loading && !error ? L.stats.status.subNoMsds : L.stats.status.sub}</div>
        </div>
      </div>
    </div>
  );
}

// Regulatory-obligation flags. Scans §15 (Korean regulations) + §2 (GHS hazards)
// so a real obligation is never hidden behind a single "해당없음" line.
const REG_FLAGS = [
  { re: /발암/, label: "발암성", tone: "bad" },
  { re: /H350/, label: "발암성(H350)", tone: "bad" },
  { re: /변이원|생식세포/, label: "변이원성", tone: "bad" },
  { re: /H340/, label: "변이원성(H340)", tone: "bad" },
  { re: /생식독성|생식능력|태아/, label: "생식독성", tone: "bad" },
  { re: /관리대상유해물질/, label: "관리대상유해물질", tone: "bad" },
  { re: /유독물질/, label: "유독물질", tone: "bad" },
  { re: /사고대비물질/, label: "사고대비물질", tone: "bad" },
  { re: /제한물질|금지물질/, label: "제한·금지물질", tone: "bad" },
  { re: /중점관리물질/, label: "중점관리물질", tone: "warn" },
  { re: /작업환경측정/, label: "작업환경측정 대상", tone: "warn" },
  { re: /특수건강진단/, label: "특수건강진단 대상", tone: "warn" },
  { re: /공정안전보고서|PSM/, label: "PSM 제출대상", tone: "warn" },
  { re: /노출기준/, label: "노출기준 설정", tone: "info" },
];
function regChips(rowSets) {
  const text = rowSets.flat().map(r => `${r.k} ${r.v}`).join(" | ");
  const seen = new Set();
  const chips = [];
  REG_FLAGS.forEach(f => {
    if (f.re.test(text) && !seen.has(f.label)) { seen.add(f.label); chips.push(f); }
  });
  return chips;
}
function splitReg(v) {
  return String(v || "").split(/[|·\n]/).map(s => s.trim()).filter(s => s && s !== "해당없음");
}

function MSDSTab({ selected, sections, loading, error }) {
  const M = PRODUCT_LABELS.msds;
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
  const sec2rows = parseSectionRows(sectionsByNum[2]);
  const regFlags = regChips([sec15rows, sec2rows]);

  return (
    <div className="layout-2col">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0, letterSpacing: "-0.01em" }}>{M.heading.ko}<span className="title-en" lang="en">{M.heading.en}</span></h3>
          <span className="muted mono" style={{ fontSize: 11 }}>
            {M.source(selected.chem_id)}
            {loading && ` · ${PRODUCT_LABELS.status.loading}`}
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
                <div className="t">{s.kr}</div>
                <div className="kr" lang="en">{s.en}</div>
                <div className="status">
                  <span>{status === "ok" ? M.cached : status === "empty" ? M.noData : "—"}</span>
                  <span>{status === "ok" ? "OK" : status === "empty" ? "—" : (loading ? "…" : "○")}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }} className="panel">
          <h3>
            <b>§ {String(expanded).padStart(2, "0")} · {MSDS_SECTIONS[expanded - 1]?.kr}<span className="title-en" lang="en">{MSDS_SECTIONS[expanded - 1]?.en}</span></b>
          </h3>
          <div className="body">
            {expandedRows.length === 0 && (
              <div className="muted" style={{ fontSize: 13, padding: "8px 0" }}>
                {loading ? M.loadingSection : error ? PRODUCT_LABELS.status.error(error) : M.noSection}
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
          <PanelTitle t={M.physical}><span className="muted">§ 09</span></PanelTitle>
          <div className="body">
            {sec9rows.length === 0 && <div className="muted" style={{ fontSize: 12 }}>{M.noSec9}</div>}
            {sec9rows.slice(0, 10).map((r, i) => (
              <div key={i} className="row">
                <div className="k">{r.k.slice(0, 14)}</div>
                <div className="v" style={{ fontSize: 12 }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <PanelTitle t={M.regulation}><span className="muted">§ 15</span></PanelTitle>
          <div className="body">
            {sec15rows.length === 0 && <div className="muted" style={{ fontSize: 12 }}>{M.noSec15}</div>}
            {regFlags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                {regFlags.map((f, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontWeight: 650, padding: "2px 8px", borderRadius: 11,
                    background: f.tone === "bad" ? "var(--hazard-soft, #fdecea)" : f.tone === "warn" ? "var(--warn-soft, #fff4e0)" : "var(--info-soft, #eaf2fb)",
                    color: f.tone === "bad" ? "var(--hazard, #b3261e)" : f.tone === "warn" ? "var(--warn-ink, #9a6400)" : "var(--info-ink, #1b5aa0)",
                    border: "1px solid " + (f.tone === "bad" ? "var(--hazard, #b3261e)" : f.tone === "warn" ? "var(--warn, #d9a441)" : "var(--info, #4a86c7)"),
                  }}>{f.label}</span>
                ))}
              </div>
            )}
            {sec15rows.map((r, i) => {
              const items = splitReg(r.v);
              const none = items.length === 0; // only "해당없음"
              return (
                <div key={i} className="row" style={{ alignItems: "flex-start" }}>
                  <div className="k" title={r.k}>{r.k.slice(0, 16)}</div>
                  <div className="v" style={{ fontSize: 12 }}>
                    {none ? <span className="muted">{M.none}</span>
                      : items.map((it, j) => (
                          <div key={j} style={{ padding: "1px 0" }}>· {it}</div>
                        ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

Object.assign(window, { ChemicalView, ChemHeader, MSDSTab });
