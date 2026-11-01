// 해외 규제 탭 — 미국: NIOSH 노출기준, EPA CompTox.
// 문구: PRODUCT_LABELS.regulation. 스타일: product_detail.css.

function NioshPanel({ intel, niosh }) {
  const G = PRODUCT_LABELS.regulation;
  const rows = niosh.data || [];
  return (
    <div className="panel pd-stack">
      <h3><b><Abbr code="NIOSH" /> {G.niosh}</b> <span className="muted">{intelMeta(intel, G.recs(niosh.total || rows.length))}</span></h3>
      <div className="body">
        <IntelPending intel={intel} />
        {intelReady(intel) && rows.length === 0 && <div className="muted pd-note">{G.noNiosh}</div>}
        {rows.slice(0, 3).map((it, i) => (
          <div key={i} className="pd-list-item">
            <b className="pd-item-title">{it.name || "—"}</b>
            {it.cas && <span className="muted mono pd-meta"> · {it.cas}</span>}
            <div className="muted pd-item-line">{G.nioshLimits(it.rel || "—", it.pel || "—", it.idlh || "—")}</div>
            {it.target_organs && <div className="muted pd-item-sub">{G.targetOrgans(it.target_organs)}</div>}
            {it.carcinogen && <span className="chip hazard pd-chip-tag">{G.carcinogen}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompToxPanel({ intel, comptox }) {
  const G = PRODUCT_LABELS.regulation;
  const rows = comptox.data || [];
  const noKey = comptox.available === false;
  return (
    <div className="panel pd-stack">
      <h3><b><Abbr code="CompTox" /></b> <span className="muted">{intelMeta(intel, noKey ? G.comptoxNoKeyShort : G.recs(comptox.total || rows.length))}</span></h3>
      <div className="body">
        <IntelPending intel={intel} />
        {noKey && <div className="muted pd-note">{comptox.message || G.comptoxNoKey}</div>}
        {intelReady(intel) && !noKey && rows.length === 0 && <div className="muted pd-note">{G.noComptox}</div>}
        {rows.slice(0, 3).map((it, i) => (
          <div key={i} className="row">
            <div className="k mono pd-k-xs">{it.dtxsid || "—"}</div>
            <div className="v pd-v-sm">{it.preferredName || it.preferred_name || it.name || "—"}{it.casrn && <span className="muted"> · {it.casrn}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { NioshPanel, CompToxPanel });
