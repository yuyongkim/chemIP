// Mobile view — three phones showcasing key screens

function MobileBoard() {
  return (
    <div className="mobile-stage">
      <div className="mobile-board">
        <div>
          <div className="phone"><div className="notch" /><div className="phone-screen"><MobileSearch /></div></div>
          <div className="phone-label">01 · SEARCH · 검색</div>
        </div>
        <div>
          <div className="phone"><div className="notch" /><div className="phone-screen"><MobileChemical /></div></div>
          <div className="phone-label">02 · CHEMICAL DETAIL · 상세</div>
        </div>
        <div>
          <div className="phone"><div className="notch" /><div className="phone-screen"><MobileAI /></div></div>
          <div className="phone-label">03 · AI ANALYSIS · 분석</div>
        </div>
      </div>
    </div>
  );
}

function MStatus() {
  return (
    <>
      <div className="m-statusbar"><span>9:41</span><span>●●●●● 5G</span></div>
    </>
  );
}

function MTabbar({ cur = "search" }) {
  const tabs = [
    { k: "search", l: "SRCH" },
    { k: "chem", l: "CHEM" },
    { k: "trade", l: "TRD" },
    { k: "drug", l: "DRG" },
    { k: "me", l: "ME" },
  ];
  return (
    <div className="m-tabbar">
      {tabs.map(t => <button key={t.k} aria-current={cur === t.k ? "page" : undefined}><div className="ic" /><span>{t.l}</span></button>)}
    </div>
  );
}

function MobileSearch() {
  return (
    <>
      <div>
        <MStatus />
        <div className="m-topbar">
          <div className="brand"><div className="mark">Ch</div><span>ChemIP</span></div>
          <div />
          <Icon name="settings" size={16} style={{ color: "var(--fg-muted)" }} />
        </div>
      </div>
      <div className="m-body">
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 4 }}>
          통합<br />화학 검색
        </div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Chemical · patent · trade · drug</div>
        <div className="m-search">
          <Icon name="search" size={16} style={{ color: "var(--fg-subtle)" }} />
          <input defaultValue="아세톤" />
          <Icon name="close" size={14} style={{ color: "var(--fg-subtle)" }} />
        </div>

        <div className="m-section"><span>최근 · RECENT</span><span>CLEAR</span></div>
        {[
          { t: "아세톤", s: "CAS 67-64-1 · Acetone", c: "chem" },
          { t: "acetaminophen", s: "MFDS 20080245 · Tylenol", c: "drug" },
          { t: "HS 2914.11", s: "Vietnam · India · Indonesia", c: "trade" },
          { t: "LG Chem solvent", s: "KIPRIS · 42 results", c: "pat" },
        ].map(r => (
          <div key={r.t} className="m-card" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center" }}>
            <div>
              <div className="t">{r.t}</div>
              <div className="k">{r.s}</div>
            </div>
            <Chip>{r.c.toUpperCase()}</Chip>
          </div>
        ))}

        <div className="m-section"><span>카테고리 · BROWSE</span><span>ALL →</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { ic: "atom", t: "Chemical", k: "48,132" },
            { ic: "doc", t: "Patents", k: "KR · US · EP · JP" },
            { ic: "globe", t: "Trade", k: "6 countries" },
            { ic: "pill", t: "Drugs", k: "MFDS + FDA" },
          ].map(c => (
            <div key={c.t} className="m-card" style={{ padding: "14px 14px" }}>
              <Icon name={c.ic} size={18} style={{ color: "var(--accent)" }} />
              <div className="t" style={{ marginTop: 10 }}>{c.t}</div>
              <div className="k">{c.k}</div>
            </div>
          ))}
        </div>
      </div>
      <MTabbar cur="search" />
    </>
  );
}

