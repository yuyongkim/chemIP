// 익명 이용 집계 안내 + 최근 30일 숫자. 소개(랜딩)와 자료 출처 화면이 같이 쓴다. 데이터: useUsageSummary(api.jsx).

function UsageNotice({ showStats = true }) {
  const U = ABOUT_LABELS.usage;
  const { data } = useUsageSummary(30);
  const totals = data?.totals || {};
  return (
    <div className="about-usage">
      <div className="about-usage-head"><Icon name="shield" size={14} /> <b>{U.title}</b></div>
      <p>{U.body}</p>
      {showStats && data && (
        <div className="about-usage-stats">
          <span className="muted">{U.statsTitle}</span>
          {Object.keys(U.metricNames).map(m => (
            <span key={m} className="about-usage-stat">
              {U.metricNames[m]} <b className="tnum">{U.times(totals[m]?.count || 0)}</b>
              <span className="muted"> · {U.distinct(totals[m]?.distinct_subjects || 0)}</span>
            </span>
          ))}
          <span className="muted mono">{U.since(data.first_recorded_day)}</span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { UsageNotice });
