// Product · Statutory evidence — provisions in the selected jurisdiction's law text that mention this substance.
// Data: /api/integrations/provisions/{cas}?country= (EPC engineering jurisdiction index, hybrid search).

const EPC_JURISDICTIONS = ["KR", "US", "EU", "NL", "MX", "IN", "PK", "VN"]; // backend epc_regulation_text.EPC_JURISDICTION

function ProvisionEvidence({ cas, country, name }) {
  const supported = EPC_JURISDICTIONS.includes(country);
  const { data, loading, error } = useProvisions(cas, country, name, supported);
  if (!supported) return null;
  const hits = data?.hits || [];
  return (
    <div className="panel" style={{ marginTop: 14 }}>
      <h3>
        <b>근거 조문 · {jurisdictionLabel(country)}</b>
        <a className="mono" style={{ fontSize: 10 }} href="https://epc.yule.pics/jurisdictions" target="_blank" rel="noopener">EPC engineering 법령 본문 검색 ↗</a>
      </h3>
      <div className="body">
        {loading && <div className="muted" style={{ fontSize: 12 }}>법령 본문을 찾는 중입니다…</div>}
        {!loading && (error || data?.available === false) && (
          <div className="muted" style={{ fontSize: 12 }}>본문 검색 서비스에 연결하지 못했습니다. 위 목록은 정상입니다.</div>
        )}
        {!loading && data?.available && hits.length === 0 && <div className="muted" style={{ fontSize: 12 }}>일치하는 조문이 없습니다.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {hits.map((h, i) => (
            <div key={i} style={{ fontSize: 12, overflowWrap: "anywhere", minWidth: 0 }}>
              <div><b>{h.reference}</b></div>
              <div className="muted" style={{ fontSize: 11 }}>{h.instrument}{h.amended_on ? ` · ${h.amended_on}` : ""}</div>
              <div style={{ marginTop: 4, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{h.snippet}</div>
              {h.source_url && <a className="mono" style={{ fontSize: 10 }} href={h.source_url} target="_blank" rel="noopener">원문 ↗</a>}
            </div>
          ))}
        </div>
        {hits.length > 0 && (
          <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>
            물질명·CAS로 그 나라 법령 본문(하위 법령·주 법령 포함)을 검색한 결과입니다. 목록 등재의 직접 근거가 아닐 수 있으니 원문을 확인하십시오.
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ProvisionEvidence });
