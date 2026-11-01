// 최상위 화면 "화학사고 소식"(?view=feed&sub=&country=&src=) 셸 — 거르기 상태·주소 맞추기·자료 고르기·배치만.
// 자료 훅 useFeedLatest·useFeedByCas(api_feed.jsx), 거르기·선택지 feed_helpers.jsx, 주소 feed_link.jsx,
// 거르기 줄 feed_filters.jsx, 목록 feed_list.jsx → feed_item.jsx, 출처 feed_attribution.jsx. 문구: FEED_LABELS.
// 물질을 CAS 로 고르면 그 물질 파일(feed/by-cas/<CAS>.json, 모든 기록)을, 아니면 최근 소식(feed/latest.json)을 거른다.

function IncidentFeedView() {
  const L = FEED_LABELS;
  const [filters, setFiltersState] = useState(() => feedReadLink(typeof location !== "undefined" ? location.search : ""));
  const latest = useFeedLatest();
  const casMode = feedIsCas(filters.sub);
  const byCas = useFeedByCas(casMode ? filters.sub.trim() : "");

  useEffect(() => { feedSyncUrl(filters); }, [filters]);
  useEffect(() => () => feedSyncUrl(null), []);
  const setFilters = (f) => setFiltersState({ country: f.country || "", source: f.source || "", sub: (f.sub || "").trim() });

  const meta = latest.data;
  const pool = casMode ? (byCas.data?.items || []) : (meta?.items || []);
  const items = React.useMemo(
    () => feedFilterItems(pool, { country: filters.country, source: filters.source, sub: casMode ? "" : filters.sub }),
    [pool, filters, casMode]);
  const countries = React.useMemo(() => feedCountryOptions(pool), [pool]);
  const sources = React.useMemo(() => feedSourceOptions(pool, meta?.sources), [pool, meta]);
  const loading = latest.loading || (casMode && byCas.loading);
  const failed = !latest.loading && (latest.error || !meta);
  const asOf = meta ? (meta.cron?.last_run ? L.cronUpdated(meta.updated_at) : L.updated(meta.exported_at)) : "";

  return (
    <div className="feed-page">
      <SectionHeading t={{ ko: FEED_LABELS_KO.title, en: FEED_LABELS_KO.titleEn }} meta={loading ? L.loading : asOf} />
      <p className="muted feed-intro">{L.intro}</p>
      {failed ? <EmptyState card>{latest.error ? L.error : L.unavailable}</EmptyState> : meta && (
        <>
          <FeedFilters filters={filters} setFilters={setFilters} countries={countries} sources={sources}
            sourceMeta={meta.sources} substances={meta.substances} />
          <div className="muted feed-mini feed-scope" aria-live="polite">
            {casMode && byCas.data ? L.scopeCas(byCas.data.name, byCas.data.cas, byCas.data.total) : L.scopeLatest}
            {" · "}{L.count(items.length, casMode ? (byCas.data?.total || 0) : meta.total)}
          </div>
          {casMode && byCas.error ? <ErrorState message={byCas.error} card />
            : casMode && byCas.loading ? null
            : <FeedList key={JSON.stringify(filters)} items={items} sources={meta.sources} disciplines={meta.disciplines}
                emptyText={casMode && !pool.length ? L.noneCas(filters.sub) : L.none} />}
          <FeedAttribution sources={meta.sources} />
        </>
      )}
    </div>
  );
}

Object.assign(window, { IncidentFeedView });
