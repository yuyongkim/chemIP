// Root shell — top bar with view switcher + tweaks

function App() {
  const [view, setView] = useState(() => localStorage.getItem("chemip-app-view") || "landing");
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweak] = useTweaks();

  useEffect(() => { localStorage.setItem("chemip-app-view", view); }, [view]);

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
        {view === "landing" && <Landing setView={setView} />}
        {view === "product" && <Product />}
        {view === "mobile" && <MobileBoard />}
      </main>
      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={() => setTweaksOpen(false)} />}
    </div>
  );
}

function Topbar({ view, setView, tweaksOpen, setTweaksOpen }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="mark">Ch</div>
        <span>ChemIP</span>
        <span className="sub">v0.9.2 · KR/EN</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div className="viewswitch">
          <button aria-pressed={view === "landing"} onClick={() => setView("landing")}>
            <Icon name="layers" size={12} /> Landing
          </button>
          <button aria-pressed={view === "product"} onClick={() => setView("product")}>
            <Icon name="atom" size={12} /> Product
          </button>
          <button aria-pressed={view === "mobile"} onClick={() => setView("mobile")}>
            <Icon name="map" size={12} /> Mobile
          </button>
        </div>
      </div>
      <div className="right">
        <a className="btn sm ghost" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} href="https://github.com/yuyongkim/chemIP" target="_blank" rel="noopener"><Icon name="git" size={12} /> github</a>
        <a className="btn sm" href="https://chemip.yule.pics" target="_blank" rel="noopener"><Icon name="bolt" size={12} /> Live</a>
        <button className={`tweaks-toggle ${tweaksOpen ? "on" : ""}`} onClick={() => setTweaksOpen(v => !v)}>
          <Icon name="settings" size={12} /> Tweaks
        </button>
      </div>
    </header>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app-root"));
root.render(<App />);
