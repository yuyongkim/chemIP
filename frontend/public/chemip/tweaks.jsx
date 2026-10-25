// 표시 설정 패널(테마·강조색·글꼴 등). 문구는 app_labels.jsx

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "blue",
  "type": "default",
  "density": "default",
  "layout": "2col",
  "dataviz": "spark",
  "showGrid": true,
  "showChips": true,
  "mobileFrames": true,
  "banner": true
}/*EDITMODE-END*/;

// 문구는 APP_LABELS.tweakPanel(app_labels.jsx). 여기는 값과 배치만 둔다.
const TWEAK_TEXT = APP_LABELS.tweakPanel;
const TWEAK_ON_OFF = [[true, TWEAK_TEXT.options.on], [false, TWEAK_TEXT.options.off]];
const tweakOpts = (vals) => vals.map(v => [v, TWEAK_TEXT.options[v]]);
const TWEAK_SCHEMA = [
  { key: "theme", options: tweakOpts(["light", "dark"]) },
  { key: "accent", options: tweakOpts(["blue", "indigo", "teal", "copper", "mono"]), cols: 5 },
  { key: "type", options: [["default", TWEAK_TEXT.options.default], ["serif", TWEAK_TEXT.options.serif], ["mono", TWEAK_TEXT.options.monoType], ["korean", TWEAK_TEXT.options.korean]], cols: 4 },
  { key: "density", options: tweakOpts(["compact", "default", "comfy"]), cols: 3 },
  { key: "layout", options: tweakOpts(["2col", "3col", "wide"]), cols: 3 },
  { key: "dataviz", options: tweakOpts(["spark", "heat", "bar"]), cols: 3 },
  { key: "banner", options: TWEAK_ON_OFF, cols: 2 },
  { key: "showGrid", options: TWEAK_ON_OFF, cols: 2 },
  { key: "mobileFrames", options: TWEAK_ON_OFF, cols: 2 },
].map(g => ({ ...g, label: TWEAK_TEXT.groups[g.key] }));

function applyTweaks(t) {
  const r = document.documentElement;
  if (t.theme === "dark") r.setAttribute("data-theme", "dark"); else r.removeAttribute("data-theme");
  if (t.accent !== "blue") r.setAttribute("data-accent", t.accent); else r.removeAttribute("data-accent");
  if (t.type !== "default") r.setAttribute("data-type", t.type); else r.removeAttribute("data-type");
  if (t.density !== "default") r.setAttribute("data-density", t.density); else r.removeAttribute("data-density");
}

function useTweaks() {
  const [t, setT] = useState(() => {
    try { return { ...TWEAK_DEFAULTS, ...(JSON.parse(localStorage.getItem("chemip-tweaks") || "{}")) }; }
    catch { return { ...TWEAK_DEFAULTS }; }
  });
  useEffect(() => {
    applyTweaks(t);
    localStorage.setItem("chemip-tweaks", JSON.stringify(t));
  }, [t]);
  const update = (edits) => setT(prev => {
    const next = { ...prev, ...edits };
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*"); } catch(e){}
    return next;
  });
  return [t, update];
}

function TweaksPanel({ tweaks, setTweak, onClose }) {
  return (
    <div className="tweaks-panel">
      <h3>
        <b>{TWEAK_TEXT.title}</b>
        <button onClick={onClose} style={{ color: "var(--fg-muted)" }}><Icon name="close" size={14} /></button>
      </h3>
      {TWEAK_SCHEMA.map(g => (
        <div key={g.key} className="tweak-group">
          <div className="tweak-label">
            <span>{g.label}</span>
            <span className="mono">{(g.options.find(([v]) => v === tweaks[g.key]) || [])[1] || String(tweaks[g.key])}</span>
          </div>
          <div className={`tweak-row ${g.cols ? `cols-${g.cols}` : ""}`}>
            {g.options.map(([val, lbl]) => (
              <button
                key={String(val)}
                aria-pressed={tweaks[g.key] === val}
                onClick={() => setTweak({ [g.key]: val })}
              >
                {g.key === "accent" && (
                  <span className="tweak-swatch" style={{
                    background: val === "blue" ? "oklch(0.52 0.18 250)"
                      : val === "indigo" ? "oklch(0.52 0.18 275)"
                      : val === "teal" ? "oklch(0.58 0.14 195)"
                      : val === "copper" ? "oklch(0.60 0.14 48)"
                      : "oklch(0.28 0.01 250)"
                  }} />
                )}
                {lbl}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-subtle)", borderTop: "1px solid var(--border)" }}>
        {TWEAK_TEXT.footnote}
      </div>
    </div>
  );
}

Object.assign(window, { useTweaks, TweaksPanel, applyTweaks, TWEAK_DEFAULTS });
