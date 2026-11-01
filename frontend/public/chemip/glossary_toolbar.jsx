// 용어사전 · 머리 — 제목·설명, 찾기 칸, 시험 고르기, 분류 단추(항목 수), 보이는 항목 수. 모양은 통합 검색 머리(.ps-*·.us-*)와 같다.

function GlossaryToolbar({ q, setQ, cat, setCat, exam, setExam, catCounts, shown, total }) {
  const L = GLOSSARY_LABELS;
  return (
    <div className="ps-hero us-hero gl-hero">
      <h1 className="ps-title us-title">{L.title}</h1>
      <div className="muted ps-sub">{L.sub}</div>
      <form className="ps-box gl-box" role="search" onSubmit={e => e.preventDefault()}>
        <Icon name="search" size={18} className="ps-box-icon" />
        <input className="ps-input" type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder={L.searchPlaceholder} aria-label={L.searchAria} />
        <select className="gl-exam" value={exam} onChange={e => setExam(e.target.value)} aria-label={L.field.exams}>
          <option value="">{L.allExams}</option>
          {GLOSSARY_EXAMS.map(x => <option key={x} value={x}>{L.exams[x]}</option>)}
        </select>
      </form>
      <div className="gl-cats" role="group" aria-label={L.allCats}>
        <button type="button" className={`chip gl-cat${cat ? "" : " accent"}`} aria-pressed={!cat} onClick={() => setCat("")}>{L.allCats}</button>
        {GLOSSARY_CAT_ORDER.map(k => (
          <button key={k} type="button" className={`chip gl-cat${cat === k ? " accent" : ""}`} aria-pressed={cat === k}
            onClick={() => setCat(cat === k ? "" : k)}>
            {L.cats[k]} <span className="gl-cat-n">{catCounts[k] || 0}</span>
          </button>
        ))}
      </div>
      <div className="muted us-summary gl-count" aria-live="polite">{L.count(shown, total)}</div>
    </div>
  );
}

Object.assign(window, { GlossaryToolbar });
