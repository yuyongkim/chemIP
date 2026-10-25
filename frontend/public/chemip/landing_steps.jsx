// 처음 화면 · 사용 방법 세 단계. 문구: LANDING_LABELS.steps

function LandingSteps() {
  const S = LANDING_LABELS.steps;
  return (
    <section className="section" id="ld-steps">
      <div className="ld-inner">
        <div className="ld-eyebrow">{S.eyebrow}</div>
        <h2 className="ld-h2">{S.title}</h2>
        <ol className="ld-steps">
          {S.items.map((it, i) => (
            <li key={it.title}>
              <span className="ld-step-n">{i + 1}</span>
              <div><h3>{it.title}</h3><p>{it.desc}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

Object.assign(window, { LandingSteps });
