// 국내 법령 보기 · 법령 안에서 찾기 칸 — 입력하면 맞는 조문만 보이고(q 를 주소에 남김), 지우면 전체. 맞추기: law_core.jsx lawSearchItems.

const LAW_SEARCH_DELAY_MS = 250;

function LawDocSearch({ q, count, onQuery }) {
  const L = LAW_LABELS;
  const [text, setText] = useState(q || "");
  useEffect(() => { setText(q || ""); }, [q]);
  useEffect(() => {
    if (text.trim() === (q || "")) return undefined;
    const t = setTimeout(() => onQuery(text.trim()), LAW_SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <div className="law-search">
      <div className="pv-box law-box">
        <Icon name="search" size={14} />
        <input className="pv-input" value={text} onChange={e => setText(e.target.value)} placeholder={L.docSearch} aria-label={L.docSearchAria} />
      </div>
      {q && (
        <span className="law-search-meta">
          <span className="muted mono law-mini">{L.docHits(count)}</span>
          <button type="button" className="btn sm ghost" onClick={() => { setText(""); onQuery(""); }}>{L.showAll}</button>
        </span>
      )}
    </div>
  );
}

Object.assign(window, { LawDocSearch });
