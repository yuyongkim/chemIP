// 벤치마크 "Label" 탭의 항목 카드 — claim(또는 물질 쌍), AI 1차 제안, 메타, 라벨 버튼, 메모, 이동.
// 상태는 benchmark_label.jsx 가 갖고, 여기는 받은 값과 콜백으로 그리기만 한다. 문구: BENCH_T.

function LabelPairRecord({ cas, nameKo, nameEn, source, t }) {
  return (
    <div className="lc-rec">
      <div className="cas">{cas || "—"}</div>
      {nameKo ? <div className="name bm-name-ko">{nameKo}</div> : null}
      <div className="name">{nameEn || t.noEnName}</div>
      <div className="src">{source}</div>
    </div>
  );
}

function LabelAiSuggestion({ r, t, optLabel }) {
  if (!r.llm_label) return null;
  const review = String(r.needs_review).toLowerCase() === "yes";
  return (
    <div className="bm-ai-box">
      <div className="bm-ai-row">
        <b className="bm-ai-kicker">{t.aiSuggest}</b>
        <span className="bm-ai-label">{optLabel(r.llm_label)}</span>
        {r.llm_confidence && <span className="bm-ai-conf">{t.confidence} {r.llm_confidence}</span>}
        <span className={"lc-badge" + (review ? " crit" : " done")}>{review ? t.needsReview : t.highConf}</span>
      </div>
      {r.llm_reason_ko && <div className="bm-ai-reason">{r.llm_reason_ko}</div>}
    </div>
  );
}

function LabelItemCard({ r, idx, total, scheme, t, optLabel, auto, setAuto, onApply, onNotes, onPrev, onNext, onNextUnlabeled }) {
  return (
    <div className="lc-main">
      <div className="lc-head">
        <span className="lc-idx">{t.item} <b>{idx + 1}</b> {t.of} {total}</span>
        <span className="lc-badge">{scheme.strat(r)}</span>
        {scheme.crit(r) && <span className="lc-badge crit">{t.safetyCritical}</span>}
        <span className="bm-spacer" />
        <span className={"lc-badge" + (r[scheme.labelCol] ? " done" : "")}>{r[scheme.labelCol] ? optLabel(r[scheme.labelCol]) : t.unlabeled}</span>
      </div>
      <div className="lc-body">
        <div className="q-type bm-prompt">{scheme.mode === "Claim faithfulness" ? t.promptFaith : t.promptGold}</div>
        {scheme.mode === "Claim faithfulness"
          ? <div className="lc-claim">{r.claim || t.emptyClaim}</div>
          : <div className="lc-pair">
              <LabelPairRecord cas={r.a_cas_norm || r.a_cas_raw} nameKo={r.a_name_ko} nameEn={r.a_name_en} source={r.a_source} t={t} />
              <div className="lc-vs">{BENCH_FIXED.vs}</div>
              <LabelPairRecord cas={r.b_cas_norm || r.b_cas_raw} nameKo={r.b_name_ko} nameEn={r.b_name_en} source={r.b_source} t={t} />
            </div>}

        <LabelAiSuggestion r={r} t={t} optLabel={optLabel} />
        <dl className="lc-meta">
          {scheme.meta.filter(k => r[k]).map(k => (
            <div className="lc-kv" key={k}><dt>{k.replace(/_/g, " ")}</dt><dd>{r[k]}</dd></div>
          ))}
        </dl>

        <div className="lc-labels">
          {scheme.options.map(([v, c], i) => (
            <button key={v} className={"lab-btn " + c + (r[scheme.labelCol] === v ? " sel" : "")} onClick={() => onApply(v)}>
              <span className="k">{i + 1}</span><span className="dot" /><span className="bm-spacer">{optLabel(v)}</span>
            </button>
          ))}
        </div>
        <textarea className="lc-notes" placeholder={t.notes} value={r[scheme.notesCol] || ""} onChange={e => onNotes(e.target.value)} />
        <div className="lc-nav">
          <button className="btn sm" disabled={idx === 0} onClick={onPrev}>{t.prev}</button>
          <button className="btn sm" disabled={idx === total - 1} onClick={onNext}>{t.next}</button>
          <button className="btn sm ghost" onClick={onNextUnlabeled}>{t.nextUnlabeled}</button>
          <label className="bm-auto">
            <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> {t.autoAdvance}
          </label>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LabelItemCard });
