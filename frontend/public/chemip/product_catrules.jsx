// 물질 상세 아래 패널 "분류로 걸리는 규제"(섹션 id="catrules", ?anchor=catrules) — 이름 목록이 아니라 GHS 분류·인화점·폭발 한계로
// 정해지는 규정(한국 PSM 별표 13 제1·2호·산안규칙 별표 9·위험물, 미국 OSHA PSM (a)(1)(ii), EU Seveso III 부록 I 1부). 참고용.
// 자료 훅 useCategoryRules(api_catrules.jsx), 판정 catEvaluate(catrule_core.jsx), 자료 CATRULE_DATA·APL_PSM·APL_HAZMAT,
// 문구 CATRULE_LABELS(catrule_labels*.jsx). 스타일은 국가별 규제 패널과 같은 클래스(product_detail.css .pd-reg-*).

const CATRULE_TONES = { applies: "accent", check: "hazard", named: "", msds: "" };
const CATRULE_JUR_ORDER = ["KR", "US", "EU"];

function catruleTitle(r) {
  const T = CATRULE_LABELS.titles;
  if (r.src === "kr_b9") return T.b9(r.ref);
  if (r.key.startsWith("seveso_") && r.key !== "seveso_named") return T.seveso(r.ref);
  return T[r.key] ? T[r.key](r.ref) : r.key;
}

function catruleQty(r) {
  const Q = CATRULE_LABELS.qty;
  if (r.key === "kr_psm_gas" || r.key === "kr_psm_liquid") return Q.kr_psm_flam(r.ref);
  if (r.src === "kr_b9") return Q.b9(r.ref);
  if (r.key.startsWith("seveso_") && r.key !== "seveso_named") return Q.seveso(r.ref);
  return Q[r.key] ? Q[r.key](r.ref) : "";
}

function catruleNote(k) {
  const n = CATRULE_LABELS.notes[k];
  return typeof n === "function" ? n() : n || "";
}

function CatruleRow({ r }) {
  const L = CATRULE_LABELS;
  const src = CATRULE_DATA.sources[r.src];
  const basis = r.basis.map(b => (L.basis[b.k] ? L.basis[b.k](b.v) : "")).filter(Boolean);
  return (
    <div className="pd-reg-group">
      <div className="pd-reg-group-head">
        <b>{catruleTitle(r)}</b>
        <Badge tone={CATRULE_TONES[r.status]}>{L.status[r.status]}</Badge>
      </div>
      <div className="pd-reg-entry tnum">{catruleQty(r)}</div>
      {basis.map((t, i) => <div key={i} className="pd-reg-entry muted">{t}</div>)}
      {r.notes.map(k => catruleNote(k)).filter(Boolean).map((t, i) => <div key={`n${i}`} className="pd-reg-entry muted pd-mini">{t}</div>)}
      {src && (
        <div className="muted pd-reg-group-foot">
          {tr(src.ko, src.en)} · <a href={src.url} target="_blank" rel="noopener" title={src.lic}>{L.source}</a>
        </div>
      )}
    </div>
  );
}

function CatruleClpLine({ clp, atp, oldEu }) {
  const L = CATRULE_LABELS;
  return (
    <div className="pd-reg-entry muted pd-mini">
      {clp && clp.length ? L.clpLine(clp.map(h => catHazardName(h, "clp")), atp) : L.clpNone}
      {oldEu && <div>{L.oldEuNote}</div>}
    </div>
  );
}

function CategoryRulesPanel({ selected, sections, loading: detailLoading }) {
  const ref = React.useRef(null);
  const inView = useInView(ref);
  const cas = selected?.cas_no || "";
  const { data, loading, error } = useCategoryRules(cas, sections, !detailLoading, inView);
  const L = CATRULE_LABELS;
  const ST = PRODUCT_LABELS.status;
  const rules = data ? catEvaluate(data.input) : [];
  const meta = !cas ? ST.noCas : !inView ? ST.scrollToLoad : loading ? L.metaLoading : error ? ST.error(error) : L.meta(rules.length);
  const byJur = CATRULE_JUR_ORDER.map(j => [j, rules.filter(r => r.jur === j)]).filter(([, xs]) => xs.length);

  return (
    <section ref={ref} id="catrules" className="pd-lower">
      <SectionHeading t={L.heading} meta={meta} />
      {!cas && <div className="card pd-lower-empty">{L.noCas}</div>}
      {inView && !loading && error && <ErrorState message={error} card />}
      {data && (
        <div className="panel">
          <div className="body">
            <div className="muted pd-mini">{L.intro}</div>
            <CatruleClpLine clp={data.clp} atp={data.atp} oldEu={data.msdsOldEu} />
            {!rules.length && <EmptyState>{L.none}</EmptyState>}
            {byJur.map(([j, xs]) => (
              <div key={j}>
                <h4 className="pd-reg-group-head">{jurisdictionLabel(j)}</h4>
                {xs.map(r => <CatruleRow key={r.key} r={r} />)}
              </div>
            ))}
            <div className="muted pd-foot-note-sm">
              {L.disclaimer} <a className="pd-link-xs" href="?view=applicability">{L.calcLink}</a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

Object.assign(window, { CATRULE_TONES, catruleTitle, catruleQty, CategoryRulesPanel });
