// Product · Statutory evidence — provisions in the selected jurisdiction's law text that mention this substance.
// Data: /api/integrations/provisions/{cas}?country= (EPC engineering jurisdiction index, hybrid search);
// 정해 둔 물질은 미리 받아 둔 pv/<CAS>.json 이 먼저(useProvisions → api_static_extras.jsx staticProvisions).
// 국내(KR)는 법제처 본문 기반 「국내 근거 조문」 패널(product_law_basis.jsx, #kr-law)이 먼저이고, 여기서는 그 패널로 가는 안내만 더한다.
// 문구: PRODUCT_LABELS.intl.provisions. 스타일: product_detail.css(.pd-prov-*).

const EPC_JURISDICTIONS = ["KR", "US", "EU", "NL", "MX", "IN", "PK", "VN"]; // backend epc_regulation_text.EPC_JURISDICTION
const EPC_JURISDICTIONS_URL = "https://epc.yule.pics/jurisdictions";

function ProvisionHit({ h }) {
  const PV = PRODUCT_LABELS.intl.provisions;
  return (
    <div className="pd-prov-hit">
      <div><b>{h.reference}</b></div>
      <div className="muted pd-meta">{h.instrument}{h.amended_on ? ` · ${h.amended_on}` : ""}</div>
      <div className="pd-prov-snippet">{h.snippet}</div>
      {h.source_url && <a className="mono pd-link-xs" href={h.source_url} target="_blank" rel="noopener">{PV.source}</a>}
    </div>
  );
}

function ProvisionEvidence({ cas, country, name }) {
  const PV = PRODUCT_LABELS.intl.provisions;
  const supported = EPC_JURISDICTIONS.includes(country);
  const { data, loading, error } = useProvisions(cas, country, name, supported);
  if (!supported) return null;
  const hits = data?.hits || [];
  return (
    <div id="provisions" className="panel pd-sub-panel">
      <h3>
        <b>{PV.heading(jurisdictionLabel(country))}</b>
        <a className="mono pd-link-xs" href={EPC_JURISDICTIONS_URL} target="_blank" rel="noopener">{PV.epcLink}</a>
      </h3>
      <div className="body">
        {country === "KR" && <div className="muted pd-note"><a href="#kr-law">{LAW_LABELS.epcNote}</a></div>}
        {loading && <div className="muted pd-note">{PV.loading}</div>}
        {!loading && (error || data?.available === false) && <div className="muted pd-note">{PV.unavailable}</div>}
        {!loading && data?.available && hits.length === 0 && <div className="muted pd-note">{PV.none}</div>}
        <div className="pd-prov-grid">
          {hits.map((h, i) => <ProvisionHit key={i} h={h} />)}
        </div>
        {hits.length > 0 && <div className="muted pd-foot-note">{PV.note}</div>}
        {data?.static_as_of && <div className="muted pd-foot-note-sm">{PV.staticAsOf(data.static_as_of)}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { ProvisionEvidence });
