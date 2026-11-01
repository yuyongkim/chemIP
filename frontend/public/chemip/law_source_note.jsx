// 법령 말뭉치 출처·라이선스·사본 안내 한 줄 — 국내 법령 보기와 물질 「국내 근거 조문」 패널이 같이 쓴다. 문구: LAW_LABELS.

function LawSourceNote({ asOf, copy = true }) {
  const L = LAW_LABELS;
  return (
    <div className="muted law-source-note">
      {copy && <div>{L.copyNote}</div>}
      <div>{L.license}{asOf ? ` · ${L.meta.asOf(asOf)}` : ""}</div>
      {L.langNote && <div>{L.langNote}</div>}
    </div>
  );
}

Object.assign(window, { LawSourceNote });
