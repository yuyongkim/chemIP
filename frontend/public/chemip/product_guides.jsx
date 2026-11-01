// 상세 탭 "안전 가이드" — 이 물질에 맞는 KOSHA 가이드 추천(일치도 구간 표시), 옆에 가이드 자료 상태.
// 문구: PRODUCT_LABELS.guides. 순수 함수: guideTier(product_tab_helpers.jsx). 스타일: product_detail.css.

function GuideRow({ g, i }) {
  const G = PRODUCT_LABELS.guides;
  const code = g.guide_no || g.code || `G-${i + 1}`;
  const krTitle = g.title_kr || g.title || g.guide_title || "";
  // 영어 화면은 영문 제목이 있으면 그것을 위에, 한국어 제목(공단 원문)을 아래에
  const [title, subtitle] = tr([krTitle || "—", g.title_en || g.summary || ""], g.title_en ? [g.title_en, krTitle] : [krTitle || "—", g.summary || ""]);
  const score = g.score ?? g.similarity ?? g.confidence;
  const tier = guideTier(score);
  return (
    <div className="guide-row">
      <span className="code">{code}</span>
      <div>
        <b className="pd-guide-title">{title}</b>
        {subtitle && <div className="muted pd-note">{subtitle}</div>}
        {tier === "generic" && <div className="pd-guide-warn">{G.lowConfidence}</div>}
      </div>
      <div className="pd-guide-side">
        {tier && <span className={`chip pd-tier ${tier}`}>{G.tiers[tier]}</span>}
        {typeof score === "number" && <span className="score mono">{G.match(score.toFixed(0))}</span>}
      </div>
    </div>
  );
}

function GuidesTab({ selected }) {
  const G = PRODUCT_LABELS.guides;
  const ST = PRODUCT_LABELS.status;
  const reco = useGuideRecommendations(selected?.chem_id, selected?.name_en || selected?.name);
  const status = useGuideStatus();
  const items = reco.data?.items || reco.data?.recommendations || (Array.isArray(reco.data) ? reco.data : []);
  return (
    <div className="layout-2col">
      <div className="panel">
        <PanelTitle t={G.heading}>
          <span className="muted">
            {reco.loading ? ST.loading : reco.error ? ST.error(reco.error) : G.matches(items.length)}
          </span>
        </PanelTitle>
        <div>
          {items.length === 0 && !reco.loading && !reco.error && (
            <div className="guide-row pd-guide-empty">{G.none}</div>
          )}
          {items.map((g, i) => <GuideRow key={`${g.guide_no || g.code || `G-${i + 1}`}-${i}`} g={g} i={i} />)}
        </div>
      </div>
      <aside>
        <div className="panel">
          <PanelTitle t={G.status} />
          <div className="body">
            {status.loading && <div className="muted pd-note">{ST.loading}</div>}
            {status.error && <div className={apiIsNotice(status.error) ? "muted pd-note" : "pd-error-note"}>{status.error}</div>}
            {status.data && Object.entries(status.data).slice(0, 8).map(([k, v]) => (
              <div key={k} className="row">
                <div className="k">{k}</div>
                <div className="v mono pd-v-sm">{typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

Object.assign(window, { GuidesTab });
