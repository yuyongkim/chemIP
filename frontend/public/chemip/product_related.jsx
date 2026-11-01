// 물질 상세 · "관련 물질" 절 — 같은 규제 목록·GHS 유해성·계열인 물질 상위 8개와 이유(rel/<CAS>.json, 화면에 다가오면 요청).
// 자료: api_discovery.jsx useRelatedSubstances, 이름·이유: product_related_helpers.jsx, 문구: RELATED_LABELS, 스타일: product_detail.css(.pd-rel-*).
// 자료가 없으면(파일 없음·CAS 없음·오류) 절 전체를 보이지 않는다.

function RelatedSubstanceCard({ item }) {
  const L = RELATED_LABELS;
  const names = relatedNames(item, CHEMIP_LANG);
  const enNames = typeof REG_LIST_ENGLISH_NAMES !== "undefined" ? REG_LIST_ENGLISH_NAMES : null;
  const reasons = relatedReasons(item, L, CHEMIP_LANG, enNames);
  return (
    <li className="pd-rel-item">
      <a className="pd-rel-link" href={landingSubstanceHref(item.cas)}>
        <span className="pd-rel-name">{names.main}</span>
        {names.sub && <span className="pd-rel-sub">{names.sub}</span>}
        <span className="kbd pd-rel-cas">{item.cas}</span>
      </a>
      <ul className="pd-rel-why">
        {reasons.map((r, i) => (
          <li key={i} className={`pd-rel-why-${r.t}`} title={L.why[r.t] || ""}>{r.text}</li>
        ))}
      </ul>
    </li>
  );
}

function RelatedSubstancesPanel({ selected }) {
  const ref = React.useRef(null);
  const inView = useInView(ref);
  const cas = selected?.cas_no || "";
  const { data } = useRelatedSubstances(cas, inView);
  const items = (data && data.items) || [];
  return (
    <section ref={ref} id="related" className="pd-lower pd-rel">
      {items.length > 0 && (
        <>
          <SectionHeading t={{ ko: RELATED_LABELS_KO.title, en: RELATED_LABELS_EN.title }} meta={RELATED_LABELS.lede} />
          <ul className="pd-rel-list">
            {items.map(it => <RelatedSubstanceCard key={it.cas} item={it} />)}
          </ul>
          <p className="pd-rel-source">{RELATED_LABELS.source}</p>
        </>
      )}
    </section>
  );
}

Object.assign(window, { RelatedSubstancesPanel, RelatedSubstanceCard });
