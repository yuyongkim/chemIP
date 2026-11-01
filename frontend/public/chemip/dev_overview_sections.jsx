// 개발자용 소개 본문 절 — 데이터 출처, 작업 흐름, 기능 목록, 빠른 시작, 대상 사용자, 로드맵, 알려진 한계.
// 문구: dev_overview_data.jsx(DEV_OVERVIEW.sections). 목록 자료: data.jsx. 스타일: app.css + landing.css(.dvo-*).

function DevSectionHead({ s }) {
  return <SectionHead no={s.no} eyebrow={s.eyebrow} title={<>{s.a}<br /><em>{s.b}</em></>} kicker={s.kicker} />;
}

function Sources() {
  const S = DEV_OVERVIEW.sections.sources;
  return (
    <section className="section">
      <div className="section-inner">
        <DevSectionHead s={S} />
        <div className="sources">
          {SOURCES.map(s => (
            <div key={s.code} className="source-cell">
              <div>
                <div className="row1">
                  <div className="code">{s.code}</div>
                  {s.live ? <Chip tone="chip safe"><span className="dot" />{S.live}</Chip> : <Chip>{S.local}</Chip>}
                </div>
                <h3>{s.en}</h3>
                {DEV_OVERVIEW.showKr && <div className="kr">{s.kr}</div>}
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
    <section className="section" id="workflows">
      <div className="section-inner">
        <DevSectionHead s={DEV_OVERVIEW.sections.workflows} />
        <div className="workflows">
          {WORKFLOWS.map(w => (
            <div key={w.code} className="workflow">
              <div className="dvo-workflow-head">
                <div>
                  <h4>{w.name}</h4>
                  {DEV_OVERVIEW.showKr && <div className="muted dvo-sub">{w.kr}</div>}
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

function CapabilityColumn({ side, routes }) {
  return (
    <div>
      <h4><span>{side.tag}</span> <b>{side.stack}</b></h4>
      {routes.map(r => (
        <div key={r.path} className="route">
          <span className="path">{r.path}</span>
          <span className="muted">{r.desc}</span>
        </div>
      ))}
      <div className="dvo-chips">
        {side.chips.map(c => <Chip key={c}>{c}</Chip>)}
      </div>
    </div>
  );
}

function Capabilities() {
  const S = DEV_OVERVIEW.sections.capabilities;
  return (
    <section className="section">
      <div className="section-inner">
        <DevSectionHead s={S} />
        <div className="caps">
          <CapabilityColumn side={S.backend} routes={CAPABILITIES_BACKEND} />
          <CapabilityColumn side={S.frontend} routes={CAPABILITIES_FRONTEND} />
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  const S = DEV_OVERVIEW.sections.quickstart;
  return (
    <section className="section" id="quickstart">
      <div className="section-inner">
        <DevSectionHead s={S} />
        <div className="quickstart">
          {S.steps.map(st => (
            <div key={st.title} className="qs-col">
              <h5>{st.title}</h5>
              <pre className="terminal"><code>{st.code}</code></pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Users() {
  return (
    <section className="section">
      <div className="section-inner">
        <DevSectionHead s={DEV_OVERVIEW.sections.users} />
        <div className="users">
          {USERS.map(u => (
            <div key={u.role} className="user-cell">
              <div>
                <div className="role">{u.role}</div>
                <h5 className="dvo-user-en">{u.en}</h5>
                {DEV_OVERVIEW.showKr && <div className="kr">{u.kr}</div>}
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
  const S = DEV_OVERVIEW.sections.roadmap;
  return (
    <section className="section" id="roadmap">
      <div className="section-inner">
        <DevSectionHead s={S} />
        <div className="roadmap">
          {PHASES.map(p => (
            <div key={p.n} className={`phase ${p.status === "now" ? "now" : ""}`}>
              <div className="bar" />
              <div className="phase-hd">
                <span className="no">{S.phase} {p.n}</span>
                <span className={`status ${p.status === "now" ? "now" : ""}`}>{p.status === "now" ? S.status.now : p.status === "next" ? S.status.next : S.status.later}</span>
              </div>
              <h4>{p.title}</h4>
              {DEV_OVERVIEW.showKr && <div className="muted dvo-phase-kr">{p.kr}</div>}
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
        <DevSectionHead s={DEV_OVERVIEW.sections.gaps} />
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

Object.assign(window, { Sources, Workflows, Capabilities, QuickStart, Users, Roadmap, Gaps });
