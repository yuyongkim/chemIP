// Tweaks panel

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

const TWEAK_SCHEMA = [
  { key: "theme", label: "Theme · 테마", options: [["light", "Light"], ["dark", "Dark"]] },
  { key: "accent", label: "Accent hue · 강조색", options: [["blue", "Blue"], ["indigo", "Indigo"], ["teal", "Teal"], ["copper", "Copper"], ["mono", "Mono"]], cols: 5 },
  { key: "type", label: "Typography · 타이포", options: [["default", "Sans"], ["serif", "Serif"], ["mono", "Mono"], ["korean", "Pretendard"]], cols: 4 },
  { key: "density", label: "Density · 밀도", options: [["compact", "Compact"], ["default", "Default"], ["comfy", "Comfy"]], cols: 3 },
  { key: "layout", label: "Layout · 레이아웃", options: [["2col", "Split"], ["3col", "3-col"], ["wide", "Wide"]], cols: 3 },
  { key: "dataviz", label: "Dataviz · 차트", options: [["spark", "Sparkline"], ["heat", "Heatmap"], ["bar", "Bars"]], cols: 3 },
  { key: "banner", label: "Announcement bar", options: [[true, "On"], [false, "Off"]], cols: 2 },
  { key: "showGrid", label: "Hero grid rails", options: [[true, "On"], [false, "Off"]], cols: 2 },
  { key: "mobileFrames", label: "Mobile device frames", options: [[true, "On"], [false, "Off"]], cols: 2 },
];

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
        <b>Tweaks</b>
        <button onClick={onClose} style={{ color: "var(--fg-muted)" }}><Icon name="close" size={14} /></button>
      </h3>
      {TWEAK_SCHEMA.map(g => (
        <div key={g.key} className="tweak-group">
          <div className="tweak-label">
            <span>{g.label}</span>
            <span className="mono">{String(tweaks[g.key])}</span>
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
        Persisted to localStorage · host-synced
      </div>
    </div>
  );
}

Object.assign(window, { useTweaks, TweaksPanel, applyTweaks, TWEAK_DEFAULTS });
