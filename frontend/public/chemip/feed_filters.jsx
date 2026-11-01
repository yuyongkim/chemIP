// 화학사고 소식 · 거르기 줄: 나라·출처 고르기, 물질(이름 또는 CAS, 자주 나온 물질 목록), 지우기.
// 선택지는 부모가 feedCountryOptions·feedSourceOptions(feed_helpers.jsx)로 만들어 넘긴다. 문구: FEED_LABELS.filters.

function FeedFilters({ filters, setFilters, countries, sources, sourceMeta, substances }) {
  const L = FEED_LABELS;
  const F = L.filters;
  const [text, setText] = useState(filters.sub || "");
  useEffect(() => { setText(filters.sub || ""); }, [filters.sub]);
  const put = (patch) => setFilters({ ...filters, ...patch });
  const submit = (e) => { e.preventDefault(); put({ sub: text.trim() }); };
  const pickList = (e) => {
    const v = e.target.value;
    setText(v);
    if (feedIsCas(v)) put({ sub: v });
  };
  return (
    <form className="feed-filters" role="search" aria-label={F.aria} onSubmit={submit}>
      <label className="feed-field">
        <span>{F.country}</span>
        <select className="feed-select" value={filters.country || ""} onChange={e => put({ country: e.target.value })}>
          <option value="">{F.allCountries}</option>
          {countries.map(([code, n]) => <option key={code} value={code}>{feedCountryName(code, L, jurisdictionName)} ({n})</option>)}
        </select>
      </label>
      <label className="feed-field">
        <span>{F.source}</span>
        <select className="feed-select" value={filters.source || ""} onChange={e => put({ source: e.target.value })}>
          <option value="">{F.allSources}</option>
          {sources.map(([sid, n]) => <option key={sid} value={sid}>{feedSourceName(sid, L, sourceMeta)} ({n})</option>)}
        </select>
      </label>
      <label className="feed-field feed-field-wide">
        <span>{F.substance}</span>
        <span className="feed-sub-row">
          <input className="feed-input" type="search" list="feed-substances" value={text} placeholder={F.substancePlaceholder}
            onChange={pickList} aria-label={F.substance} />
          <button type="submit" className="btn sm">{F.apply}</button>
        </span>
        <datalist id="feed-substances" aria-label={F.substanceList}>
          {(substances || []).map(([cas, name, n]) => <option key={cas} value={cas}>{`${name} (${n})`}</option>)}
        </datalist>
      </label>
      {(filters.country || filters.source || filters.sub) && (
        <button type="button" className="ui-link-btn feed-clear" onClick={() => { setText(""); setFilters({ country: "", source: "", sub: "" }); }}>
          {F.clear}
        </button>
      )}
    </form>
  );
}

Object.assign(window, { FeedFilters });
