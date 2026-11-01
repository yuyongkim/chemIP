// Product prototype — desktop, wired to FastAPI backend via /api/* rewrite
const PRODUCT_VIEWS = ["search", "chemical", "patents", "trade", "drugs", "guides"];

// Default seed chemical so the Chemical view is never empty on first load
const DEFAULT_CHEMICAL = {
  id: 5294,
  chem_id: "001067",
  name: "아세톤 (Acetone)",
  name_en: "Acetone",
  cas_no: "67-64-1",
  source: "KOSHA",
  has_msds: true,
};

function Product({ initialQuery = "", link = {} }) {
  const seededQuery = (initialQuery || "").trim();
  const seededView = PRODUCT_VIEWS.includes(link.productView) ? link.productView : "";
  const [view, setView] = useState(() => seededView || (seededQuery ? "search" : (localStorage.getItem("chemip-view") || "chemical")));
  const [tab, setTab] = useState("msds");
  const [selected, setSelected] = useSelectedChemical();
  useEnglishNameFill(selected, setSelected);
  // ?chem= 으로 연 물질을 찾지 못하면 직전 물질을 말없이 보여 주지 않고 알린다.
  const [linkMissing, setLinkMissing] = useState("");
  // ?chem= 물질을 불러오는 동안에는 직전·기본 물질(아세톤)을 잠깐이라도 보여 주지 않는다.
  const linkChem = (link.chem || "").trim();
  const [linkLoading, setLinkLoading] = useState(() => !!linkChem && selected?.chem_id !== linkChem);

  // ?chem=001008 — hydrate the selection from the API so a deep link lands on the
  // right substance even in a browser that has never visited the site.
  useEffect(() => {
    if (!linkChem || selected?.chem_id === linkChem) { setLinkLoading(false); return; }
    setLinkLoading(true);
    // CAS 로 온 링크는 같은 CAS 의 KOSHA 물질(MSDS 있음)로 연다(resolveLinkChemId, api_chemicals.jsx).
    resolveLinkChemId(linkChem)
      .then(id => fetchChemicalDetail(id).then(d => ({ id, d })))
      .then(({ id, d }) => setSelected({
        chem_id: id,
        name: d.name || id,
        name_en: d.name_en || "",
        cas_no: d.cas_no || "",
        source: d.source || "",
        has_msds: (d.sections || []).length > 0,
      }))
      .catch(() => setLinkMissing(linkChem))
      .finally(() => setLinkLoading(false));
  }, [linkChem]);
  // Top-bar query state — shared between ProductCmd and SearchView.
  // Persist the last query so leaving and returning to Search keeps it.
  const readSavedSearch = () => { try { return localStorage.getItem("chemip-search") || ""; } catch (e) { return ""; } };
  const [pendingQuery, setPendingQuery] = useState(seededQuery || readSavedSearch());
  const [searchQuery, setSearchQuery] = useState(seededQuery || readSavedSearch());
  useEffect(() => { localStorage.setItem("chemip-view", view); }, [view]);
  useEffect(() => { try { localStorage.setItem("chemip-search", searchQuery || ""); } catch (e) {} }, [searchQuery]);
  // First-load default: seed acetone so Chemical/Patents/AI/Guides aren't blank
  useEffect(() => { if (!selected && !linkChem) setSelected(DEFAULT_CHEMICAL); }, []);

  const openChemical = (chem) => { setLinkMissing(""); setLinkLoading(false); setSelected(chem); setView("chemical"); };
  // 상단 경로 표시도 불러오는 중·못 찾음일 때는 직전 물질 이름을 쓰지 않는다.
  const shownSelected = (linkLoading || linkMissing) ? null : selected;
  const submitTopSearch = (q) => {
    const trimmed = (q || "").trim();
    if (!trimmed) return;
    setSearchQuery(trimmed);
    setView("search");
  };

  return (
    <div className="product">
      <ProductRail view={view} setView={setView} />
      <div className="work">
        <ProductCmd
          view={view}
          selected={shownSelected}
          query={pendingQuery}
          setQuery={setPendingQuery}
          onSubmit={() => submitTopSearch(pendingQuery)}
        />
        <div className="frame">
          {/* 링크로 연 물질을 못 찾으면 직전 물질을 보이지 않는다(다른 물질 규제를 이 물질 것으로 오해하지 않게). */}
          {linkMissing && view === "chemical" && (
            <EmptyState card kind="error">
              {UI_COMMON_TEXT.chemNotFound(linkMissing)}{" "}
              <button className="btn" onClick={() => { setLinkMissing(""); setView("search"); }}>{UI_COMMON_TEXT.goSearch}</button>
            </EmptyState>
          )}
          {view === "search" && <SearchView onOpen={openChemical} initialQuery={searchQuery} onQuerySubmit={(term) => { setSearchQuery(term); setPendingQuery(term); }} />}
          {linkLoading && !linkMissing && view === "chemical" && (
            <EmptyState card>{UI_COMMON_TEXT.chemLoading(linkChem)}</EmptyState>
          )}
          {view === "chemical" && !linkMissing && !linkLoading && <ChemicalView tab={tab} setTab={setTab} selected={selected} anchor={link.anchor} />}
          {view === "patents" && <PatentsView selected={selected} />}
          {view === "trade" && <TradeView selected={selected} />}
          {view === "drugs" && <DrugsView />}
          {view === "guides" && <GuidesView selected={selected} />}
        </div>
      </div>
    </div>
  );
}

