// 해외 규제 탭 — EU: REACH 등록 현황(그때그때 조회, PC 꺼져도 Worker 가 답한다), ECHA 물질 기록(실시간, 집 PC 전용).
// REACH 패널은 국가별 규제 절과 같은 답(useReachRegistration, api_reach.jsx)·같은 칸(ReachEntry, product_intl_reach.jsx)을 쓴다.
// 2026-11-01: 예전 REACH 상태 띠(규제 정보 /regulations/intelligence 의 ECHA 기록에서 뽑음)는 PC 가 꺼지면 오류만 보여서 바꿨다.
// 그 기록의 REACH 상태 표시는 아래 ECHA 물질 기록 패널에 그대로 있다.
// 문구: PRODUCT_LABELS.regulation · REACH_LABELS. 스타일: product_detail.css.

function ReachStatusPanel({ reach }) {
  const G = PRODUCT_LABELS.regulation;
  return (
    <div className="panel">
      <h3><b>{G.reach}</b> <span className="muted"><Abbr code="ECHA" /> CHEM · REACH</span></h3>
      <div className="body">
        <ReachEntry entry={reachEntryOf(reach)} />
      </div>
    </div>
  );
}

function EchaRecordsPanel({ intel, echa, onRetry }) {
  const G = PRODUCT_LABELS.regulation;
  const rows = echa.data || [];
  return (
    <div className="panel pd-stack">
      <h3>
        <b><Abbr code="ECHA" /> {G.echaRecords}</b>
        <span className="muted">{intelMeta(intel, `${echa.query_used ? `q:${echa.query_used} · ` : ""}${G.recs(echa.total || rows.length)}`)}</span>
      </h3>
      <div className="body">
        <IntelPending intel={intel} />
        {onRetry && intel.error && !apiIsNotice(intel.error) && (
          <div className="pd-retry-row"><button className="btn sm" onClick={onRetry}>{G.retry}</button></div>
        )}
        {echa.error && <div className="pd-error-note">{echa.error}</div>}
        {intelReady(intel) && !echa.error && rows.length === 0 && <div className="muted pd-note">{G.noEcha}</div>}
        {rows.slice(0, 4).map((it, i) => (
          <div key={i} className="row pd-row-top">
            <div className="k mono pd-k-xs">{it.cas_number || it.rml_id || "—"}</div>
            <div className="v pd-v-sm">
              <b>{it.name || it.iupac_name || "—"}</b>
              {it.ec_number && <span className="muted"> · EC {it.ec_number}</span>}
              {it.molecular_formula && <span className="muted"> · {it.molecular_formula}</span>}
              {(it.reach_status || []).length > 0 && (
                <div className="pd-chip-row-sm">
                  {it.reach_status.map(s => (<span key={s.code} className="chip pd-chip-xs">{G.reachNames?.[s.code] || s.label}</span>))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ReachStatusPanel, EchaRecordsPanel });
