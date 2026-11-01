// 물질 상세 · 노출기준 비교 — 나라·기관별 TWA·STEL·C·IDLH 참고값을 출처·기준일과 함께(법적 적합 판정 없음).
// 자료: 정적 oel/<CAS>.json(useOelLimits, api_oel.jsx; 화면에 다가오면 요청). 순수 함수: oel_helpers.jsx. 문구: oel_labels.jsx.
// 하위: OelUnitToggle(단위) · OelTable(표, OelSourceBadge·OelCell) · OelLinks(값 없이 링크만). 스타일: product_detail.css(.pd-oel-*).

function OelPanel({ selected, sections }) {
  const ref = React.useRef(null);
  const inView = useInView(ref);
  const cas = selected?.cas_no || "";
  const { data, loading, error } = useOelLimits(cas, inView);
  const [mode, setMode] = React.useState("source");

  const L = OEL_LABELS;
  const ST = PRODUCT_LABELS.status;
  const groups = oelGroups(data);
  const mw = oelMolarMass(data, sections);
  const vapour = oelIsVapour(data);
  const nSources = new Set(groups.map(g => g.src)).size;
  const statusText = !cas ? ST.noCas : !inView ? ST.scrollToLoad : loading ? ST.loading : error ? ST.error(error) : L.count(nSources);

  return (
    <section ref={ref} id="oel" className="pd-lower">
      <SectionHeading t={L.heading} meta={`${L.sourceNote} · ${statusText}`} />
      {inView && !loading && error && <ErrorState message={error} card />}
      {inView && !loading && data && !groups.length && <EmptyState card>{L.none}</EmptyState>}
      {groups.length > 0 && (
        <>
          <div className="pd-oel-bar">
            <OelUnitToggle mode={mode} setMode={setMode} canConvert={mw > 0} />
            <span className="muted pd-mini">{mw > 0 ? (mode !== "source" ? L.derivedNote(oelFmt(mw)) : "") : L.unitNoMw}</span>
            <a className="mono pd-link-xs" href={calcSubstanceHref(selected, sections)}>{L.calcLink}</a>
          </div>
          <OelTable groups={groups} sources={data.sources || {}} mode={mode} mw={mw} vapour={vapour} />
        </>
      )}
      {data && <OelLinks links={data.links} />}
      {data && (
        <div className="muted pd-foot-note-sm">
          {L.disclaimer}{data.exported_at ? ` ${L.exportedAt(data.exported_at)}` : ""}
        </div>
      )}
    </section>
  );
}

Object.assign(window, { OelPanel });
