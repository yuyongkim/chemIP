// "자료 출처·라이선스" 화면 — DATA_SOURCES(sources_data.jsx)를 묶음별 표로 보인다. 문구: ABOUT_LABELS.sources.

const SOURCES_REPO = "https://github.com/yuyongkim/chemIP";

function SourceRow({ s }) {
  const L = ABOUT_LABELS.sources;
  return (
    <tr>
      <td>
        <b>{s.name}</b>
        {s.note && <div className="ui-hint">{s.note}</div>}
      </td>
      <td>{s.provider}</td>
      <td className="muted">{s.used}</td>
      <td>
        <div>{s.license}</div>
        {!s.recorded && <div className="ui-hint">{L.unrecorded}</div>}
        {s.attribution && <div className="about-attr"><span className="muted">{L.attribution}</span> {s.attribution}</div>}
        <SourceLink url={s.url} label={L.open} />
      </td>
    </tr>
  );
}

function DataSourcesView() {
  const L = ABOUT_LABELS.sources;
  return (
    <div className="about-view">
      <h1 className="about-title">{L.title}</h1>
      <p className="about-lede">{L.lede}</p>
      <div className="about-software">
        <span>{L.software}</span>
        <a className="btn sm" href={SOURCES_REPO} target="_blank" rel="noopener"><Icon name="git" size={12} /> {L.repo}</a>
        <a className="btn sm ghost" href={`${SOURCES_REPO}/blob/main/LICENSE`} target="_blank" rel="noopener">{L.license} ↗</a>
      </div>
      {DATA_SOURCE_GROUPS.map(g => {
        const rows = DATA_SOURCES.filter(s => s.group === g.k);
        if (!rows.length) return null;
        return (
          <div key={g.k} className="panel about-group">
            <h3><b>{g.title}</b><span className="muted">{L.count(rows.length)}</span></h3>
            <div className="about-table-wrap">
              <table className="about-table">
                <thead>
                  <tr>{["name", "provider", "used", "license"].map(c => <th key={c}>{L.columns[c]}</th>)}</tr>
                </thead>
                <tbody>{rows.map(s => <SourceRow key={s.name} s={s} />)}</tbody>
              </table>
            </div>
          </div>
        );
      })}
      <UsageNotice />
    </div>
  );
}

Object.assign(window, { DataSourcesView });
