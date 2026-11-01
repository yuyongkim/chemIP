// 규제 목록 · 목록 하나(머리·원문·라이선스, 목록 안 찾기, 50건씩 쪽). 긴 목록은 보는 쪽의 조각만 받고,
// 찾기를 쓰면 전부 받는다(useRegList, api_reg.jsx). 문구: REG_LABELS.detail.

function RegListDetail({ id, meta, onBack }) {
  const L = REG_LABELS.detail;
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const filtering = Boolean(q.trim());
  const [want, setWant] = useState([]);
  const st = useRegList(id, want);
  const head = st.head || meta || null;
  const parts = st.head?.parts || 1;
  useEffect(() => { setPage(1); }, [id, q]);
  useEffect(() => {
    setWant(filtering ? "all" : (st.head ? regPartsFor(page, REG_PAGE_SIZE, st.head.part_rows, parts) : []));
  }, [filtering, page, st.head, parts]);

  if (!st.loading && !st.head) {
    return (
      <div className="reg-detail">
        <RegBackLink onBack={onBack} />
        {st.error ? <ErrorState message={st.error} card /> : <EmptyState card>{L.notFound(id)}</EmptyState>}
      </div>
    );
  }
  const loaded = regJoinParts(st.partsMap, parts);
  const pool = filtering ? regFilterRows(loaded, q) : loaded;
  const total = filtering ? pool.length : (head?.n || pool.length);
  const sl = regPageSlice(total, page);
  const rows = pool.slice(Math.max(0, sl.from - 1), sl.to);
  const waiting = filtering ? !st.complete && !st.error : st.loading && rows.length < sl.to - sl.from + 1;
  const status = waiting ? (filtering ? L.loadingAll : REG_LABELS.loading)
    : filtering ? L.matched(total.toLocaleString("ko-KR")) : total ? L.shown(sl.from, sl.to, total.toLocaleString("ko-KR")) : "";

  return (
    <div className="reg-detail">
      <RegBackLink onBack={onBack} />
      {head && <RegListHead head={head} license={st.head?.license} />}
      <div className="reg-tools">
        <div className="pv-box reg-box">
          <Icon name="search" size={14} />
          <input className="pv-input" value={q} onChange={e => setQ(e.target.value)} placeholder={L.rowFilter} aria-label={L.rowFilter} />
        </div>
      </div>
      <div className="muted mono reg-mini" aria-live="polite">{status}</div>
      {st.error && <ErrorState message={st.error} />}
      {!waiting && !rows.length && <EmptyState card>{L.noRows}</EmptyState>}
      {rows.length > 0 && <RegRows rows={rows} />}
      <RegPager page={sl.page} pages={sl.pages} onPage={setPage} />
    </div>
  );
}

Object.assign(window, { RegListDetail });
