// 최상위 셸 — 상단 바(화면 전환·소스 코드·화면 설정)와 화면 등록 목록(APP_SCREENS). 문구: app_labels.jsx

// Deep links. The papers cite a URL that opens the exact screen they describe:
//   ?view=product&pv=chemical&chem=001008&anchor=handlers
//   ?view=benchmark
//   ?q=벤젠            (shorthand for the search screen)
//   ?view=search&q=LMTD  (통합 검색: 물질·계산기·용어·MSDS 항목·기술지침·화면 — usearch_link.jsx)
//   ?view=board&write=1&cas=71-43-2&name=Benzene   (요청 게시판 글쓰기, CAS 미리 채움)
//   ?view=calc&calc=ppm_mgm3&mw=78.11              (공학 계산기, 칸 값 미리 채움 — calc_link.jsx)

// 화면은 여기에 한 줄씩 등록한다: 상단 전환 버튼(nav: true)과 본문, ?view=<k> 딥링크가 이 목록에서 나온다.
// 이름은 APP_LABELS.screens[k]. nav 가 없는 화면은 parent 화면 버튼이 눌린 상태로 보인다(연구·개발 아래).
const APP_SCREENS = [
  { k: "landing", icon: "layers", nav: true, Component: ({ setView }) => <Landing setView={setView} views={APP_VIEWS} /> },
  { k: "product", icon: "search", nav: true, Component: ({ link }) => <Product initialQuery={link.query} link={link} /> },
  { k: "calc", icon: "flask", nav: true, Component: CalcView },
  { k: "glossary", Component: GlossaryView }, // 용어사전(?view=glossary&term=<key>, glossary_view.jsx) — 통합 검색·화면 바로가기·용어 설명 "?" 로 연다
  { k: "board", icon: "doc", nav: true, Component: FeedbackBoardView },
  { k: "sources", icon: "shield", nav: true, Component: DataSourcesView },
  { k: "dev", icon: "spark", nav: true, Component: DevHubView },
  { k: "research", parent: "dev", Component: ({ setView }) => <Research setView={setView} /> },
  { k: "benchmark", parent: "dev", Component: () => <Benchmark /> },
  { k: "mobile", parent: "dev", Component: () => <MobileBoard /> },
  { k: "reg", Component: RegView }, // 규제 목록·최근 변경·RSS(?view=reg&list=<id>, reg_view.jsx) — 통합 검색·화면 바로가기로 연다
  { k: "prtr", parent: "product", Component: PrtrMapView }, // 취급 사업장 지도(?view=prtr&cas=<CAS>, prtr_map_view.jsx) — 물질 화면 취급 사업장 패널·통합 검색으로 연다
  { k: "ghslabel", parent: "calc", Component: GhsLabelView }, // 경고표지 만들기(?view=ghslabel&chem=<chem_id>, ghs_label_view.jsx) — 물질 머리 링크·통합 검색으로 연다
  { k: "compat", parent: "calc", Component: CompatView }, // 저장 혼촉 매트릭스(?view=compat&cas=CAS1,CAS2, compat_view.jsx) — 계산기 화면 안전 도구 줄·통합 검색으로 연다
  { k: "hazop", parent: "calc", Component: HazopView }, // HAZOP 워크시트 작성기(?view=hazop, hazop_view.jsx) — 계산기 화면 안전 도구 줄·통합 검색으로 연다
  { k: "applicability", parent: "calc", Component: AplView }, // 적용 법규 판정기(?view=applicability, apl_view.jsx) — 계산기 화면 안전 도구 줄·통합 검색으로 연다
  { k: "mixghs", parent: "calc", Component: MixGhsView }, // 혼합물 GHS 분류(?view=mixghs, mixghs_view.jsx) — 계산기 화면 안전 도구 줄·통합 검색으로 연다
  { k: "law", Component: LawView }, // 국내 법령 보기(?view=law&law=<id|이름>&art=<조번호>&q=, law_view.jsx) — 물질 국내 근거 조문 패널·규제 목록·적용 법규 판정기·통합 검색으로 연다
  { k: "feed", Component: IncidentFeedView }, // 화학사고 소식(?view=feed&sub=<물질|CAS>&country=&src=, feed_view.jsx) — 통합 검색으로 연다
  { k: "search", Component: UnifiedSearchView }, // 통합 검색(?view=search&q=, usearch_view.jsx) — 상단 바 검색창으로 연다
];
const APP_VIEWS = APP_SCREENS.map(v => v.k);
function readDeepLink() {
  try {
    const p = new URLSearchParams(window.location.search);
    const q = (p.get("q") || "").trim();
    const view = (p.get("view") || "").trim();
    return {
      query: q,
      view: APP_VIEWS.includes(view) ? view : (q ? "product" : ""),
      productView: (p.get("pv") || "").trim(),
      chem: (p.get("chem") || "").trim(),
      anchor: (p.get("anchor") || "").trim(),
      cas: (p.get("cas") || "").trim(),
      name: (p.get("name") || "").trim(),
      compose: p.get("write") === "1",
      item: (p.get("id") || "").trim(),
    };
  } catch (error) {
    return { query: "", view: "", productView: "", chem: "", anchor: "" };
  }
}

