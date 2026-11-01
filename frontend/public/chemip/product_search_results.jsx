// 물질 검색 결과 — 머리(검색어·건수), 자료원 거르기, 자료원별로 묶은 표. 순수 함수: product_search_helpers.jsx.
// 문구: PRODUCT_LABELS.search. 스타일: product_search.css(.ps-*).

const SEARCH_SOURCE_FILTERS = [
  { k: "all", label: S => S.all }, { k: "kosha", label: () => "KOSHA" }, { k: "echa", label: () => "ECHA" },
  { k: "other", label: S => S.other, onlyIfAny: true },
];

function SearchSourceFilter({ counts, value, onChange }) {
  const S = PRODUCT_LABELS.search;
  return (
    <div className="ps-filter">
      <span className="upper ps-filter-label">{S.sourceLabel}</span>
      <div className="seg ps-seg">
        {SEARCH_SOURCE_FILTERS.filter(f => !f.onlyIfAny || counts[f.k] > 0).map(f => (
          <button key={f.k} aria-pressed={value === f.k} onClick={() => onChange(f.k)}>{f.label(S)} · {counts[f.k]}</button>
        ))}
      </div>
      <span className="muted mono ps-sort-note">{S.sortNote}</span>
    </div>
  );
}

function SearchResultTable({ items, onOpen }) {
  const S = PRODUCT_LABELS.search;
  const rows = groupSearchRows(items, S);
  return (
    <div className="ps-table-wrap">
      <table className="pat-table ps-table">
        <colgroup><col className="ps-col-name" /><col className="ps-col-en" /><col className="ps-col-cas" /><col className="ps-col-id" /><col className="ps-col-src" /><col className="ps-col-open" /></colgroup>
        <thead><tr><th>{S.cols.name}</th><th>{S.cols.en}</th><th>{S.cols.cas}</th><th>{S.cols.id}</th><th>{S.cols.source}</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => r.kind === "header" ? (
            <tr key={r.key}>
              <td colSpan="6" className="ps-group">
                § <Abbr code={String(r.label).split(" ")[0]}>{r.label}</Abbr>
              </td>
            </tr>
          ) : (
            <tr key={r.key} className="ps-row" tabIndex={0} onClick={() => onOpen(r.it)} onKeyDown={e => { if (e.key === "Enter") onOpen(r.it); }}>
              <td className="ps-wrap"><b>{searchRowNames(r.it).first}</b></td>
              <td className="muted ps-wrap pd-td-sm">{searchRowNames(r.it).second || "—"}</td>
              <td className="mono ps-nowrap">{r.it.cas_no || "—"}</td>
              <td className="mono muted ps-td-xs">{r.it.chem_id}</td>
              <td>{r.it.has_msds ? <Chip tone="chip safe"><span className="dot" /><Abbr code={r.it.source} /></Chip> : <Chip><Abbr code={r.it.source} /></Chip>}</td>
              <td><span className="muted pd-meta">{S.open}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchResults({ submitted, loading, error, rawItems, items, counts, sourceFilter, setSourceFilter, onOpen }) {
  const S = PRODUCT_LABELS.search;
  return (
    <div className="ps-results">
      <div className="pd-tab-head">
        <h3 className="pd-tab-title">
          {S.results(submitted)}
          {loading && <span className="muted ps-loading">{PRODUCT_LABELS.status.loading}</span>}
        </h3>
        <span className="muted mono pd-meta">
          {error ? PRODUCT_LABELS.status.error(error) : S.hits(items.length, rawItems.length)}
        </span>
      </div>

      {rawItems.length > 0 && <SearchSourceFilter counts={counts} value={sourceFilter} onChange={setSourceFilter} />}

      {items.length === 0 && !loading && !error && (
        <div className="card ps-none">{S.none}</div>
      )}
      {items.length > 0 && <SearchResultTable items={items} onOpen={onOpen} />}
    </div>
  );
}

Object.assign(window, { SearchResults });
