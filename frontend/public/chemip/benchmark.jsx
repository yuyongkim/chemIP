// Benchmark view shell — Results · Explore · Label, for ChemSafety-HalBench (탭 전환·머리만). 언어는 화면 언어(CHEMIP_LANG)를 따른다.
// 탭: benchmark_results.jsx · benchmark_explore.jsx · benchmark_label.jsx. 문구: benchmark_labels.jsx.
// 설정 자료: benchmark_data.jsx. 스타일: paper.css + benchmark.css.

// 탭 목록(데이터). 탭 파일들보다 뒤에 읽는다(index.html 순서).
const BENCH_TABS = [
  { k: "results", icon: "layers", Component: ResultsTab },
  { k: "explore", icon: "search", Component: ExploreTab },
  { k: "label", icon: "check", Component: LabelTab },
];

function Benchmark() {
  const [tab, setTab] = useState(() => localStorage.getItem("chsb-bench-tab") || "results");
  useEffect(() => { localStorage.setItem("chsb-bench-tab", tab); }, [tab]);
  const t = BENCH_T;
  return (
    <div className="paper-wrap">
      <header className="paper-hero bm-hero">
        <div className="eyebrow"><span className="bm-dot" /> {t.eyebrow}</div>
        <h1>{t.h1a}<em>{t.h1b}</em></h1>
        <p>{t.intro}</p>
      </header>

      <div className="bench-tabs" role="tablist">
        {BENCH_TABS.map(b => (
          <button key={b.k} role="tab" aria-pressed={tab === b.k} onClick={() => setTab(b.k)}><Icon name={b.icon} size={13} /> {t[b.k]}</button>
        ))}
      </div>

      {BENCH_TABS.filter(b => b.k === tab).map(({ k, Component }) => <Component key={k} />)}
    </div>
  );
}

Object.assign(window, { Benchmark });
