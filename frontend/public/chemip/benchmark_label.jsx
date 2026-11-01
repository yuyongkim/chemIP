// 벤치마크 "Label" 탭 — 라벨 시트 상태(시트 고르기·라벨 달기·메모·이동·단축키·브라우저 저장·CSV 내보내기).
// 그리기: benchmark_label_card.jsx · benchmark_label_side.jsx. 순수 함수: benchmark_csv.jsx. 문구: BENCH_T.

function LabelTab() {
  const t = BENCH_T;
  const optLabel = (v) => (t.opt && t.opt[v]) || v;
  const [sheetKey, setSheetKey] = useState("adjudication");
  const [state, setState] = useState({ header: [], records: [], scheme: null, name: "" });
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0); // force re-render on mutation
  const [auto, setAuto] = useState(true);

  const load = (text, name) => {
    const sheet = labelSheetFromCsv(text);
    if (!sheet) return;
    const { header, records, scheme } = sheet;
    const storeKey = "chsb-label:" + name + ":" + records.length;
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) applySavedLabels(records, scheme, JSON.parse(raw));
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
    const csv = labelSheetToCsv(header, records);
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

  const { records, scheme } = state;
  if (!scheme || !records.length) return <Loading text={t.loading} />;
  const r = records[idx];

  return (
    <>
      <div className="bm-label-bar">
        <div className="metric-switch bm-flat">
          <button aria-pressed={sheetKey === "adjudication"} onClick={() => loadSheet("adjudication")}>{t.sheetFaith}</button>
          <button aria-pressed={sheetKey === "goldset"} onClick={() => loadSheet("goldset")}>{t.sheetGold}</button>
        </div>
        <span className="muted bm-mono-note">{t.savedLocal}</span>
        <button className="btn sm bm-push" onClick={exportCsv}><Icon name="down" size={12} /> {t.exportCsv}</button>
      </div>

      <div className="lc">
        <LabelItemCard r={r} idx={idx} total={records.length} scheme={scheme} t={t} optLabel={optLabel} auto={auto} setAuto={setAuto}
          onApply={apply} onNotes={setNotes} onPrev={() => setIdx(i => Math.max(0, i - 1))}
          onNext={() => setIdx(i => Math.min(records.length - 1, i + 1))} onNextUnlabeled={nextUnlabeled} />
        <LabelSidebar t={t} scheme={scheme} total={records.length} progress={labelProgress(records, scheme)} optLabel={optLabel} />
      </div>
    </>
  );
}

Object.assign(window, { LabelTab });
