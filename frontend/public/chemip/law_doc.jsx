// 국내 법령 보기 · 법령 하나 — 머리(law_doc_head.jsx), 탭(조문·별표·서식·연혁), 차례(law_toc.jsx), 안에서 찾기(law_doc_search.jsx),
// 조문(law_article.jsx), 별표(law_annexes.jsx), 연혁(law_history.jsx). art = 처음 보일 조(주소 art=), q = 찾을 말(주소 q=).
// 자료: useLawDoc(api_law.jsx). 찾기·차례는 law_core.jsx 순수 함수. 문구: LAW_LABELS.

const LAW_DOC_TABS = ["text", "annexes", "history"];
const LAW_NARROW_MQ = "(max-width: 900px)";

function LawDocument({ meta, art, q, onOpen, onQuery }) {
  const L = LAW_LABELS;
  const { data, loading } = useLawDoc(meta.id);
  const [tab, setTab] = useState("text");
  const items = (data && data.items) || [];
  const hits = React.useMemo(() => lawSearchItems(items, q), [items, q]);
  const toc = React.useMemo(() => lawTocEntries(items), [items]);
  const narrow = React.useMemo(() => { try { return window.matchMedia(LAW_NARROW_MQ).matches; } catch (e) { return false; } }, []);
  const target = art ? items.findIndex(it => it.t !== "h" && it.no === art) : -1;
  const shown = q ? hits : items.map((_, i) => i);

  useEffect(() => {
    if (!data || !art || tab !== "text") return;
    const el = document.getElementById(lawArtAnchor(art));
    if (el) { try { el.scrollIntoView({ block: "start" }); } catch (e) {} }
  }, [data, art, q, tab]);

  const counts = { text: data ? data.articles : 0, annexes: data ? (data.annex_list || []).length : 0, history: data ? (data.history || []).length : 0 };
  const pick = (no) => onOpen(meta.id, no, q);

  return (
    <div className="law-doc">
      <LawLink law="" onOpen={onOpen} className="btn sm ghost law-back">{L.back}</LawLink>
      <LawDocHead meta={data || meta} />
      {loading && <div className="muted law-mini">{L.loading}</div>}
      {!loading && !data && <EmptyState card>{L.unavailable}</EmptyState>}
      {data && (
        <>
          <div className="tabs law-tabs">
            {LAW_DOC_TABS.map(k => (
              <button key={k} aria-selected={tab === k} onClick={() => setTab(k)}>{L.tabs[k]} <span className="n">{counts[k]}</span></button>
            ))}
          </div>
          {tab === "text" && (
            <div className="law-layout">
              <aside className="law-aside">
                <Collapsible summary={L.toc} defaultOpen={!narrow} className="law-toc-box">
                  <LawToc entries={toc} docId={meta.id} current={art} q={q} onOpen={onOpen} />
                </Collapsible>
              </aside>
              <div className="law-main">
                <LawDocSearch q={q} count={hits.length} onQuery={onQuery} />
                {art && target < 0 && <EmptyState card>{L.artNotFound(lawArtLabel(art))}</EmptyState>}
                {q && !hits.length && <EmptyState card>{L.docNoHits}</EmptyState>}
                <div className="law-articles" lang="ko">
                  {shown.map(i => <LawArticle key={i} item={items[i]} meta={data} q={q} current={items[i].t !== "h" && items[i].no === art} onPick={pick} />)}
                </div>
              </div>
            </div>
          )}
          {tab === "annexes" && <LawAnnexList annexes={data.annex_list || []} />}
          {tab === "history" && <LawHistory rows={data.history || []} />}
          <LawSourceNote asOf={data.as_of} />
        </>
      )}
    </div>
  );
}

Object.assign(window, { LawDocument });
