// 물질 상세 · 국내 근거 조문 — 이 물질이 오른 국내 목록(kr_lists·NCIS 분류·PSM)의 근거 법령·조문을 법제처 현행 본문 사본에서 보여 주고,
// 조문 글자에 이 물질 이름이 그대로 나오는 곳을 더한다. 정적 law/ 자료라 집 PC 가 꺼져도 열린다(useLawProvisions, 화면에 다가오면 요청).
// 하위: LawBasisList(목록 카드: 할 일 한 줄·역할 칩·접힌 발췌) · LawMentionList(접힌 조문 언급). 문구: LAW_LABELS.panel. 스타일: product_detail.css(.pd-law-*). 앵커 키 kr-law.
// 국내(KR) 근거 조문은 이 패널이 먼저다(오프라인·원문 기반). EPC 법령 검색(product_provisions.jsx)은 해외 규제 지도에서 나라를 고를 때 그대로 남는다.

function KrLawBasisPanel({ selected }) {
  const ref = React.useRef(null);
  const inView = useInView(ref);
  const cas = selected?.cas_no || "";
  const { data, loading, error } = useLawProvisions(cas, inView);
  const P = LAW_LABELS.panel;
  const ST = PRODUCT_LABELS.status;
  const statusText = !cas ? ST.noCas : !inView ? ST.scrollToLoad : loading ? ST.loading : error ? ST.error(error)
    : data ? P.meta(data.lists.length, data.mentionTotal) : "";

  return (
    <section ref={ref} id="kr-law" className="pd-lower">
      <SectionHeading t={P.heading} meta={statusText} />
      {inView && !loading && error && <ErrorState message={error} card />}
      {inView && cas && !loading && !error && !data && <EmptyState card>{P.none}</EmptyState>}
      {data && (
        <div className="panel pd-sub-panel pd-law">
          <div className="body">
            {data.lists.length > 0 && <LawBasisList lists={data.lists} />}
            {data.mentions.length > 0 && <LawMentionList mentions={data.mentions} total={data.mentionTotal} />}
            <div className="muted pd-law-foot">
              <p>{P.disclaimer}</p>
              <p>{P.asOf(data.asOf)} · <a href={lawViewHref("")}>{P.viewer}</a></p>
              <p>{LAW_LABELS.license}</p>
              {LAW_LABELS.langNote && <p>{LAW_LABELS.langNote}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

Object.assign(window, { KrLawBasisPanel });
