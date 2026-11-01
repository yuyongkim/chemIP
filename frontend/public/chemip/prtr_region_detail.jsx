// PRTR 지도 · 고른 지역(없으면 전국)의 시군구별 수와 사업장 목록. 지도·표에서 지역을 고르면 이 절이 바뀐다.

function PrtrRegionDetail({ body, iso, names, onClear }) {
  const L = PRTR_MAP_LABELS.region;
  const facilities = prtrFacilitiesIn(body, iso);
  const name = iso ? prtrRegionName(names, iso, CHEMIP_LANG) : L.all;
  return (
    <section className="panel prtr-detail" id="prtr-region" aria-live="polite">
      <h3>
        <b>{L.heading(name, facilities.length)}</b>
        {iso && <button type="button" className="ui-link-btn prtr-clear" onClick={onClear}>{L.clear}</button>}
      </h3>
      <div className="body prtr-detail-body">
        {!facilities.length
          ? <EmptyState>{L.none}</EmptyState>
          : <>
              <PrtrSigunguList items={prtrSigunguIn(body, iso)} showRegion={!iso} names={names} />
              <PrtrFacilityTable key={iso || "all"} facilities={facilities} />
            </>}
      </div>
    </section>
  );
}

Object.assign(window, { PrtrRegionDetail });
