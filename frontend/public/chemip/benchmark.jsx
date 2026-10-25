// Benchmark view — Results · Explore · Label, for ChemSafety-HalBench.

// ── Bilingual (한/영) strings for the benchmark view ──
const BENCH_T = {
  en: {
    eyebrow: "CHEMSAFETY-HALBENCH · SOURCE-GROUNDED SDS EVALUATION",
    h1a: "Does the model ", h1b: "stay on source?",
    intro: "A claim-level faithfulness benchmark: every LLM answer to an SDS question is split into claims, and each claim is checked against a named source record. Browse results, test the grounding effect question-by-question, or adjudicate the human-label sheet yourself.",
    results: "Results", explore: "Explore", label: "Label",
    sheetFaith: "Claim faithfulness", sheetGold: "Entity gold set",
    savedLocal: "saved in your browser · nothing uploaded", exportCsv: "Export labeled CSV",
    promptFaith: "Is this claim supported by the named source?",
    promptGold: "Are these the same chemical entity?",
    item: "Item", of: "/", safetyCritical: "safety-critical", unlabeled: "unlabeled",
    emptyClaim: "(empty claim)", noEnName: "(no English name)",
    aiSuggest: "AI first pass", confidence: "confidence", needsReview: "needs review", highConf: "high confidence",
    notes: "Notes (optional) — rationale, source quote…",
    prev: "← Prev", next: "Next →", nextUnlabeled: "Next unlabeled ⏎", autoAdvance: "auto-advance",
    progress: "Progress", keyboard: "Keyboard", kbLabel: "label", kbMove: "move", kbNext: "next unlabeled",
    opt: { supported: "supported", unsupported: "unsupported", contradicted: "contradicted", not_enough_information: "not enough info", same_entity: "same entity", related_but_not_same: "related, not same", not_same: "not same", insufficient_evidence: "insufficient evidence" },
    loading: "Loading…",
  },
  ko: {
    eyebrow: "CHEMSAFETY-HALBENCH · 출처근거 SDS 평가",
    h1a: "모델이 ", h1b: "출처에 충실한가?",
    intro: "claim 단위 faithfulness 벤치마크: SDS 질문에 대한 LLM 답변을 claim으로 분해하고, 각 claim을 명명된 출처 record에 대조합니다. 결과를 둘러보거나, 문항별로 grounding 효과를 시험하거나, 사람 라벨 시트를 직접 판정하세요.",
    results: "결과", explore: "탐색", label: "라벨",
    sheetFaith: "Claim 충실도", sheetGold: "물질쌍 gold set",
    savedLocal: "브라우저에 저장 · 업로드 없음", exportCsv: "라벨 CSV 내보내기",
    promptFaith: "이 claim이 명명된 출처에 의해 뒷받침되는가?",
    promptGold: "이 둘은 같은 화학물질인가?",
    item: "항목", of: "/", safetyCritical: "안전핵심", unlabeled: "미라벨",
    emptyClaim: "(빈 claim)", noEnName: "(영문명 없음)",
    aiSuggest: "AI 1차 제안", confidence: "신뢰도", needsReview: "확인 필요", highConf: "확신 높음",
    notes: "메모(선택) — 근거·출처 인용…",
    prev: "← 이전", next: "다음 →", nextUnlabeled: "다음 미라벨 ⏎", autoAdvance: "자동 넘김",
    progress: "진행", keyboard: "단축키", kbLabel: "라벨", kbMove: "이동", kbNext: "다음 미라벨",
    opt: { supported: "뒷받침됨", unsupported: "근거없음", contradicted: "모순", not_enough_information: "근거부족", same_entity: "동일물질", related_but_not_same: "유사·비동일", not_same: "다름", insufficient_evidence: "근거부족" },
    loading: "불러오는 중…",
  },
};

