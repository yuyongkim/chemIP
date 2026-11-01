// 상단 바의 통합 검색 — 넓은 화면(1280px 이상)은 작은 검색창, 폰 폭(900px 이하)은 돋보기 단추만(누르면 통합 검색 화면).
// 그 사이 폭은 상단 바가 붐벼 숨긴다(product_search.css .us-top).
// 통합 검색 화면에서는 그리지 않는다(화면 안에 큰 검색창이 있다).

function TopbarSearch({ view, setView }) {
  const L = USEARCH_LABELS.topbar;
  const [q, setQ] = useState("");
  if (view === USEARCH_VIEW) return null;
  const submit = (e) => { e.preventDefault(); usearchOpen(q, setView); setQ(""); };
  return (
    <form className="us-top" onSubmit={submit} role="search" aria-label={L.aria}>
      <input className="us-top-input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={L.placeholder} aria-label={L.aria} />
      <button className="btn sm ghost us-top-btn" type="submit" title={L.button} aria-label={L.button}><Icon name="search" size={12} /></button>
    </form>
  );
}

Object.assign(window, { TopbarSearch });
