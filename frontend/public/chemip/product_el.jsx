// 물질 상세 · 비상대응 기준 — AEGL(10분~8시간)·PAC Rev. 29(근거 계열·ERPG via DOE PAC)·RIVM probit, 노출기준과 견주기(#oel 링크).
// 자료: 정적 el/<CAS>.json(useEmergencyLimits, api_el.jsx; 화면에 다가오면 요청) + 노출기준 파일(useOelLimits, 같은 캐시).
// 하위: ElAeglTable · ElPacTable · ElProbitLine · ElOelCompare. 문구: el_labels.jsx. 스타일: product_detail.css(.pd-el-*). 앵커 키 el.
// 참고용 스크리닝·사전 검토용 값(법적 판정 없음).

function ElPanel({ selected }) {
  const ref = React.useRef(null);
  const inView = useInView(ref);
  const cas = selected?.cas_no || "";
  const { data, loading, error } = useEmergencyLimits(cas, inView);
  const oel = useOelLimits(cas, inView);
  const L = EL_LABELS;
  const ST = PRODUCT_LABELS.status;
  const file = data && data.file;
  const n = elCount(file);
  const statusText = !cas ? ST.noCas : !inView ? ST.scrollToLoad : loading ? ST.loading : error ? ST.error(error) : L.count(n);
  const name = selected ? chemLocalName(selected) : "";
  const sources = elSourceList(file, data && data.index, L);

  return (
    <section ref={ref} id="el" className="pd-lower">
      <SectionHeading t={L.heading} meta={`${L.sourceNote} · ${statusText}`} />
      {inView && !loading && error && <ErrorState message={error} card />}
      {inView && !loading && !error && data && !n && <EmptyState card>{L.none}</EmptyState>}
      {n > 0 && (
        <>
          <ElAeglTable file={file} />
          <ElPacTable file={file} />
          <ElProbitLine file={file} name={name} />
          <ElOelCompare file={file} oel={oel.data} />
          {file.mw > 0 && <div className="muted pd-mini">{L.unitNote(oelFmt(file.mw))}</div>}
          <div className="muted pd-foot-note-sm">
            {L.disclaimer}{" "}
            {sources.map((s, i) => <span key={s.sid}>{i ? " · " : ""}{s.url ? <SourceLink url={s.url} label={s.name} /> : s.name}</span>)}
            {file.exported_at ? ` · ${L.exportedAt(file.exported_at)}` : ""}
          </div>
        </>
      )}
    </section>
  );
}

Object.assign(window, { ElPanel });