function Benchmark() {
  const [tab, setTab] = useState(() => localStorage.getItem("chsb-bench-tab") || "results");
  const [lang, setLang] = useState(() => localStorage.getItem("chsb-lang") || "ko");
  useEffect(() => { localStorage.setItem("chsb-bench-tab", tab); }, [tab]);
  useEffect(() => { localStorage.setItem("chsb-lang", lang); }, [lang]);
  const t = BENCH_T[lang] || BENCH_T.en;
  return (
    <div className="paper-wrap">
      <header className="paper-hero" style={{ paddingBottom: 8, borderBottom: "none", position: "relative" }}>
        <div className="eyebrow"><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--safe)", display: "inline-block" }} /> {t.eyebrow}</div>
        <div className="lang-switch" style={{ position: "absolute", top: 0, right: 0, display: "flex", gap: 4 }}>
          <button className="btn sm ghost" aria-pressed={lang === "ko"} onClick={() => setLang("ko")} style={{ fontWeight: lang === "ko" ? 700 : 400 }}>한</button>
          <button className="btn sm ghost" aria-pressed={lang === "en"} onClick={() => setLang("en")} style={{ fontWeight: lang === "en" ? 700 : 400 }}>EN</button>
        </div>
        <h1>{t.h1a}<em>{t.h1b}</em></h1>
        <p>{t.intro}</p>
      </header>

      <div className="bench-tabs" role="tablist">
        <button role="tab" aria-pressed={tab === "results"} onClick={() => setTab("results")}><Icon name="layers" size={13} /> {t.results}</button>
        <button role="tab" aria-pressed={tab === "explore"} onClick={() => setTab("explore")}><Icon name="search" size={13} /> {t.explore}</button>
        <button role="tab" aria-pressed={tab === "label"} onClick={() => setTab("label")}><Icon name="check" size={13} /> {t.label}</button>
      </div>

      {tab === "results" && <ResultsTab />}
      {tab === "explore" && <ExploreTab />}
      {tab === "label" && <LabelTab lang={lang} />}
    </div>
  );
}

/* ── Results ─────────────────────────────────────── */
const METRIC_META = {
  claim_support_precision: { label: "Claim-support precision", good: "high", color: "var(--safe)" },
  safety_critical_error_rate: { label: "Safety-critical error rate", good: "low", color: "var(--hazard)" },
  unsupported_claim_rate: { label: "Unsupported-claim rate", good: "low", color: "var(--warn)" },
  abstention_accuracy: { label: "Abstention accuracy", good: "high", color: "var(--accent)" },
};

