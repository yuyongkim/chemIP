// 최상위 셸 — 상단 바(화면 전환·소스 코드·화면 설정)와 화면 등록 목록(APP_SCREENS). 문구: app_labels.jsx

// Deep links. The papers cite a URL that opens the exact screen they describe:
//   ?view=product&pv=chemical&chem=001008&anchor=handlers
//   ?view=benchmark
//   ?q=벤젠            (shorthand for the search screen)
//   ?view=board&write=1&cas=71-43-2&name=Benzene   (요청 게시판 글쓰기, CAS 미리 채움)

// 화면은 여기에 한 줄씩 등록한다: 상단 전환 버튼(nav: true)과 본문, ?view=<k> 딥링크가 이 목록에서 나온다.
// 이름은 APP_LABELS.screens[k]. nav 가 없는 화면은 parent 화면 버튼이 눌린 상태로 보인다(연구·개발 아래).
const APP_SCREENS = [
  { k: "landing", icon: "layers", nav: true, Component: ({ setView }) => <Landing setView={setView} /> },
  { k: "product", icon: "search", nav: true, Component: ({ link }) => <Product initialQuery={link.query} link={link} /> },
  { k: "board", icon: "doc", nav: true, Component: FeedbackBoardView },
  { k: "sources", icon: "shield", nav: true, Component: DataSourcesView },
  { k: "dev", icon: "spark", nav: true, Component: DevHubView },
  { k: "research", parent: "dev", Component: ({ setView }) => <Research setView={setView} /> },
  { k: "benchmark", parent: "dev", Component: () => <Benchmark /> },
  { k: "mobile", parent: "dev", Component: () => <MobileBoard /> },
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
    try { saved = localStorage.getItem("chemip-app-view") || ""; } catch (e) {}
    return APP_SCREENS.some(v => v.k === saved && v.nav) ? saved : "landing";
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweak] = useTweaks();

  useEffect(() => { try { localStorage.setItem("chemip-app-view", view); } catch (e) {} }, [view]);

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
        className="brand"
        role="button"
        tabIndex={0}
        onClick={() => setView("landing")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setView("landing"); }}
        style={{ cursor: "pointer" }}
        aria-label={L.brandAria}
      >
        <div className="mark">Ch</div>
        <span>ChemIP</span>
        <span className="sub">{L.brandSub}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <nav className="viewswitch">
          {APP_SCREENS.filter(v => v.nav).map(v => (
            <button key={v.k} aria-pressed={active === v.k} onClick={() => setView(v.k)} title={L.screens[v.k].en}>
              <Icon name={v.icon} size={12} /> {L.screens[v.k].ko}
            </button>
          ))}
        </nav>
      </div>
      <div className="right">
        <a className="btn sm ghost" href={LANDING_LABELS.repoUrl} target="_blank" rel="noopener" title="GitHub"><Icon name="git" size={12} /> <span className="topbar-btn-text">{L.sourceCode}</span></a>
        <button className={`tweaks-toggle ${tweaksOpen ? "on" : ""}`} onClick={() => setTweaksOpen(v => !v)} title={L.tweaks}>
          <Icon name="settings" size={12} /> <span className="topbar-btn-text">{L.tweaks}</span>
        </button>
      </div>
    </header>
  );
}
const root = ReactDOM.createRoot(document.getElementById("app-root"));
root.render(<App />);
