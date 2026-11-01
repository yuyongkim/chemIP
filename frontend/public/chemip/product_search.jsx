// Product · Search view — 상태(검색어·자료원 거르기)와 배치만. 머리: product_search_hero.jsx,
// 결과: product_search_results.jsx, 안내 카드: product_search_cards.jsx, 순수 함수: product_search_helpers.jsx.

function SearchView({ onOpen, initialQuery, onQuerySubmit }) {
  const [q, setQ] = useState(initialQuery || "");
  const [submitted, setSubmitted] = useState(initialQuery || "");
  // When the parent pushes a new query (top-bar Enter), pick it up
  useEffect(() => {
    if (initialQuery && initialQuery !== submitted) {
      setQ(initialQuery);
      setSubmitted(initialQuery);
    }
  }, [initialQuery]);
  const { data, loading, error } = useChemicalSearch(submitted);
  const rawItems = data?.items || [];
  const [sourceFilter, setSourceFilter] = useState("all");

  const sourceCounts = React.useMemo(() => searchSourceCounts(rawItems), [rawItems]);
  const items = React.useMemo(() => sortSearchItems(rawItems, sourceFilter, submitted), [rawItems, sourceFilter, submitted]);

  const submit = () => { const t = q.trim(); setSubmitted(t); if (t) onQuerySubmit && onQuerySubmit(t); };
  const pick = (r) => { setQ(r); setSubmitted(r); onQuerySubmit && onQuerySubmit(r); };

  return (
    <div>
      <SearchHero q={q} setQ={setQ} onSubmit={submit} onPick={pick} />
      {submitted && (
        <SearchResults submitted={submitted} loading={loading} error={error} rawItems={rawItems} items={items}
          counts={sourceCounts} sourceFilter={sourceFilter} setSourceFilter={setSourceFilter} onOpen={onOpen} />
      )}
      {!submitted && <SearchIntroCards />}
    </div>
  );
}

Object.assign(window, { SearchView });