function ResultsTab() {
  const { data, loading } = useJson("data/multimodel_comparison.json");
  const [metric, setMetric] = useState("claim_support_precision");
  if (loading) return <Loading />;
  if (!data) return <ErrBox msg="Could not load results." />;
  const mm = METRIC_META[metric];
  const models = data.models;
  const rows = data.settings.map(s => ({ setting: s, cells: models.map(m => data.matrix[metric][s][m.key]) }));
  const max = metric.includes("precision") || metric.includes("accuracy") ? 1 : 0.45;

  return (
    <>
      <div className="metric-switch">
        {Object.keys(METRIC_META).map(k => (
          <button key={k} aria-pressed={metric === k} onClick={() => setMetric(k)}>{METRIC_META[k].label}</button>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 12, maxWidth: "70ch", lineHeight: 1.6 }}>
        {mm.good === "high" ? "Higher is better." : "Lower is better."} {models.length} models × 5 retrieval settings.
        Automated, source-grounded diagnostics — not a human-audited ranking.
      </div>
      <div className="mtable-scroll">
        <table className="mtable">
          <thead>
            <tr><th>Setting</th>{models.map(m => <th key={m.key}>{m.key}{m.tier === "hosted" ? " ◇" : ""}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.setting}>
                <th>{r.setting}</th>
                {r.cells.map((v, i) => (
                  <td key={i}>
                    {v == null ? <span style={{ color: "var(--fg-subtle)" }}>—</span> : (
                      <div className="mcell">
                        <div className="mc-bar" style={{ width: Math.max(4, (v / max) * 72), background: mm.color, opacity: .35 + .65 * (mm.good === "high" ? v / max : 1 - v / max) }} />
                        <span className="mc-val">{v.toFixed(3)}</span>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 10, fontFamily: "var(--font-mono)" }}>◇ hosted model · local models run on a single GPU</div>
    </>
  );
}

/* ── Explore ─────────────────────────────────────── */
const SETTING_SHORT = {
  "Closed-book LLM": "Closed-book", "PubChem-only RAG": "PubChem RAG",
  "KOSHA-only RAG": "KOSHA RAG", "ChemIP hybrid RAG": "ChemIP hybrid",
  "ChemIP hybrid RAG + abstention": "Hybrid + abstention",
};
function ExploreTab() {
  const { data, loading } = useJson("data/benchmark_explore.json");
  const [pick, setPick] = useState(0);
  if (loading) return <Loading />;
  if (!data || !data.samples.length) return <ErrBox msg="No explore samples staged." />;
  const s = data.samples[Math.min(pick, data.samples.length - 1)];
  return (
    <>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 12, maxWidth: "70ch", lineHeight: 1.6 }}>
        One question, the <b>{data.model === "full" ? "gemma3:4b" : data.model}</b> model, five settings. Watch unsupported and
        safety-critical claims fall as source grounding turns on.
      </div>
      <div className="qpick">
        {data.samples.map((q, i) => (
          <button key={q.sample_id} aria-pressed={i === pick} onClick={() => setPick(i)}>{q.sample_id}</button>
        ))}
      </div>
      <div className="qcard">
        <div className="q-type">{s.question_type}</div>
        <h3 className="q-text">{s.question}</h3>
        <div className="settings-list">
          {Object.keys(SETTING_SHORT).filter(k => s.settings[k]).map(k => {
            const row = s.settings[k];
            const c = row.claims || {};
            return (
              <div className={"setting-row" + (row.abstained ? " abst" : "")} key={k}>
                <div className="sr-head">
                  <span className="sr-name">{SETTING_SHORT[k]}</span>
                  {row.abstained && <Chip tone="default">abstained</Chip>}
                  <span className="sr-tallies">
                    {c.supported > 0 && <span className="pilltally ok">{c.supported} supported</span>}
                    {(c.unsupported + c.contradicted) > 0 && <span className="pilltally bad">{c.unsupported + c.contradicted} unsupported</span>}
                    {c.safety_critical > 0 && <span className="pilltally crit">{c.safety_critical} safety-critical</span>}
                  </span>
                </div>
                <div className="sr-answer">{row.answer || (row.abstained ? "— declined to answer (no local source evidence) —" : "—")}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ── Label ───────────────────────────────────────── */
const LABEL_SCHEMES = {
  faithfulness: {
    labelCol: "human_label", notesCol: "human_notes", mode: "Claim faithfulness",
    prompt: "Is this claim supported by the named source?",
    meta: ["model", "setting", "claim_type", "auto_support_status", "matched_source", "sample_id"],
    crit: r => String(r.safety_critical).toLowerCase() === "true",
    strat: r => r.adjudication_bucket,
    options: [["supported", "ok"], ["unsupported", "warn"], ["contradicted", "bad"], ["not_enough_information", "info"]],
  },
  goldset: {
    labelCol: "adjudicated_label", notesCol: "adjudicator_notes", mode: "Entity-pair gold set",
    prompt: "Are these the same chemical entity?",
    meta: ["stratum", "shared_alias_norm", "norm_cas_agreement", "provisional_label_AUTO"],
    crit: () => false, strat: r => r.stratum,
    options: [["same_entity", "ok"], ["related_but_not_same", "warn"], ["not_same", "bad"], ["insufficient_evidence", "info"]],
  },
};
const SHEETS = {
  adjudication: { url: "data/adjudication_sample.csv", name: "adjudication_sample.csv" },
  goldset: { url: "data/goldset_sample.csv", name: "goldset_sample.csv" },
};

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = []; let row = [], field = "", i = 0, q = false; const n = text.length;
  while (i < n) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; } field += c; i++; continue; }
    if (c === '"') { q = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function csvCell(v) { v = v == null ? "" : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

function LabelTab({ lang }) {
  const t = BENCH_T[lang] || BENCH_T.en;
  const optLabel = (v) => (t.opt && t.opt[v]) || v;
  const [sheetKey, setSheetKey] = useState("adjudication");
  const [state, setState] = useState({ header: [], records: [], scheme: null, name: "" });
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0); // force re-render on mutation
  const [auto, setAuto] = useState(true);

  const load = (text, name) => {
    const rows = parseCSV(text).filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
    if (rows.length < 2) return;
    const header = rows[0].map(h => h.trim());
    const scheme = header.includes("human_label") ? LABEL_SCHEMES.faithfulness
      : header.includes("adjudicated_label") ? LABEL_SCHEMES.goldset : null;
    if (!scheme) return;
    if (!header.includes(scheme.labelCol)) header.push(scheme.labelCol);
    if (!header.includes(scheme.notesCol)) header.push(scheme.notesCol);
    const records = rows.slice(1).map(cols => { const o = {}; header.forEach((h, k) => o[h] = cols[k] != null ? cols[k] : ""); return o; });
    const storeKey = "chsb-label:" + name + ":" + records.length;
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) JSON.parse(raw).forEach((p, k) => { if (records[k]) { records[k][scheme.labelCol] = p[0]; records[k][scheme.notesCol] = p[1]; } });
    } catch (e) {}
    records._store = storeKey;
    setState({ header, records, scheme, name });
    setIdx(records.findIndex(r => !r[scheme.labelCol]) < 0 ? 0 : records.findIndex(r => !r[scheme.labelCol]));
  };

  const loadSheet = (key) => {
    setSheetKey(key);
    const inline = window.__CHSB && window.__CHSB.csv && window.__CHSB.csv[key];
    if (inline) { load(inline, SHEETS[key].name); return; }
    fetch(SHEETS[key].url).then(r => { if (!r.ok) throw new Error(); return r.text(); }).then(t => load(t, SHEETS[key].name)).catch(() => {});
  };
  useEffect(() => { loadSheet("adjudication"); /* eslint-disable-next-line */ }, []);

  const persist = () => {
    const { records, scheme } = state;
    try { localStorage.setItem(records._store, JSON.stringify(records.map(r => [r[scheme.labelCol] || "", r[scheme.notesCol] || ""]))); } catch (e) {}
  };
  const apply = (v) => {
    const { records, scheme } = state; const r = records[idx];
    r[scheme.labelCol] = r[scheme.labelCol] === v ? "" : v;
    persist(); setTick(t => t + 1);
    if (r[scheme.labelCol] && auto) setTimeout(() => setIdx(i => Math.min(records.length - 1, i + 1)), 130);
  };
  const setNotes = (v) => { const { records, scheme } = state; records[idx][scheme.notesCol] = v; persist(); setTick(t => t + 1); };
  const nextUnlabeled = () => {
    const { records, scheme } = state;
    for (let k = 1; k <= records.length; k++) { const j = (idx + k) % records.length; if (!records[j][scheme.labelCol]) { setIdx(j); return; } }
  };
  const exportCsv = () => {
    const { header, records, name } = state;
    const csv = "﻿" + [header.map(csvCell).join(",")].concat(records.map(r => header.map(h => csvCell(r[h])).join(","))).join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = name.replace(/\.csv$/i, "") + ".labeled.csv";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 400);
  };

  useEffect(() => {
    const h = (e) => {
      if (!state.records.length) return;
      if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) { if (e.key === "Escape") e.target.blur(); return; }
      const opts = state.scheme.options;
      if (e.key >= "1" && e.key <= String(opts.length)) { e.preventDefault(); apply(opts[+e.key - 1][0]); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setIdx(i => Math.min(state.records.length - 1, i + 1)); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); nextUnlabeled(); }
      else if (e.key === "Backspace") { e.preventDefault(); apply(state.records[idx][state.scheme.labelCol]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const { records, scheme, header } = state;
  if (!scheme || !records.length) return <div className="muted" style={{ padding: "40px 0", fontFamily: "var(--font-mono)", fontSize: 13 }}>{t.loading}</div>;
  const r = records[idx];
  const done = records.filter(x => x[scheme.labelCol]).length;
  const pct = Math.round(done / records.length * 100);
  const counts = {}; scheme.options.forEach(([v]) => counts[v] = 0);
  records.forEach(x => { if (counts[x[scheme.labelCol]] != null) counts[x[scheme.labelCol]]++; });
  const cvar = { ok: "--safe", warn: "--warn", bad: "--hazard", info: "--info" };

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div className="metric-switch" style={{ margin: 0 }}>
          <button aria-pressed={sheetKey === "adjudication"} onClick={() => loadSheet("adjudication")}>{t.sheetFaith}</button>
          <button aria-pressed={sheetKey === "goldset"} onClick={() => loadSheet("goldset")}>{t.sheetGold}</button>
        </div>
        <span className="muted" style={{ fontSize: 11.5, fontFamily: "var(--font-mono)" }}>{t.savedLocal}</span>
        <button className="btn sm" style={{ marginLeft: "auto" }} onClick={exportCsv}><Icon name="down" size={12} /> {t.exportCsv}</button>
      </div>

      <div className="lc">
        <div className="lc-main">
          <div className="lc-head">
            <span className="lc-idx">{t.item} <b>{idx + 1}</b> {t.of} {records.length}</span>
            <span className="lc-badge">{scheme.strat(r)}</span>
            {scheme.crit(r) && <span className="lc-badge crit">{t.safetyCritical}</span>}
            <span style={{ flex: 1 }} />
            <span className={"lc-badge" + (r[scheme.labelCol] ? " done" : "")}>{r[scheme.labelCol] ? optLabel(r[scheme.labelCol]) : t.unlabeled}</span>
          </div>
          <div className="lc-body">
            <div className="q-type" style={{ marginBottom: 10 }}>{scheme.mode === "Claim faithfulness" ? t.promptFaith : t.promptGold}</div>
            {scheme.mode === "Claim faithfulness"
              ? <div className="lc-claim">{r.claim || t.emptyClaim}</div>
              : <div className="lc-pair">
                  <div className="lc-rec"><div className="cas">{r.a_cas_norm || r.a_cas_raw || "—"}</div>{r.a_name_ko ? <div className="name" style={{ fontWeight: 600, color: "var(--fg)" }}>{r.a_name_ko}</div> : null}<div className="name">{r.a_name_en || t.noEnName}</div><div className="src">{r.a_source}</div></div>
                  <div className="lc-vs">vs</div>
                  <div className="lc-rec"><div className="cas">{r.b_cas_norm || r.b_cas_raw || "—"}</div>{r.b_name_ko ? <div className="name" style={{ fontWeight: 600, color: "var(--fg)" }}>{r.b_name_ko}</div> : null}<div className="name">{r.b_name_en || t.noEnName}</div><div className="src">{r.b_source}</div></div>
                </div>}

            {r.llm_label && (
              <div style={{ marginTop: 14, border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: "var(--r-3)", background: "var(--bg-sunken)", padding: "11px 14px", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <b style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".06em", color: "var(--accent-ink)" }}>{t.aiSuggest}</b>
                  <span style={{ fontWeight: 650 }}>{optLabel(r.llm_label)}</span>
                  {r.llm_confidence && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>{t.confidence} {r.llm_confidence}</span>}
                  <span className={"lc-badge" + (String(r.needs_review).toLowerCase() === "yes" ? " crit" : " done")}>{String(r.needs_review).toLowerCase() === "yes" ? t.needsReview : t.highConf}</span>
                </div>
                {r.llm_reason_ko && <div style={{ marginTop: 6, color: "var(--fg-muted)", lineHeight: 1.55 }}>{r.llm_reason_ko}</div>}
              </div>
            )}
            <dl className="lc-meta">
              {scheme.meta.filter(k => r[k]).map(k => (
                <div className="lc-kv" key={k}><dt>{k.replace(/_/g, " ")}</dt><dd>{r[k]}</dd></div>
              ))}
            </dl>

            <div className="lc-labels">
              {scheme.options.map(([v, c], i) => (
                <button key={v} className={"lab-btn " + c + (r[scheme.labelCol] === v ? " sel" : "")} onClick={() => apply(v)}>
                  <span className="k">{i + 1}</span><span className="dot" /><span style={{ flex: 1 }}>{optLabel(v)}</span>
                </button>
              ))}
            </div>
            <textarea className="lc-notes" placeholder={t.notes} value={r[scheme.notesCol] || ""} onChange={e => setNotes(e.target.value)} />
            <div className="lc-nav">
              <button className="btn sm" disabled={idx === 0} onClick={() => setIdx(i => Math.max(0, i - 1))}>{t.prev}</button>
              <button className="btn sm" disabled={idx === records.length - 1} onClick={() => setIdx(i => Math.min(records.length - 1, i + 1))}>{t.next}</button>
              <button className="btn sm ghost" onClick={nextUnlabeled}>{t.nextUnlabeled}</button>
              <label style={{ marginLeft: "auto", fontSize: 12, color: "var(--fg-muted)", display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> {t.autoAdvance}
              </label>
            </div>
          </div>
        </div>

        <aside className="lc-side">
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
              <span className="muted">{t.progress}</span><b className="tnum">{done}/{records.length} · {pct}%</b>
            </div>
            <div className="lc-pbar"><div className="lc-pfill" style={{ width: pct + "%" }} /></div>
            <div style={{ marginTop: 14 }}>
              {scheme.options.map(([v, c]) => (
                <div className="lc-stat" key={v}><span className="sw" style={{ background: "var(" + cvar[c] + ")" }} /><span className="nm">{optLabel(v)}</span><span className="ct">{counts[v]}</span></div>
              ))}
              <div className="lc-stat"><span className="sw" style={{ background: "var(--border-strong)" }} /><span className="nm">{t.unlabeled}</span><span className="ct">{records.length - done}</span></div>
            </div>
          </div>
          <div className="panel" style={{ padding: 16, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--fg)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>{t.keyboard}</b>
            <div style={{ marginTop: 8 }}><kbd>1</kbd>–<kbd>{scheme.options.length}</kbd> {t.kbLabel} · <kbd>←</kbd><kbd>→</kbd> {t.kbMove} · <kbd>⏎</kbd> {t.kbNext}</div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* helpers */
function Loading() { return <div className="muted" style={{ padding: "40px 0", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading…</div>; }
function ErrBox({ msg }) { return <div className="muted" style={{ padding: "30px 0", color: "var(--hazard)", fontFamily: "var(--font-mono)", fontSize: 13 }}>{msg}</div>; }

Object.assign(window, { Benchmark });
