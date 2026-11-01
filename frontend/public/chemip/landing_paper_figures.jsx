// 처음 화면 · 연구 논문 절의 논문 그림 묶음(그림 1·2). 누르면 원본 크기로 연다. 문구: LANDING_PAPER_LABELS.figures

function LandingPaperFigures() {
  const P = LANDING_PAPER_LABELS;
  return (
    <div className="ld-figs">
      {P.figures.map(f => (
        <figure key={f.src} className="ld-fig">
          <a href={f.src} target="_blank" rel="noopener noreferrer" className="ld-fig-frame">
            <img src={f.src} width={f.w} height={f.h} alt={`${f.title} — ${f.desc}`} loading="lazy" decoding="async" />
          </a>
          <figcaption><b>{f.title}</b><span>{f.desc}</span></figcaption>
        </figure>
      ))}
      <p className="ld-figs-source">{P.figureSource}</p>
    </div>
  );
}

Object.assign(window, { LandingPaperFigures });
