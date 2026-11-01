// 상세 탭 "AI 요약" — 탭을 열면 한 번 분석(useAIAnalysis), 근거 목록, 분석 상태, 다시 실행.
// 문구: PRODUCT_LABELS.ai. 스타일: product_detail.css.

function AiSources({ sources }) {
  if (sources.length === 0) return null;
  return (
    <div className="sources">
      {sources.map((s, i) => (
        <div key={i} className="src">
          <span className="n">[{i + 1}]</span>
          <span className="src-kind">{s.kind || s.source || "REF"}</span>
          <span className="pd-ai-src-title">{s.title || s.text || s.snippet || JSON.stringify(s).slice(0, 80)}</span>
          <span className="mono muted pd-meta">{s.date || ""}</span>
        </div>
      ))}
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
            <div className="pd-inline">
              <Icon name="spark" size={16} className="pd-ai-icon" />
              <span className="pd-ai-kicker">{A.kicker}</span>
            </div>
            {typeof confidence === "number" && (
              <div className="conf">{A.confidence} {confidence.toFixed(2)} <div className="bar"><span style={{ width: `${Math.round(confidence * 100)}%` }} /></div></div>
            )}
          </div>
          <h4>{A.title(chemPrimaryName(selected), selected.cas_no)}</h4>
          {ai.loading && <p className="muted">{A.loading}</p>}
          {ai.error && <p className="pd-ai-error">{PRODUCT_LABELS.status.error(ai.error)}</p>}
          {!ai.loading && !ai.error && analysisText && <div className="pd-ai-text">{analysisText}</div>}
          {!ai.loading && !ai.error && !analysisText && <p className="muted">{A.rerunHint}</p>}
          <AiSources sources={sources} />
        </div>

        <div className="panel pd-stack">
          <PanelTitle t={A.backend} />
          <div className="body">
            <div className="row"><div className="k">{A.rows.mode}</div><div className="v mono">{mode || A.modeDefault}</div></div>
            <div className="row"><div className="k">{A.rows.chem}</div><div className="v mono">{selected.chem_id} · {chemPrimaryName(selected)}</div></div>
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
            <div className="muted pd-ai-note">{A.note}</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

Object.assign(window, { AITab });
