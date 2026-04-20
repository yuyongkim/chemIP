// Landing page (marketing)

function Landing() {
  return (
    <>
      <Banner />
      <Hero />
      <StatsStrip />
      <Sources />
      <Workflows />
      <Capabilities />
      <QuickStart />
      <Users />
      <Roadmap />
      <Gaps />
      <Footer />
    </>
  );
}

function Banner() {
  return (
    <div className="banner">
      <span className="dot" />
      <span>v0.9.2 · build passing · 19/19 tests · ready for reviewer mode</span>
      <span className="sep">·</span>
      <span>AGPL-3.0 · self-hostable</span>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div>
          <div className="hero-kicker"><span className="dot" /> CHEMICAL SAFETY · INTELLECTUAL PROPERTY · TRADE INTELLIGENCE</div>
          <h1>
            Nine public data sources.<br />
            One query. <em>Zero portal-hopping.</em>
          </h1>
          <p className="lede">
            <b>ChemIP</b> 는 흩어져 있는 정부 데이터 포털 — KOSHA 안전보건자료, KIPRIS 특허, KOTRA 무역, MFDS 의약품, PubMed 문헌 — 을 단일 질의 워크플로우로 통합합니다. An open-source, self-hostable platform for chemical safety decision-making in privacy-sensitive environments.
          </p>
          <div className="hero-cta">
            <button className="btn primary"><Icon name="bolt" size={14} /> Launch prototype</button>
            <button className="btn"><Icon name="git" size={14} /> Clone repo <span className="kbd">yuyongkim/chemIP</span></button>
            <button className="btn ghost">Read docs <Icon name="ext" size={13} /></button>
          </div>
          <div className="hero-meta">
            <div><b>48,000+</b>substances indexed</div>
            <div><b>16 / 16</b>MSDS sections</div>
            <div><b>4</b>patent jurisdictions</div>
            <div><b>&lt; 5 min</b>reviewer install</div>
          </div>
        </div>
        <div>
          <QueryConsole />
        </div>
      </div>
    </section>
  );
}

function QueryConsole() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 2200); return () => clearInterval(t); }, []);
  const queries = [
    { q: "아세톤", label: "CAS 67-64-1 · 화학물질" },
    { q: "acetaminophen", label: "MFDS + OpenFDA + PubMed" },
    { q: "isopropyl alcohol", label: "KOSHA + KIPRIS + KOTRA" },
  ];
  const cur = queries[tick % queries.length];
  return (
    <div className="query-console">
      <div className="console-head">
        <div className="tl"><span /><span /><span /></div>
        <div style={{ textAlign: "center" }}>chemip — unified query · localhost:7000</div>
        <div>live</div>
      </div>
      <div className="console-body">
        <div><span className="ln-num">01</span><span className="com"># single query fans out to 9 sources</span></div>
        <div><span className="ln-num">02</span><span className="kw">POST</span> /api/chemicals <span className="com">+</span> /patents <span className="com">+</span> /trade</div>
        <div><span className="ln-num">03</span>  <span className="kw">q</span>: <span className="str">"{cur.q}"</span>,</div>
        <div><span className="ln-num">04</span>  <span className="kw">fanout</span>: [<span className="str">"kosha"</span>, <span className="str">"kipris"</span>, <span className="str">"kotra"</span>, <span className="str">"mfds"</span>, <span className="str">"pubmed"</span>]</div>
        <div><span className="ln-num">05</span></div>
        <div><span className="ln-num">06</span><span className="com">→ resolved · {cur.label}</span></div>
        <div><span className="ln-num">07</span>  <span className="kw">msds.sections</span>: 16/16  <span className="com">(cached)</span></div>
        <div><span className="ln-num">08</span>  <span className="kw">patents.kr</span>: 42  <span className="kw">patents.us</span>: 178</div>
        <div><span className="ln-num">09</span>  <span className="kw">trade.countries</span>: 6  <span className="kw">guides</span>: 11</div>
        <div><span className="ln-num">10</span>  <span className="kw">ai.confidence</span>: 0.86  <span className="kw">sources</span>: 7</div>
        <div><span className="ln-num">11</span><span className="cursor" /></div>
      </div>
      <div className="console-foot">
        <span>request-id · 8f3e-2a41</span>
        <span>p99 412 ms · cache hit 71%</span>
        <span>200 OK</span>
      </div>
    </div>
  );
}

