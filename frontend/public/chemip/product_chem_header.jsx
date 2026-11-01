// 물질 상세 머리 — CAS·물질 ID·자료원, 이름(화면 언어 이름 · 다른 언어 이름, chemDisplayNames; KOSHA 관용명은 작은 줄), MSDS 항목 수, 유해성 표시, 오른쪽 작은 통계 4칸.
// 문구: PRODUCT_LABELS.chem. 스타일: product_detail.css(.pd-*).

function ChemStatusValue({ loading, error, hasSections }) {
  const S = PRODUCT_LABELS.chem.stats.status;
  const tone = error ? "tone-hazard" : (!hasSections && !loading) ? "tone-warn" : "tone-safe";
  return (
    <div className={`v pd-stat-sm ${tone}`}>
      {loading ? "…" : error ? S.err : !hasSections ? S.noMsds : S.ok}
    </div>
  );
}

function ChemHeader({ selected, sections, loading, error }) {
  const L = PRODUCT_LABELS.chem;
  const { primary, secondary, synonym } = chemDisplayNames(selected);
  const { hazardText, isFlammable, isIrritant } = msdsHazardSummary(sections);
  return (
    <div className="chem-hdr">
      <div className="title">
        <div className="id-row">
          {selected?.cas_no && <span className="chip accent">CAS {selected.cas_no}</span>}
          <span className="mono">{L.idLabel} {selected?.chem_id}</span>
          <span>·</span>
          <span>{selected?.source || "—"}</span>
          {loading && <span className="muted">· {L.loadingMsds}</span>}
          {error && <span className="pd-hazard-text">· {error}</span>}
        </div>
        <h1>{primary} {secondary && <span className="muted pd-name-en">· {secondary}</span>}</h1>
        {synonym && <div className="muted pd-name-syn">{L.synonym} <span data-source-text="">{synonym}</span></div>}
        <div className="muted pd-msds-count">
          {loading ? L.loadingMsds
            : sections?.length ? L.msdsCount(sections.length)
            : selected?.has_msds ? L.msdsPending
            : L.msdsNone}
        </div>
        <div className="pd-hazard-chips">
          {isFlammable && <Chip tone="chip hazard"><span className="dot" />{L.flammable}</Chip>}
          {isIrritant && <Chip tone="chip hazard"><span className="dot" />{L.irritant}</Chip>}
          {!isFlammable && !isIrritant && hazardText && <Chip tone="chip hazard"><span className="dot" />{L.hazard}</Chip>}
          {selected?.has_msds && <Chip tone="chip safe"><span className="dot" />{L.msdsAvailable}</Chip>}
        </div>
        <a className="detail-open-link" href={`/chemical/${selected?.chem_id}`}>
          <Icon name="ext" size={13} /> {L.openFull}
        </a>
        <FeedbackReportLink selected={selected} />
        <CalcSubstanceLink selected={selected} sections={sections} />
        <CalcFluidLink selected={selected} />
        <GhsLabelLink selected={selected} />
      </div>
      <div className="stats-mini">
        <div>
          <div className="m">{L.stats.msds.m}</div>
          <div className="v tnum">{sections?.length || 0}<span className="unit pd-stat-unit">/16</span></div>
          <div className="muted pd-stat-sub">{L.stats.msds.sub}</div>
        </div>
        <div>
          <div className="m">{L.stats.cas.m}</div>
          <div className="v tnum mono pd-stat-sm">{selected?.cas_no || "—"}</div>
          <div className="muted pd-stat-sub">{L.stats.cas.sub}</div>
        </div>
        <div>
          <div className="m">{L.stats.source.m}</div>
          <div className="v pd-stat-sm">{selected?.source || "—"}</div>
          <div className="muted pd-stat-sub">{L.stats.source.sub}</div>
        </div>
        <div>
          <div className="m">{L.stats.status.m}</div>
          <ChemStatusValue loading={loading} error={error} hasSections={Boolean(sections?.length)} />
          <div className="muted pd-stat-sub">{!sections?.length && !loading && !error ? L.stats.status.subNoMsds : L.stats.status.sub}</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ChemHeader });
