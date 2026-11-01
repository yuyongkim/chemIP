// 상세 탭 "시장·뉴스" — KOTRA 무역 뉴스(KOTRA 자료만), 아래 네이버 검색결과(naver_results.jsx, 별도 출처),
// 옆에 검색어·사용한 API. 문구: PRODUCT_LABELS.market. 스타일: product_detail.css.

function KotraNewsRow({ n, terms }) {
  const title = n.newsTitl || n.title || n.titleNm || "—";
  const date = (n.newsWrtDt || n.regDate || "").slice(0, 16);
  const summary = (n.cntntSumar || n.newsBdt || n.summary || "").slice(0, 200);
  return (
    <div className="pd-news-row">
      <Chip tone="chip accent">KOTRA</Chip>
      <div>
        <b className="pd-news-title"><Highlight text={title} terms={terms} /></b>
        {summary && <div className="muted pd-news-sum"><Highlight text={summary} terms={terms} /></div>}
      </div>
      <div className="mono muted pd-meta">{date}</div>
    </div>
  );
}

function MarketTab({ selected }) {
  const K = PRODUCT_LABELS.market;
  const ST = PRODUCT_LABELS.status;
  // Use both English and Korean names for best Naver news coverage
  const enKey = selected?.name_en || selected?.name || "";
  const krKey = selected?.name || enKey;
  const kotra = useTradeNews(enKey);

  // KOTRA 블록에는 KOTRA 자료만. NAVER 결과는 아래 NaverResultsPanel(naver_results.jsx)이 따로 보인다.
  const kotraItems = (kotra.data?.data || kotra.data?.items || []).filter(n => n && n.source !== "naver");
  const hlTerms = React.useMemo(() => highlightTerms([enKey, krKey, selected?.cas_no]), [enKey, krKey, selected?.cas_no]);

  return (
    <div className="layout-2col">
      <div>
        <div className="panel">
          <PanelTitle t={K.kotra}>
            <span className="muted">
              {kotra.loading ? ST.loading : kotra.error ? ST.error(kotra.error) : K.items(kotraItems.length)}
            </span>
          </PanelTitle>
          <div className="body pd-flush">
            {kotraItems.length === 0 && !kotra.loading && !kotra.error && (
              <div className="pd-flush-empty">{K.kotraNone(enKey)}</div>
            )}
            {kotraItems.slice(0, 8).map((n, i) => <KotraNewsRow key={i} n={n} terms={hlTerms} />)}
          </div>
        </div>

        <NaverResultsPanel query={krKey} />
      </div>

      <aside>
        <div className="panel">
          <PanelTitle t={K.source} />
          <div className="body">
            <div className="row"><div className="k">{K.rows.kr}</div><div className="v">{selected?.name || "—"}</div></div>
            <div className="row"><div className="k">{K.rows.en}</div><div className="v">{selected?.name_en || "—"}</div></div>
            <div className="row"><div className="k">{K.rows.cas}</div><div className="v mono">{selected?.cas_no || "—"}</div></div>
            <div className="row"><div className="k">{K.rows.id}</div><div className="v mono">{selected?.chem_id || "—"}</div></div>
          </div>
        </div>
        <div className="panel pd-stack">
          <PanelTitle t={K.endpoints} />
          <div className="body">
            <div className="row"><div className="k">KOTRA</div><div className="v mono pd-v-xs">/trade/news?q={enKey}</div></div>
            <div className="row"><div className="k">{K.naver.ko}</div><div className="v mono pd-v-xs">/trade/naver-news?q={krKey}</div></div>
            <div className="row"><div className="k">PRICES</div><div className="v muted pd-v-xs">{K.pricesNote}</div></div>
            <div className="row"><div className="k">FRAUD</div><div className="v muted pd-v-xs">{K.fraudNote}</div></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

Object.assign(window, { MarketTab });