function StatsStrip() {
  const stats = [
    { label: "Substances · 화학물질", value: "48,132", unit: "", note: "FTS-indexed in terminology.db" },
    { label: "MSDS Sections · 안전자료", value: "16", unit: "/16", note: "Lazy-fetched via KOSHA on cache miss" },
    { label: "Patent Jurisdictions · 관할권", value: "4", unit: "KR·US·EP·JP", note: "KIPRIS live + USPTO / EPO local index" },
    { label: "Test Coverage · 검증", value: "19", unit: "/19", note: "pytest · KIPRIS live · next build" },
  ];
  return (
    <div className="stats">
      {stats.map(s => (
        <div key={s.label} className="stat">
          <div className="label">{s.label}</div>
          <div className="value tnum">{s.value}<span className="unit">{s.unit}</span></div>
          <div className="note">{s.note}</div>
        </div>
      ))}
    </div>
  );
}

function Sources() {
  return (
    <section className="section">
      <div className="section-inner">
        <SectionHead no="01" eyebrow="DATA FEDERATION" title={<>Nine sources,<br /><em>one federated index.</em></>} kicker="Each source is accessed with its own client, cached locally, and normalized to a shared schema before a unified response is returned." />
        <div className="sources">
          {SOURCES.map(s => (
            <div key={s.code} className="source-cell">
              <div>
                <div className="row1">
                  <div className="code">{s.code}</div>
                  {s.live ? <Chip tone="chip safe"><span className="dot" />LIVE</Chip> : <Chip>LOCAL INDEX</Chip>}
                </div>
                <h3>{s.en}</h3>
                <div className="kr">{s.kr}</div>
                <div className="desc">{s.desc}</div>
              </div>
              <div className="endpoint">→ {s.endpoint}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflows() {
  return (
    <section className="section">
      <div className="section-inner">
        <SectionHead no="02" eyebrow="TYPICAL WORKFLOWS" title={<>Four research paths.<br /><em>Same unified context.</em></>} kicker="Whichever door users enter — a chemical, a patent, a country, or a drug — the rest of the dossier follows them through the session." />
        <div className="workflows">
          {WORKFLOWS.map(w => (
            <div key={w.code} className="workflow">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <h4>{w.name}</h4>
                  <div className="muted" style={{ fontSize: 12 }}>{w.kr}</div>
                </div>
                <span className="chip">{w.code}</span>
              </div>
              <div>
                {w.steps.map((step, i) => (
                  <div key={i} className="step">
                    <span className="n">{String(i + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section className="section">
      <div className="section-inner">
        <SectionHead no="03" eyebrow="CODE-VERIFIED CAPABILITIES" title={<>Every route is shipped.<br /><em>Every stack choice is deliberate.</em></>} kicker="Enumerated from backend/main.py and frontend/app/ — no roadmap promises mixed in." />
        <div className="caps">
          <div>
            <h4><span>BACKEND</span> <b>FastAPI · Python</b></h4>
            {CAPABILITIES_BACKEND.map(r => (
              <div key={r.path} className="route">
                <span className="path">{r.path}</span>
                <span className="muted">{r.desc}</span>
              </div>
            ))}
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Chip>request-id middleware</Chip>
              <Chip>security headers</Chip>
              <Chip>rate-limit (in-memory)</Chip>
              <Chip>summary logging</Chip>
            </div>
          </div>
          <div>
            <h4><span>FRONTEND</span> <b>Next 16 · React 19 · TS</b></h4>
            {CAPABILITIES_FRONTEND.map(r => (
              <div key={r.path} className="route">
                <span className="path">{r.path}</span>
                <span className="muted">{r.desc}</span>
              </div>
            ))}
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Chip>Tailwind CSS 4</Chip>
              <Chip>composition-first</Chip>
              <Chip>app router</Chip>
              <Chip>/api rewrite</Chip>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className="section">
      <div className="section-inner">
        <SectionHead no="04" eyebrow="QUICK START · REVIEWER MODE" title={<>Running in five minutes.<br /><em>No patent DB or LLM required.</em></>} kicker="Local chemical search (48k+ substances), cached MSDS sections, guide recommendations, and the full frontend UI work with zero API keys." />
        <div className="quickstart">
          <div className="qs-col">
            <h5>1 · Clone & install</h5>
            <pre className="terminal"><code>{`git clone https://github.com/yuyongkim/chemIP.git
cd chemIP
pip install -r requirements.txt
cd frontend && npm ci && cd ..`}</code></pre>
          </div>
          <div className="qs-col">
            <h5>2 · Minimal env</h5>
            <pre className="terminal"><code>{`cp .env.example .env
# only two keys needed for basic search:
#   KOSHA_SERVICE_KEY_DECODED
#   KIPRIS_API_KEY
# both free at data.go.kr`}</code></pre>
          </div>
          <div className="qs-col">
            <h5>3 · Run</h5>
            <pre className="terminal"><code>{`python -m uvicorn backend.main:app --port 7010 &
cd frontend && npm run dev -- --port 7000
# open http://localhost:7000`}</code></pre>
          </div>
          <div className="qs-col">
            <h5>4 · Verify</h5>
            <pre className="terminal"><code>{`bash submit_check.sh
# → pytest
# → test_kipris_live.py
# → frontend lint + build
# ✓ 19 passed · ready`}</code></pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function Users() {
  return (
    <section className="section">
      <div className="section-inner">
        <SectionHead no="05" eyebrow="TARGET USERS" title={<>Built for teams that<br /><em>cannot afford to be wrong.</em></>} />
        <div className="users">
          {USERS.map(u => (
            <div key={u.role} className="user-cell">
              <div>
                <div className="role">{u.role}</div>
                <h5 style={{ marginTop: 10 }}>{u.en}</h5>
                <div className="kr">{u.kr}</div>
              </div>
              <ul>
                {u.items.map(it => <li key={it}>· {it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <section className="section">
      <div className="section-inner">
        <SectionHead no="06" eyebrow="EVOLUTION DIRECTION" title={<>Three phases.<br /><em>Honest about what's next.</em></>} />
        <div className="roadmap">
          {PHASES.map(p => (
            <div key={p.n} className={`phase ${p.status === "now" ? "now" : ""}`}>
              <div className="bar" />
              <div className="phase-hd">
                <span className="no">PHASE {p.n}</span>
                <span className={`status ${p.status === "now" ? "now" : ""}`}>{p.status === "now" ? "IN PROGRESS" : p.status === "next" ? "NEXT UP" : "FUTURE"}</span>
              </div>
              <h4>{p.title}</h4>
              <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{p.kr}</div>
              <ul>
                {p.items.map(it => <li key={it}><span>{it}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gaps() {
  return (
    <section className="section">
      <div className="section-inner">
        <SectionHead no="07" eyebrow="KNOWN GAPS" title={<>What this is<br /><em>not (yet).</em></>} kicker="We are allergic to demo-ware. Here is exactly what the code does not do." />
        <div className="gaps">
          {GAPS.map(g => (
            <div key={g.k} className="gap">
              <div className="k">{g.k}</div>
              <div>
                <h5>{g.title}</h5>
                <p>{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="brand" style={{ marginBottom: 12 }}>
            <div className="mark">Ch</div>
            <span>ChemIP</span>
            <span className="sub">v0.9.2</span>
          </div>
          <p className="muted" style={{ fontSize: 13, maxWidth: 360, margin: 0 }}>
            An open-source, self-hostable platform for chemical safety decision-making.
            AGPL-3.0 licensed. Built against nine public data sources.
          </p>
        </div>
        <div>
          <h6>PRODUCT</h6>
          <a>Prototype</a><a>Quick start</a><a>Workflows</a><a>Roadmap</a>
        </div>
        <div>
          <h6>DOCS</h6>
          <a>README (KR)</a><a>Runbook</a><a>Release process</a><a>Data structure</a>
        </div>
        <div>
          <h6>COMMUNITY</h6>
          <a>GitHub ↗</a><a>Contributing</a><a>License</a><a>Security</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 ChemIP contributors · AGPL-3.0</span>
        <span>Built in Seoul · KR · 🇰🇷</span>
      </div>
    </footer>
  );
}

Object.assign(window, { Landing });
