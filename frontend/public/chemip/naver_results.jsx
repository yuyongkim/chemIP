// "네이버 검색결과" 블록 — NAVER 검색 API 결과만 따로 보여 준다(KOTRA 와 섞지 않는다).
// 약관(검색 API 2.1~2.4): 네이버 검색결과임을 표시, 받은 내용 그대로, 원문 링크 제공.
// 제목·요약은 NAVER 가 준 문자열을 그대로 쓰고, NAVER 가 넣은 <b> 강조만 굵게 보인다(자체 강조 없음).
// 문구: PRODUCT_LABELS.market. 데이터: useNaverTradeNews(api_content.jsx) → /api/trade/naver-news. 스타일: product_detail.css.

function decodeNaverEntities(text) {
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

// "<b>벤젠</b> 시장" → ["", <b>벤젠</b>, " 시장"] — 다른 태그는 글자로 남긴다(React 가 이스케이프).
function NaverText({ text }) {
  const parts = String(text || "").split(/(<b>[\s\S]*?<\/b>)/g).filter(Boolean);
  return parts.map((part, i) => {
    const m = part.match(/^<b>([\s\S]*?)<\/b>$/);
    return m ? <b key={i}>{decodeNaverEntities(m[1])}</b> : <React.Fragment key={i}>{decodeNaverEntities(part)}</React.Fragment>;
  });
}

function NaverResultRow({ item }) {
  const K = PRODUCT_LABELS.market;
  const original = item.originallink || item.link || "";
  return (
    <div className="naver-row">
      <div>
        <a className="naver-title" href={original} target="_blank" rel="noopener noreferrer">
          <NaverText text={item.title} />
        </a>
        {item.description && <div className="muted pd-news-sum"><NaverText text={item.description} /></div>}
        <div className="mono naver-links">
          {item.originallink && <a href={item.originallink} target="_blank" rel="noopener noreferrer">{K.naverOriginal} ↗</a>}
          {item.link && item.link !== item.originallink && <a href={item.link} target="_blank" rel="noopener noreferrer">{K.naverLink} ↗</a>}
        </div>
      </div>
      <div className="mono muted naver-date">{item.pubDate || ""}</div>
    </div>
  );
}

function NaverResultsPanel({ query }) {
  const K = PRODUCT_LABELS.market;
  const ST = PRODUCT_LABELS.status;
  const naver = useNaverTradeNews(query);
  const items = (naver.data?.data || []).filter(it => it && it.source === "naver");
  return (
    <div className="panel naver-results pd-stack" data-source="naver">
      <PanelTitle t={K.naver}>
        <span className="muted">
          {naver.loading ? ST.loading : naver.error ? ST.error(naver.error) : K.items(items.length)}
        </span>
      </PanelTitle>
      <div className="body pd-flush">
        <div className="ui-hint naver-attr">{K.naverAttribution}</div>
        {items.length === 0 && !naver.loading && !naver.error && (
          <div className="pd-flush-empty">{K.naverNone(query)}</div>
        )}
        {items.slice(0, 10).map((it, i) => <NaverResultRow key={it.link || i} item={it} />)}
      </div>
    </div>
  );
}

Object.assign(window, { NaverResultsPanel, NaverText });