// 왼쪽 세로 메뉴. 순서·아이콘은 여기, 이름은 PRODUCT_LABELS.rail.
const PRODUCT_RAIL = [
  { k: "search", ic: "search" },
  { k: "chemical", ic: "atom" },
  { k: "patents", ic: "doc" },
  { k: "trade", ic: "globe" },
  { k: "drugs", ic: "pill" },
  { k: "guides", ic: "book" },
];

function ProductRail({ view, setView }) {
  const R = PRODUCT_LABELS.rail;
  return (
    <aside className="rail">
      {PRODUCT_RAIL.map(it => (
        <button key={it.k} aria-current={view === it.k ? "page" : undefined} onClick={() => setView(it.k)} title={R[it.k].en !== R[it.k].ko ? `${R[it.k].ko} · ${R[it.k].en}` : R[it.k].en}>
          <Icon name={it.ic} size={18} />
          <span className="rlabel">{R[it.k].ko}</span>
        </button>
      ))}
      <div className="spacer" />
      <div className="tag">CHEMIP</div>
    </aside>
  );
}

// 경로 끝 물질 이름: 화면 언어의 이름이 먼저, 다른 언어 이름은 " · " 뒤(chemDisplayNames, product_msds_helpers.jsx).
function chemCrumbName(selected) {
  const { primary, secondary } = chemDisplayNames(selected);
  return secondary ? `${primary} · ${secondary}` : primary;
}

function ProductCmd({ view, selected, query, setQuery, onSubmit }) {
  const C = PRODUCT_LABELS.crumbs;
  const chemCrumbs = selected
    ? [C.chemicals, selected.cas_no || selected.chem_id, chemCrumbName(selected)]
    : [C.chemicals, "—", C.none];
  const crumbs = view === "chemical" ? chemCrumbs : (C[view] || []);
  return (
    <div className="cmd">
      <div className="crumbs">
        <Icon name="layers" size={14} />
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span>{i === crumbs.length - 1 ? <b>{c}</b> : c}</span>
            {i < crumbs.length - 1 && <Icon name="chev" size={11} className="crumb-sep" />}
          </React.Fragment>
        ))}
      </div>
      <div className="right">
        <div className="search">
          <Icon name="search" size={14} className="cmd-search-icon" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
            placeholder={PRODUCT_LABELS.cmd.placeholder}
            aria-label={PRODUCT_LABELS.cmd.placeholder}
          />
        </div>
        <button className="btn sm" onClick={onSubmit}><Icon name="search" size={12} /> {PRODUCT_LABELS.cmd.button}</button>
      </div>
    </div>
  );
}

Object.assign(window, { Product });
