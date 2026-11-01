// 국내 법령 보기 · 법령 목록(법령·행정규칙 묶음)과 말뭉치 찾기 칸(법령 이름·조문 제목·장절 제목). 자료는 부모(LawView)의 index.json,
// 찾기를 시작하면 toc.json 을 받는다(useLawToc). 찾은 줄은 law_corpus_results.jsx. 문구: LAW_LABELS.

function LawIndex({ index, onOpen }) {
  const L = LAW_LABELS;
  const [q, setQ] = useState("");
  const searching = q.trim().length > 0;
  const toc = useLawToc(searching);
  const groups = lawDocsByKind(index);
  return (
    <div className="law-index">
      <p className="muted law-intro">{L.intro(index.count)}</p>
      <div className="pv-box law-box">
        <Icon name="search" size={14} />
        <input className="pv-input" value={q} onChange={e => setQ(e.target.value)} placeholder={L.corpusSearch} aria-label={L.corpusSearchAria} />
      </div>
      {searching
        ? <LawCorpusResults index={index} toc={toc.data} loading={toc.loading} q={q} onOpen={onOpen} />
        : groups.map(g => (
          <section key={g.kind} className="law-group">
            <h2 className="law-group-title">{L.kinds[g.kind] || g.kind_word} <span className="muted mono law-mini">{L.docCount(g.docs.length)}</span></h2>
            <ul className="law-doc-list">
              {g.docs.map(d => (
                <li key={d.id} className="law-doc-row">
                  <LawLink law={d.id} onOpen={onOpen} className="law-doc-name"><span data-source-text="">{d.name}</span></LawLink>
                  <span className="muted law-mini">
                    <span data-source-text="">{[d.law_type, d.ministry].filter(Boolean).join(" · ")}</span>
                    {` · ${L.meta.effective(d.effective_on)} · ${L.meta.articles(d.articles)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      <LawSourceNote asOf={index.as_of} copy={false} />
    </div>
  );
}

Object.assign(window, { LawIndex });
