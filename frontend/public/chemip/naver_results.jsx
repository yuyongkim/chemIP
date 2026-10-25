// "네이버 검색결과" 블록 — NAVER 검색 API 결과만 따로 보여 준다(KOTRA 와 섞지 않는다).
// 약관(검색 API 2.1~2.4): 네이버 검색결과임을 표시, 받은 내용 그대로, 원문 링크 제공.
// 제목·요약은 NAVER 가 준 문자열을 그대로 쓰고, NAVER 가 넣은 <b> 강조만 굵게 보인다(자체 강조 없음).
// 문구: PRODUCT_LABELS.market. 데이터: useNaverTradeNews(api.jsx) → /api/trade/naver-news.

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

function NaverResultRow({ item, first }) {
  const K = PRODUCT_LABELS.market;
  const original = item.originallink || item.link || "";
  return (
    <div className="naver-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, padding: "14px 18px", borderTop: first ? 0 : "1px solid var(--border)", alignItems: "start" }}>
      <div>
        <a href={original} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: "inherit" }}>
          <NaverText text={item.title} />
        </a>
        {item.description && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}><NaverText text={item.description} /></div>}
        <div className="mono" style={{ fontSize: 10, marginTop: 4, display: "flex", gap: 10 }}>
          {item.originallink && <a href={item.originallink} target="_blank" rel="noopener noreferrer">{K.naverOriginal} ↗</a>}
          {item.link && item.link !== item.originallink && <a href={item.link} target="_blank" rel="noopener noreferrer">{K.naverLink} ↗</a>}
        </div>
      </div>
      <div className="mono muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{item.pubDate || ""}</div>
    </div>
  );
}

function NaverResultsPanel({ query }) {
  const K = PRODUCT_LABELS.market;
  const ST = PRODUCT_LABELS.status;
  const naver = useNaverTradeNews(query);
  const items = (naver.data?.data || []).filter(it => it && it.source === "naver");
  return (
    <div className="panel naver-results" data-source="naver" style={{ marginTop: 16 }}>
      <PanelTitle t={K.naver}>
        <span className="muted">
          {naver.loading ? ST.loading : naver.error ? ST.error(naver.error) : K.items(items.length)}
        </span>
      </PanelTitle>
      <div className="body" style={{ padding: 0 }}>
        <div className="ui-hint" style={{ padding: "10px 18px 0" }}>{K.naverAttribution}</div>
        {items.length === 0 && !naver.loading && (
          <div style={{ padding: "16px 18px", color: "var(--fg-muted)", fontSize: 13 }}>{K.naverNone(query)}</div>
        )}
        {items.slice(0, 10).map((it, i) => <NaverResultRow key={it.link || i} item={it} first={i === 0} />)}
      </div>
    </div>
  );
}

Object.assign(window, { NaverResultsPanel, NaverText });
