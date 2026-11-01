// 경고표지 만들기 안내 줄 — 어디서 채웠는지(MSDS 2항·불러오는 중·실패·자료 없음·직접 넣기), 문구표·비공식 번역 안내.

function GhsLabelStatus({ chem, source, s2, name, phrasesError, hasUnofficial }) {
  const V = GHS_LABELS.view;
  let line = V.manual;
  if (chem) {
    if (source.loading) line = V.loading;
    else if (source.error) line = V.error(source.error);
    else if (!s2 || !s2.has) line = V.noSection2;
    else line = V.from(name || chem);
  }
  return (
    <div className="gl-status">
      <div className="calc-prefill">{line}</div>
      {s2 && s2.unknownPictograms.length > 0 && <div className="calc-hint">{GHS_LABELS.row.unknown(s2.unknownPictograms.join(", "))}</div>}
      {phrasesError && <div className="calc-hint">{V.phrasesMissing}</div>}
      {hasUnofficial && <div className="calc-hint">{V.unofficial}</div>}
    </div>
  );
}

Object.assign(window, { GhsLabelStatus });
