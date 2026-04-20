// Small reusable UI primitives

const { useState, useEffect, useRef, useMemo } = React;

/* Simple SVG icon set — stroke icons, uniform weight */
function Icon({ name, size = 16, stroke = 1.5, style }) {
  const s = size, sw = stroke;
  const props = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", style };
  switch (name) {
    case "search": return (<svg {...props}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>);
    case "atom": return (<svg {...props}><circle cx="12" cy="12" r="1.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>);
    case "flask": return (<svg {...props}><path d="M9 3h6M10 3v6l-5 10a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3L14 9V3"/></svg>);
    case "shield": return (<svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>);
    case "book": return (<svg {...props}><path d="M4 4h9a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4Z"/><path d="M4 16a4 4 0 0 1 4-4h9"/></svg>);
    case "doc": return (<svg {...props}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/></svg>);
    case "globe": return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>);
    case "pill": return (<svg {...props}><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/></svg>);
    case "spark": return (<svg {...props}><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>);
    case "chev": return (<svg {...props}><path d="m9 18 6-6-6-6"/></svg>);
    case "down": return (<svg {...props}><path d="m6 9 6 6 6-6"/></svg>);
    case "plus": return (<svg {...props}><path d="M12 5v14M5 12h14"/></svg>);
    case "close": return (<svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>);
    case "check": return (<svg {...props}><path d="M20 6 9 17l-5-5"/></svg>);
    case "cmd": return (<svg {...props}><path d="M9 9V6a3 3 0 1 0-3 3h3Zm0 0v6m0-6h6m0 0h3a3 3 0 1 1-3 3v-3Zm0 0V9m0 0H9m6 6v3a3 3 0 1 1-3-3h3Zm-6 0H6a3 3 0 1 0 3 3v-3Z"/></svg>);
    case "ext": return (<svg {...props}><path d="M7 17 17 7M7 7h10v10"/></svg>);
    case "settings": return (<svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.4.2.8.4 1.5.4H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>);
    case "bolt": return (<svg {...props}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>);
    case "layers": return (<svg {...props}><path d="m12 2 10 6-10 6L2 8l10-6Z"/><path d="m2 16 10 6 10-6M2 12l10 6 10-6"/></svg>);
    case "git": return (<svg {...props}><circle cx="12" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M12 8v4a4 4 0 0 1-4 4M12 12h4a2 2 0 0 1 2 2v2"/></svg>);
    case "map": return (<svg {...props}><path d="m9 3 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v18M15 5v18"/></svg>);
    default: return (<svg {...props}><rect x="4" y="4" width="16" height="16"/></svg>);
  }
}

/* Tiny SVG sparkline */
function Sparkline({ data, width = 120, height = 28, stroke = "currentColor" }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1;
    const y = height - 2 - ((v - min) / rng) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" />
      <circle cx={pts.split(" ").slice(-1)[0].split(",")[0]} cy={pts.split(" ").slice(-1)[0].split(",")[1]} r="2" fill={stroke} />
    </svg>
  );
}

/* Heatmap: 12 cols × 6 rows, random-but-stable */
function Heatmap({ seed = 1, accent }) {
  const cells = useMemo(() => {
    const out = [];
    let s = seed * 9301 + 49297;
    for (let i = 0; i < 72; i++) {
      s = (s * 9301 + 49297) % 233280;
      out.push(s / 233280);
    }
    return out;
  }, [seed]);
  return (
    <div>
      <div className="heatmap">
        {cells.map((v, i) => (
          <div key={i} className="heat-cell" style={{ background: `color-mix(in oklch, ${accent || "var(--accent)"} ${Math.round(v * 80)}%, var(--bg-sunken))` }} />
        ))}
      </div>
      <div className="heat-legend">
        <span>LOW</span>
        <div className="swatches">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
            <div key={v} className="sw" style={{ background: `color-mix(in oklch, ${accent || "var(--accent)"} ${Math.round(v * 80)}%, var(--bg-sunken))` }} />
          ))}
        </div>
        <span>HIGH</span>
      </div>
    </div>
  );
}

/* Section header */
function SectionHead({ eyebrow, no, title, kicker }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-eyebrow">
          <b>§ {no}</b> <span style={{ marginLeft: 10 }}>{eyebrow}</span>
        </div>
        {kicker && <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)", marginTop: 8, lineHeight: 1.5 }}>{kicker}</div>}
      </div>
      <h2>{title}</h2>
    </div>
  );
}

/* Tiny chip component */
function Chip({ children, tone = "default" }) {
  const cls = tone === "default" ? "chip" : `chip ${tone}`;
  return <span className={cls}>{children}</span>;
}

Object.assign(window, { Icon, Sparkline, Heatmap, SectionHead, Chip });
