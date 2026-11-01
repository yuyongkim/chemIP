// 처음 화면 · 연구 논문 요약(학술지·제목·문제/해법/설계/공개 · 비교 그림 · 링크). 문구: LANDING_PAPER_LABELS
// 비교 그림: landing_paper_compare.jsx
// 논문 그림 1·2(시스템 구조·자료 통합 흐름)는 개발자용 그림이라 처음 화면에서 뺐다(2026-10-30). 부품 landing_paper_figures.jsx 는 남겨 둔다.

function LandingPaper() {
  const P = LANDING_PAPER_LABELS;
  return (
    <section className="section" id="ld-paper">
      <div className="ld-inner">
        <div className="ld-eyebrow">{P.eyebrow}</div>
        <h2 className="ld-h2">{P.title}</h2>
        <div className="ld-paper-head">
          <span className="ld-paper-journal">{P.journal}</span>
          <span className="ld-paper-status">{P.status}</span>
        </div>
        <p className="ld-paper-title" lang="en">{P.paperTitle}</p>
        <div className="ld-paper-points">
          {P.points.map(it => (
            <div key={it.title} className="ld-paper-point">
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
            </div>
          ))}
        </div>
        <LandingPaperCompare />
        <div className="ld-paper-links">
          {P.links.map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LandingPaper });