function MobileChemical() {
  return (
    <>
      <div>
        <MStatus />
        <div className="m-topbar">
          <Icon name="chev" size={18} style={{ transform: "rotate(180deg)" }} />
          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600 }}>Acetone · 아세톤</div>
          <Icon name="plus" size={18} />
        </div>
      </div>
      <div className="m-body">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: ".08em" }}>CAS 67-64-1 · EC 200-662-2</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "-0.035em", lineHeight: 1, margin: "6px 0 4px" }}>Acetone</div>
        <div className="muted" style={{ fontSize: 13 }}>(CH₃)₂CO · 아세톤 · propan-2-one</div>
        <div style={{ display: "flex", gap: 6, margin: "12px 0", flexWrap: "wrap" }}>
          <Chip tone="chip hazard"><span className="dot" />FLAMMABLE</Chip>
          <Chip tone="chip hazard"><span className="dot" />EYE IRRITANT</Chip>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-elevated)" }}>
          {[
            { l: "Patents", v: "248" },
            { l: "Trade", v: "$297M" },
            { l: "Guides", v: "11" },
            { l: "AI", v: "0.86" },
          ].map((m, i) => (
            <div key={m.l} style={{ padding: "10px 8px", borderRight: i < 3 ? "1px solid var(--border)" : 0, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{m.l}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 2 }}>{m.v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: "1px solid var(--border)" }}>
          {["MSDS", "Patents", "Market", "AI"].map((t, i) => (
            <button key={t} style={{ flex: 1, padding: "10px 0", fontSize: 13, borderBottom: i === 0 ? "2px solid var(--fg)" : "2px solid transparent", color: i === 0 ? "var(--fg)" : "var(--fg-muted)", marginBottom: -1 }}>{t}</button>
          ))}
        </div>

        <div className="m-section"><span>§ 02 HAZARDS</span><span>⚠ REVIEW</span></div>
        <div className="m-card">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div className="picto" style={{ width: 34, height: 34 }}><span style={{ fontSize: 7 }}>GHS<br />02</span></div>
            <div className="picto" style={{ width: 34, height: 34 }}><span style={{ fontSize: 7 }}>GHS<br />07</span></div>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
            <b style={{ color: "var(--fg)" }}>H225</b> Highly flammable liquid · 고인화성 액체<br />
            <b style={{ color: "var(--fg)" }}>H319</b> Serious eye irritation · 심한 눈 자극<br />
            <b style={{ color: "var(--fg)" }}>H336</b> Drowsiness / dizziness · 졸음·현기증
          </div>
        </div>

        <div className="m-section"><span>PHYSICAL · 물리화학</span></div>
        <div className="m-card" style={{ padding: 0 }}>
          {[
            ["BP", "56.05 °C"], ["FLASH", "−20 °C"], ["DENSITY", "0.791 g/mL"], ["KOSHA TWA", "500 ppm"],
          ].map(([k, v], i) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "100px 1fr", padding: "10px 14px", borderTop: i === 0 ? 0 : "1px solid var(--border)", fontSize: 12 }}>
              <span className="mono muted">{k}</span><span className="mono">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <MTabbar cur="chem" />
    </>
  );
}

function MobileAI() {
  return (
    <>
      <div>
        <MStatus />
        <div className="m-topbar">
          <Icon name="chev" size={18} style={{ transform: "rotate(180deg)" }} />
          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600 }}>AI Analysis</div>
          <Icon name="ext" size={16} />
        </div>
      </div>
      <div className="m-body">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Icon name="spark" size={14} style={{ color: "var(--accent)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent-ink)", letterSpacing: ".08em" }}>EVIDENCE-BASED SUMMARY</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>confidence 0.86</span>
          <div style={{ flex: 1, marginLeft: 10, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: "86%", height: "100%", background: "var(--accent)" }} />
          </div>
        </div>

        <div className="m-card" style={{ background: "linear-gradient(180deg, var(--accent-soft), var(--bg-elevated))" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "-0.01em", marginBottom: 10 }}>Safety & supply · acetone</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--fg)" }}>
            Acetone is a <b>highly flammable</b> industrial solvent (FP −20 °C)<sup style={{ color: "var(--accent-ink)", fontFamily: "var(--font-mono)", fontSize: 9 }}>[1]</sup>.
            KOSHA TWA (500 ppm) is <b>tighter than OSHA</b> (1,000 ppm)<sup style={{ color: "var(--accent-ink)", fontFamily: "var(--font-mono)", fontSize: 9 }}>[2]</sup>.
            Patent activity concentrates on solvent-recovery<sup style={{ color: "var(--accent-ink)", fontFamily: "var(--font-mono)", fontSize: 9 }}>[3]</sup>.
            VN/IN trade flow is up YoY<sup style={{ color: "var(--accent-ink)", fontFamily: "var(--font-mono)", fontSize: 9 }}>[4]</sup>.
          </div>
        </div>

        <div className="m-section"><span>SOURCES · 출처</span><span>7 cited</span></div>
        {[
          { n: 1, k: "KOSHA", t: "MSDS § 09 Physical" },
          { n: 2, k: "KOSHA", t: "OEL table 2025-rev" },
          { n: 3, k: "KIPRIS", t: "assignee aggregate" },
          { n: 4, k: "KOTRA", t: "Q1 2026 flow summary" },
        ].map(s => (
          <div key={s.n} className="m-card" style={{ display: "grid", gridTemplateColumns: "auto 60px 1fr", gap: 10, alignItems: "center", padding: "10px 12px" }}>
            <span className="mono muted" style={{ fontSize: 10 }}>[{s.n}]</span>
            <Chip>{s.k}</Chip>
            <span style={{ fontSize: 12 }}>{s.t}</span>
          </div>
        ))}

        <div className="m-section"><span>ASK · 질문</span></div>
        <div className="m-card" style={{ padding: 0 }}>
          {["What are storage incompatibilities?", "베트남 규제 변경?", "Compare OSHA / KOSHA limits."].map((q, i) => (
            <div key={q} style={{ padding: "12px 14px", borderTop: i === 0 ? 0 : "1px solid var(--border)", fontSize: 12.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{q}</span>
              <Icon name="chev" size={14} style={{ color: "var(--fg-subtle)" }} />
            </div>
          ))}
        </div>
      </div>
      <MTabbar cur="chem" />
    </>
  );
}

Object.assign(window, { MobileBoard });
