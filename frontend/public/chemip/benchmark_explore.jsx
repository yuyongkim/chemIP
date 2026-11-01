// 벤치마크 "Explore" 탭 — 문항 하나를 다섯 검색 설정으로 비교(뒷받침·근거없음·안전핵심 claim 수, 답변).
// 자료: data/benchmark_explore.json. 문구: BENCH_FIXED. 설정 이름: SETTING_SHORT(benchmark_data.jsx).

function ExploreSettingRow({ name, row }) {
  const F = BENCH_FIXED;
  const c = row.claims || {};
  return (
    <div className={"setting-row" + (row.abstained ? " abst" : "")}>
      <div className="sr-head">
        <span className="sr-name">{name}</span>
        {row.abstained && <Chip tone="default">{F.abstained}</Chip>}
        <span className="sr-tallies">
          {c.supported > 0 && <span className="pilltally ok">{F.supported(c.supported)}</span>}
          {(c.unsupported + c.contradicted) > 0 && <span className="pilltally bad">{F.unsupported(c.unsupported + c.contradicted)}</span>}
          {c.safety_critical > 0 && <span className="pilltally crit">{F.critical(c.safety_critical)}</span>}
        </span>
      </div>
      <div className="sr-answer">{row.answer || (row.abstained ? F.declined : "—")}</div>
    </div>
  );
}

function ExploreTab() {
  const F = BENCH_FIXED;
  const { data, loading } = useJson("data/benchmark_explore.json");
  const [pick, setPick] = useState(0);
  if (loading) return <Loading />;
  if (!data || !data.samples.length) return <ErrBox msg={F.noSamples} />;
  const s = data.samples[Math.min(pick, data.samples.length - 1)];
  return (
    <>
      <div className="muted bm-note">
        {F.exploreA}<b>{data.model === "full" ? F.fullModel : data.model}</b>{F.exploreB}
      </div>
      <div className="qpick">
        {data.samples.map((q, i) => (
          <button key={q.sample_id} aria-pressed={i === pick} onClick={() => setPick(i)}>{q.sample_id}</button>
        ))}
      </div>
      <div className="qcard">
        <div className="q-type">{s.question_type}</div>
        <h3 className="q-text">{s.question}</h3>
        <div className="settings-list">
          {Object.keys(SETTING_SHORT).filter(k => s.settings[k]).map(k => <ExploreSettingRow key={k} name={SETTING_SHORT[k]} row={s.settings[k]} />)}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ExploreTab });
