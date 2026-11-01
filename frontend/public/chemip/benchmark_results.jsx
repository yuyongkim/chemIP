// 벤치마크 "Results" 탭 — 지표를 골라 모델 × 검색 설정 표(막대 + 값). 자료: data/multimodel_comparison.json.
// 문구: BENCH_FIXED. 지표: METRIC_META(benchmark_data.jsx). 스타일: paper.css + benchmark.css.

function MetricCell({ v, max, meta }) {
  if (v == null) return <span className="bm-null">—</span>;
  const strength = meta.good === "high" ? v / max : 1 - v / max;
  return (
    <div className="mcell">
      <div className={`mc-bar bm-bar tone-${meta.tone}`} style={{ "--w": `${Math.max(4, (v / max) * 72)}px`, "--o": .35 + .65 * strength }} />
      <span className="mc-val">{v.toFixed(3)}</span>
    </div>
  );
}

function ResultsTab() {
  const F = BENCH_FIXED;
  const { data, loading } = useJson("data/multimodel_comparison.json");
  const [metric, setMetric] = useState("claim_support_precision");
  if (loading) return <Loading />;
  if (!data) return <ErrBox msg={F.loadFail} />;
  const mm = METRIC_META[metric];
  const models = data.models;
  const rows = data.settings.map(s => ({ setting: s, cells: models.map(m => data.matrix[metric][s][m.key]) }));
  const max = metric.includes("precision") || metric.includes("accuracy") ? 1 : 0.45;

  return (
    <>
      <div className="metric-switch">
        {Object.keys(METRIC_META).map(k => (
          <button key={k} aria-pressed={metric === k} onClick={() => setMetric(k)}>{METRIC_META[k].label}</button>
        ))}
      </div>
      <div className="muted bm-note">
        {mm.good === "high" ? F.higher : F.lower} {F.resultsNote(models.length)} {F.resultsNote2}
      </div>
      <div className="mtable-scroll">
        <table className="mtable">
          <thead>
            <tr><th>{F.settingCol}</th>{models.map(m => <th key={m.key}>{m.key}{m.tier === "hosted" ? F.hostedMark : ""}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.setting}>
                <th>{r.setting}</th>
                {r.cells.map((v, i) => <td key={i}><MetricCell v={v} max={max} meta={mm} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="muted bm-foot">{F.hostedFoot}</div>
    </>
  );
}

Object.assign(window, { ResultsTab });
