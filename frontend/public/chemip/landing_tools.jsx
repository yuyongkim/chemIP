// 처음 화면 · 도구 묶음 — 계산기·GHS 표지·저장 혼촉·혼합물 GHS 분류·용어사전. 목록은 LANDING_TOOLS(landing_discover_data.jsx), 등록된 화면만 보인다
// (landingAvailableTools). 문구: LANDING_DISCOVER.tools.items[k]. 새 도구 = 목록 한 줄 + 문구 한 줄.

function LandingTools({ views }) {
  const T = LANDING_DISCOVER.tools;
  const tools = landingAvailableTools(LANDING_TOOLS, views, typeof window !== "undefined" ? window : null);
  if (!tools.length) return null;
  return (
    <section className="section ld-disc-sec">
      <div className="ld-inner">
        <div className="ld-eyebrow">{T.eyebrow}</div>
        <ul className="ld-tools">
          {tools.map(t => {
            const it = T.items[t.k] || {};
            return (
              <li key={t.k}>
                <a className="ld-tool" href={landingViewHref(t.view)}>
                  <Icon name={t.icon} size={18} />
                  <span className="ld-tool-title">
                    {it.title || t.k}
                    {t.count != null && <span className="ld-tool-count">{T.count(t.count)}</span>}
                  </span>
                  {it.desc && <span className="ld-tool-desc">{it.desc}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

Object.assign(window, { LandingTools });
