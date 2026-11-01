// 최상위 화면 "국내 법령 보기"(?view=law, &law=<id 또는 이름>&art=<조번호>&q=<찾을 말>) 셸 — 주소 상태·맞추기·배치만.
// 법령 목록·말뭉치 찾기 law_index.jsx, 법령 하나 law_doc.jsx. 자료 훅 api_law.jsx, 순수 함수 law_core.jsx, 문구 law_labels*.jsx.

function LawView() {
  const L = LAW_LABELS;
  const [params, setParams] = useState(() => lawReadParams(typeof location !== "undefined" ? location.search : ""));
  const index = useLawIndex();
  const meta = params.law ? lawResolveDoc(index.data, params.law) : null;

  useEffect(() => {
    try { history.replaceState(history.state, "", lawUrlWith(location.href, { ...params, law: meta ? meta.id : params.law })); } catch (e) {}
  }, [params.law, params.art, params.q, meta && meta.id]);
  useEffect(() => () => { try { history.replaceState(history.state, "", lawUrlWith(location.href, {})); } catch (e) {} }, []);

  const open = (law, art = "", q = "") => {
    setParams({ law, art, q });
    if (!art) { try { window.scrollTo(0, 0); } catch (e) {} }
  };
  const setQuery = (q) => setParams(p => ({ ...p, q, art: "" }));
  const status = index.loading ? L.loading : index.data ? L.docCount(index.data.count) : "";

  return (
    <div className="law-page">
      <SectionHeading t={L.heading} meta={status} />
      {!index.loading && !index.data && <EmptyState card>{L.unavailable}</EmptyState>}
      {index.data && !params.law && <LawIndex index={index.data} onOpen={open} />}
      {index.data && params.law && !meta && (
        <div className="law-missing">
          <EmptyState card>{L.notFound(params.law)}</EmptyState>
          <LawLink law="" onOpen={open} className="btn sm ghost">{L.back}</LawLink>
        </div>
      )}
      {meta && <LawDocument key={meta.id} meta={meta} art={params.art} q={params.q} onOpen={open} onQuery={setQuery} />}
    </div>
  );
}

Object.assign(window, { LawView });
