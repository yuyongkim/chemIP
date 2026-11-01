// 근거 조문 한 줄의 링크 묶음 — ChemIP 국내 법령 보기(그 조로), 법제처 조문(또는 법령) 원문, 별표면 법제처 별표 파일.
// 물질 「국내 근거 조문」 패널의 목록 근거(law_basis_list.jsx)와 조문 언급(law_mention_list.jsx)이 같이 쓴다. 문구: LAW_LABELS.panel.

function LawCiteLinks({ href, goKr, ext }) {
  const P = LAW_LABELS.panel;
  return (
    <span className="law-cite-links">
      {href && <a className="pd-link-xs" href={href}>{P.open}</a>}
      {goKr && <a className="pd-link-xs" href={goKr} target="_blank" rel="noopener">{P.goKr}</a>}
      {ext && <a className="pd-link-xs" href={ext} target="_blank" rel="noopener">{P.annexPdf}</a>}
    </span>
  );
}

Object.assign(window, { LawCiteLinks });