function App() {
  const [link] = useState(readDeepLink);
  // 저장된 화면은 상단 버튼에 있는 화면일 때만 되살린다(예전에 연 모바일 시안 등으로 시작하지 않게).
  const [view, setView] = useState(() => {
    if (link.view) return link.view;
    let saved = "";
    // 같은 탭의 새로고침만 화면을 잇는다. 주소로 새로 들어오면 첫 화면부터 연다(보던 물질은 landing_recent.jsx).
    try { saved = sessionStorage.getItem("chemip-app-view") || ""; } catch (e) {}
    return APP_SCREENS.some(v => v.k === saved && v.nav) ? saved : "landing";
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweak] = useTweaks();

  useEffect(() => { try { sessionStorage.setItem("chemip-app-view", view); } catch (e) {} }, [view]);

  useEffect(() => {
    const h = (e) => {
      if (e?.data?.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e?.data?.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", h);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch(e){}
    return () => window.removeEventListener("message", h);
  }, []);

  return (
    <div className="shell" data-screen-label="ChemIP App">
      <Topbar view={view} setView={setView} tweaksOpen={tweaksOpen} setTweaksOpen={setTweaksOpen} />
      <main>
        {APP_SCREENS.filter(v => v.k === view).map(({ k, Component }) => <Component key={k} link={link} setView={setView} />)}
      </main>
      <FamilyFooter />
      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={() => setTweaksOpen(false)} />}
    </div>
  );
}

function Topbar({ view, setView, tweaksOpen, setTweaksOpen }) {
  const L = APP_LABELS;
  const active = APP_SCREENS.find(v => v.k === view)?.parent || view;
  return (
    <header className="topbar">
      <div
        className="brand is-link"
        role="button"
        tabIndex={0}
        onClick={() => setView("landing")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setView("landing"); }}
        aria-label={L.brandAria}
      >
        <div className="mark">Ch</div>
        <span>ChemIP</span>
        <span className="sub">{L.brandSub}</span>
      </div>
      <div className="topbar-nav-wrap">
        <nav className="viewswitch">
          {APP_SCREENS.filter(v => v.nav).map(v => (
            <button key={v.k} aria-pressed={active === v.k} onClick={() => setView(v.k)} title={tr(L.screenHints[v.k], L.screens[v.k])}>
              <Icon name={v.icon} size={12} /> {L.screens[v.k]}
            </button>
          ))}
        </nav>
      </div>
      <div className="right">
        <TopbarSearch view={view} setView={setView} />
        <FamilySitesMenu />
        <LangSwitch />
        <a className="btn sm ghost" href={LANDING_LABELS.repoUrl} target="_blank" rel="noopener" title="GitHub"><Icon name="git" size={12} /> <span className="topbar-btn-text">{L.sourceCode}</span></a>
        <button className={`tweaks-toggle ${tweaksOpen ? "on" : ""}`} onClick={() => setTweaksOpen(v => !v)} title={L.tweaks}>
          <Icon name="settings" size={12} /> <span className="topbar-btn-text">{L.tweaks}</span>
        </button>
      </div>
    </header>
  );
}
appApplyDocumentMeta(APP_LABELS.meta);
const root = ReactDOM.createRoot(document.getElementById("app-root"));
root.render(<App />);
