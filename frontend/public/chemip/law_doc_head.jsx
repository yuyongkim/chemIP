// 국내 법령 보기 · 법령 머리 — 이름(원문), 종류·소관 부처, 공포·시행일, 받은 날, 법제처 원문 링크(현행·이 판). 문구: LAW_LABELS.

function LawDocHead({ meta }) {
  const L = LAW_LABELS;
  const M = L.meta;
  return (
    <div className="card law-head">
      <h2 className="law-title" data-source-text="">{meta.name}</h2>
      <div className="muted law-meta">
        <span data-source-text="">{[meta.law_type, meta.ministry].filter(Boolean).join(" · ")}</span>
        {meta.promulgated_on && <span>{M.promulgated(meta.promulgated_on, meta.promulgation_no)}</span>}
        {meta.effective_on && <span>{M.effective(meta.effective_on)}</span>}
        {meta.as_of && <span>{M.asOf(meta.as_of)}</span>}
      </div>
      <div className="law-head-links">
        {meta.url && <a className="btn sm" href={meta.url} target="_blank" rel="noopener">{L.goKr}</a>}
        {meta.url_version && <a className="btn sm ghost" href={meta.url_version} target="_blank" rel="noopener">{L.goKrVersion}</a>}
      </div>
    </div>
  );
}

Object.assign(window, { LawDocHead });
