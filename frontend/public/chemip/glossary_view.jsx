// 최상위 화면 "용어사전"(?view=glossary&term=&cat=) 셸 — 상태·주소 맞추기·배치만.
// 머리 glossary_toolbar.jsx, 색인 glossary_index_bar.jsx, 항목 glossary_entry.jsx, 자료 GLOSSARY_ENTRIES(glossary_entries.jsx),
// 거르기 glFilter·glLetterCounts(glossary_core.jsx), 찾기 usRankDocs(usearch_core.jsx), 주소 glossary_link.jsx.

function GlossaryView() {
  const L = GLOSSARY_LABELS;
  const [init] = useState(() => glossaryReadLink(location.search));
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(GLOSSARY_CAT_ORDER.includes(init.cat) ? init.cat : "");
  const [exam, setExam] = useState("");
  const [letter, setLetter] = useState("");
  const [open, setOpen] = useState(init.term);
  const [focus, setFocus] = useState(init.term ? `${init.term}#0` : "");
  const known = !init.term || Boolean(glFind(GLOSSARY_ENTRIES, init.term));

  const pool = React.useMemo(() => glFilter(GLOSSARY_ENTRIES, { cat, exam }), [cat, exam]);
  const counts = React.useMemo(() => glLetterCounts(pool), [pool]);
  const catCounts = React.useMemo(() => glCatCounts(glFilter(GLOSSARY_ENTRIES, { exam })), [exam]);
  const searching = Boolean(usCleanQuery(q));
  const shown = React.useMemo(
    () => (searching ? usRankDocs(q, glSearchDocs(pool)) : glFilter(pool, { letter })),
    [pool, q, letter]);

  useEffect(() => { glossarySyncUrl({ term: open, cat }); }, [open, cat]);
  useEffect(() => () => glossarySyncUrl(null), []);

  const toggle = (key) => setOpen(open === key ? "" : key);
  // 관련 용어 단추: 거르기를 풀고 그 용어를 펼쳐 화면 가운데로.
  const jump = (key) => { setQ(""); setCat(""); setExam(""); setLetter(""); setOpen(key); setFocus(`${key}#${Date.now()}`); };
  const focusKey = String(focus || "").split("#")[0];

  return (
    <div className="us-page gl-page">
      <GlossaryToolbar q={q} setQ={setQ} cat={cat} setCat={setCat} exam={exam} setExam={setExam}
        catCounts={catCounts} shown={shown.length} total={GLOSSARY_ENTRIES.length} />
      <div className="us-results">
        {!searching && <GlossaryIndexBar letter={letter} setLetter={setLetter} counts={counts} />}
        {!known && <p className="muted gl-note">{L.notFound(init.term)}</p>}
        {shown.length
          ? <section className="us-group gl-list"><ul className="us-list">{shown.map(e => (
              <GlossaryEntry key={e.key} entry={e} open={open === e.key} onToggle={toggle} onOpen={jump} query={q}
                focus={focusKey === e.key ? focus : ""} />))}</ul></section>
          : <p className="muted gl-note">{L.empty}</p>}
        <p className="muted gl-note">{L.note}</p>
      </div>
    </div>
  );
}

Object.assign(window, { GlossaryView });
