// 국내 법령 보기 · 말뭉치 찾기 결과(법령 이름 → 조문 제목·장절 제목). 맞추기: law_core.jsx lawSearchCorpus. 문구: LAW_LABELS.

function LawCorpusResults({ index, toc, loading, q, onOpen }) {
  const L = LAW_LABELS;
  const hits = lawSearchCorpus(index, toc, q);
  if (!hits.length && loading) return <div className="muted law-mini">{L.loading}</div>;
  if (!hits.length) return <EmptyState card>{L.corpusNone}</EmptyState>;
  return (
    <div className="law-corpus">
      <div className="muted mono law-mini">{L.corpusHits(hits.length)}</div>
      <ul className="law-doc-list">
        {hits.map((h, i) => (
          <li key={i} className="law-doc-row">
            <LawLink law={h.doc} art={h.no} onOpen={onOpen} className="law-doc-name">
              <span data-source-text="">
                {h.t === "doc" ? <LawHighlight text={h.name} q={q} /> : <>{h.t !== "h" && `${lawArtLabel(h.no)} `}<LawHighlight text={h.title} q={q} /></>}
              </span>
            </LawLink>
            <span className="muted law-mini">
              {h.t === "doc" ? L.corpusDoc : h.t === "h" ? L.corpusHeading : ""}{h.t !== "doc" && <span data-source-text="">{`${h.t === "h" ? " · " : ""}${h.name}`}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

Object.assign(window, { LawCorpusResults });
