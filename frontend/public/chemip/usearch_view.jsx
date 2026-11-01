// 최상위 화면 "통합 검색"(?view=search&q=) 셸 — 검색어 상태·주소 맞추기·배치만.
// 머리 usearch_box.jsx, 묶음 usearch_group.jsx, 결과 없음 usearch_empty_line.jsx·usearch_no_results.jsx,
// 자료 훅 useUnifiedSearch(api_usearch.jsx), 순서·모양 usBuildResults(usearch_core.jsx), 묶음 등록 usearch_providers.jsx.

function UnifiedSearchView({ link }) {
  const L = USEARCH_LABELS;
  const [initial] = useState(() => usearchInitialQuery(link));
  const [q, setQ] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const states = useUnifiedSearch(submitted);
  const results = React.useMemo(() => usBuildResults(USEARCH_PROVIDERS, states), [states]);

  useEffect(() => { usearchSyncUrl(submitted); }, [submitted]);
  useEffect(() => () => usearchSyncUrl(null), []);

  const run = (term) => { const t = usCleanQuery(term); setQ(t); setSubmitted(t); };

  return (
    <div className="us-page">
      <UsBox q={q} setQ={setQ} onSubmit={() => run(q)} onPick={run} />
      {!submitted && <p className="muted us-intro">{L.intro}</p>}
      {submitted && (
        <div className="us-results" aria-live="polite" aria-busy={results.loading}>
          {!results.loading && <div className="muted us-summary">{L.summary(submitted, results.total)}</div>}
          <UsAnswers query={submitted} />
          {results.shown.map(g => <UsGroup key={`${g.k}:${submitted}`} group={g} query={submitted} />)}
          {!results.loading && !results.shown.length && <UsNoResults query={submitted} />}
          <UsEmptyLine groups={results.empty} label={L.emptyGroups} />
          <UsEmptyLine groups={results.failed} label={L.failedGroups} />
        </div>
      )}
    </div>
  );
}

Object.assign(window, { UnifiedSearchView });
