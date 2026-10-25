// 처음 화면 · "무엇을 알려 주나요" 8칸. 항목 추가는 LANDING_LABELS.outputs.items 에 한 건.

function LandingOutputs() {
  const O = LANDING_LABELS.outputs;
  const { data: catalog } = useTradeCatalog();
  return (
    <section className="section">
      <div className="ld-inner">
        <div className="ld-eyebrow">{O.eyebrow}</div>
        <h2 className="ld-h2">{O.title}</h2>
        <div className="ld-outputs">
          {O.items.map(it => (
            <div key={it.title} className="ld-output">
              <Icon name={it.icon} size={18} />
              <h3>{landingFill(it.title, catalog) || it.titleFallback}</h3>
              <p>{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LandingOutputs });
