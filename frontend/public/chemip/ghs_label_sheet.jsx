// 경고표지 한 장 — ghsBuildLabel 결과를 그대로 그린다(미리 보기와 인쇄가 같은 컴포넌트).
// 배치: 명칭 → 그림문자·신호어 → 유해·위험문구 → 예방조치문구(예방·대응·저장·폐기) → 공급자 정보.
// 크기·글자·@page 는 checklist_print.css(.gl-sheet[data-size]). 빈 공급자 칸은 손으로 쓸 밑줄.

function GhsLabelSheet({ label }) {
  const T = label.text;
  const s = label.supplier;
  const blank = (v) => v || <span className="gl-blank" aria-hidden="true" />;
  return (
    <div className="gl-sheet" data-size={label.size.k} lang={label.lang}>
      <div className="gl-name">
        <span className="gl-k">{T.product}</span>
        <b>{label.product || <span className="gl-blank" aria-hidden="true" />}</b>
        {label.cas && <span className="gl-cas mono">CAS {label.cas}</span>}
      </div>
      <div className="gl-body">
        <div className="gl-left">
          <GhsPictogramRow codes={label.pictograms.map(p => p.code)} lang={label.lang} className="gl-picts" />
          {label.signal && (
            <div className={`gl-signal is-${label.signal.k}`}>
              <span className="gl-k">{T.signal}</span>
              <b>{label.signal.text}</b>
            </div>
          )}
        </div>
        <div className="gl-right">
          {label.hazards.length > 0 && (
            <section className="gl-block">
              <h4>{T.hazards}</h4>
              <ul>{label.hazards.map((st, i) => <GhsLabelSheetLine key={i} st={st} mark={T.unofficialMark} />)}</ul>
            </section>
          )}
          {label.precautions.length > 0 && (
            <section className="gl-block">
              <h4>{T.precautions}</h4>
              {label.precautions.map(g => (
                <div key={g.group} className="gl-pgroup">
                  <span className="gl-pgroup-k">{g.title}</span>
                  <ul>{g.items.map((st, i) => <GhsLabelSheetLine key={i} st={st} mark={T.unofficialMark} />)}</ul>
                </div>
              ))}
              {label.seeSds && <p className="gl-see-sds">{T.seeSds}</p>}
            </section>
          )}
        </div>
      </div>
      <div className="gl-supplier">
        <span><span className="gl-k">{T.supplier}</span> {blank(s.name)}</span>
        <span><span className="gl-k">{T.address}</span> {blank(s.address)}</span>
        <span><span className="gl-k">{T.phone}</span> {blank(s.phone)}</span>
        <span><span className="gl-k">{T.emergency}</span> {blank(label.emergency)}</span>
      </div>
    </div>
  );
}

Object.assign(window, { GhsLabelSheet });
