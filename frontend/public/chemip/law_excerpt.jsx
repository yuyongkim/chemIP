// 물질 「국내 근거 조문」 패널 · 조문 발췌 하나 — 머리(약칭 법령·조문·제목, 법제처 링크) + 항·호·목을 줄마다 나눈 본문.
// <개정 …> 꼬리표는 뺀다(law_cite_format.jsx lawExcerptLines). q 가 있으면 찾은 말 표시(LawHighlight). 목록 카드·조문 언급이 같이 쓴다.

function LawExcerpt({ cite, q = "" }) {
  const lines = lawExcerptLines(cite.snippet);
  const ref = lawShortLabel(cite.label, LAW_SHORT.label);
  return (
    <div className="pd-law-ex">
      <div className="pd-law-ex-head">
        <b data-source-text="">{lawShortName(cite.name, LAW_SHORT)} {ref}</b>
        {cite.title && <span className="muted" data-source-text=""> {cite.title}</span>}
        <LawCiteLinks href={cite.href} goKr={cite.goKr} ext={cite.ext} />
      </div>
      {lines.length > 0 && (
        <div className="pd-law-ex-lines" data-source-text="">
          {lines.map((ln, i) => <p key={i} className={`law-line l${ln.lvl}`}><LawHighlight text={ln.text} q={q} /></p>)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { LawExcerpt });
