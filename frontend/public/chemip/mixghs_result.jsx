// 혼합물 GHS 분류 · 결과: 표지 요소(그림문자 assets/ghs/GHS0N.svg · 신호어 · H 문구)와 분류 목록, 알림.
// 표지 요소는 mgLabel(mixghs_core.jsx) 결과만 그린다. H 문구·그림문자 이름: SAFETY_RULES.ghs.h_text·pictograms, 문구: SAFETY_LABELS.mix.

function MixPictogram({ code }) {
  const [broken, setBroken] = useState(false);
  const p = SAFETY_RULES.ghs.pictograms[code] || { ko: code, en: code };
  const name = tr(p.ko, p.en);
  return (
    <figure className="sft-picto" title={`${code} · ${name}`}>
      {broken ? <span className="sft-picto-text mono">{code}</span>
        : <img src={`assets/ghs/${code}.svg`} alt={`${code} ${name}`} width="64" height="64" onError={() => setBroken(true)} />}
      <figcaption>{name}</figcaption>
    </figure>
  );
}

function MixClassName({ k }) {
  const L = SAFETY_LABELS.mix;
  const def = SAFETY_RULES.ghs.hazards[k.key];
  const cat = k.key === "stot_se" && L.stotSub[k.cat] ? L.stotSub[k.cat] : tr(`구분 ${k.cat}`, `Category ${k.cat}`);
  return <>{def ? tr(def.ko, def.en) : k.key} — {cat}</>;
}

function MixNotes({ notes }) {
  const N = SAFETY_LABELS.mix.notes;
  const text = n => (n.k === "over100" ? N.over100(calcFormatNumber(n.total, 4)) : n.k === "unknownAcute" ? N.unknownAcute(calcFormatNumber(n.pct, 4))
    : n.k === "euh208" ? N.euh208(n.name) : N[n.k]);
  return notes.map((n, i) => <div key={i} className={`calc-alert ${n.k === "over100" ? "is-hazard" : "is-warn"}`}>{text(n)}</div>);
}

function MixResult({ result, label }) {
  const L = SAFETY_LABELS.mix;
  const H = SAFETY_RULES.ghs.h_text;
  if (!result) return <div className="panel calc-panel"><h3><b>{L.resultTitle}</b></h3><div className="body"><div className="calc-wait">{L.resultEmpty}</div></div></div>;
  return (
    <div className="panel calc-panel calc-results" aria-live="polite">
      <h3><b>{L.resultTitle}</b></h3>
      <div className="body">
        {result.classes.length === 0 && <div className="calc-wait">{L.notClassified}</div>}
        {result.classes.length > 0 && (
          <>
            <div className="calc-sub">{L.labelTitle}</div>
            <div className="sft-label">
              {label.pictograms.length > 0 && <div className="sft-pictos" aria-label={L.pictograms}>{label.pictograms.map(p => <MixPictogram key={p} code={p} />)}</div>}
              <div className={`sft-signal is-${label.signal || "none"}`}>{L.signal[label.signal || "none"]}</div>
              <ul className="sft-hlist" aria-label={L.hStatements}>
                {label.h.map(h => <li key={h}><b className="mono">{h}</b> {H[h] ? tr(H[h].ko, H[h].en) : ""}</li>)}
              </ul>
            </div>
            <div className="calc-sub">{L.classesTitle}</div>
            <ul className="calc-list">{result.classes.map(k => <li key={`${k.key}-${k.cat}`}><MixClassName k={k} /></li>)}</ul>
          </>
        )}
        <MixNotes notes={result.notes} />
      </div>
    </div>
  );
}

Object.assign(window, { MixPictogram, MixClassName, MixNotes, MixResult });
