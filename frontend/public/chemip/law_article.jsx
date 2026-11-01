// 국내 법령 보기 · 조문 하나(또는 장·절 제목) — 항·호·목 들여쓰기(law_core.jsx lawItemLines), 찾을 말 표시, 조 번호 앵커(art=),
// 법제처 조문 링크. 본문은 원문(한국어) 그대로. 문구: LAW_LABELS.

function LawArticle({ item, meta, q, current, onPick }) {
  const L = LAW_LABELS;
  if (item.t === "h") return <h3 className="law-heading" data-source-text=""><LawHighlight text={item.text} q={q} /></h3>;
  const anchor = lawArtAnchor(item.no);
  const goKr = lawGoKrArticleUrl(meta, item.no);
  return (
    <article id={anchor || undefined} className={`law-article${current ? " is-current" : ""}`}>
      <div className="law-article-tools">
        {anchor && <LawLink law={meta.id} art={item.no} q={q} onOpen={onPick ? (_law, no) => onPick(no) : null} className="mono law-mini"><span data-source-text="">{lawArtLabel(item.no)}</span></LawLink>}
        {item.eff && <span className="muted law-mini">{L.artEff(item.eff)}</span>}
        {goKr && <a className="law-mini" href={goKr} target="_blank" rel="noopener">{L.goKrArticle}</a>}
      </div>
      <div className="law-lines" data-source-text="">
        {lawItemLines(item).map((ln, i) => <p key={i} className={`law-line l${ln.lvl}`}><LawHighlight text={ln.text} q={q} /></p>)}
      </div>
    </article>
  );
}

Object.assign(window, { LawArticle });
