// PRTR 지도 · 출처 줄(PRTR 출처·연도·라이선스, 지도 경계 출처·라이선스)과 "신고 값 그대로, 판단 없음" 안내.
// PRTR 출처 문구는 파일의 source(backend/core/prtr_map.py SOURCE 한 곳), 경계 출처는 PRTR_GEO_SOURCE(prtr_map_geo.jsx).

function PrtrSourceNote({ body }) {
  const L = PRTR_MAP_LABELS.source;
  const src = body.source || {};
  const en = CHEMIP_LANG === "en";
  const geo = window.PRTR_GEO_SOURCE || {};
  return (
    <div className="muted prtr-source">
      <p>
        {L.label}: <a href={src.url} target="_blank" rel="noopener">{en ? src.name_en : src.name_ko}</a>
        {` · ${en ? src.provider_en : src.provider_ko} · ${L.year(body.year)} · ${en ? src.license_en : src.license_ko}`}
        {` · ${L.listed(body.totals?.facilities || 0, body.reported_facilities || 0)}`}
      </p>
      <p>
        {L.boundary}: <a href={geo.data_url} target="_blank" rel="noopener">{geo.name}</a>
        {" · "}<a href={geo.license_url} target="_blank" rel="noopener">{L.boundaryLicense}</a>
      </p>
      <p>{L.note}</p>
      {body.unparsed > 0 && <p>{L.unparsed(body.unparsed)}</p>}
    </div>
  );
}

Object.assign(window, { PrtrSourceNote });
