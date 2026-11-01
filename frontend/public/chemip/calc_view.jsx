// 최상위 화면 "공학 계산기" 셸 — 고른 계산기(주소 ?calc= 또는 첫 계산기)와 목록·본문 배치만. 문구: CALC_LABELS.
// 주소로 받은 값은 주소가 가리킨 계산기에만 채운다(calc_link.jsx). 스타일: calc.css(.calc-*).
// 제목 아래 안전 도구 줄(SafetyToolsNav, safety_tools_nav.jsx) — 혼촉 매트릭스·혼합물 분류 등 계산기 목록 밖 화면으로.

function CalcView({ setView }) {
  const L = CALC_LABELS;
  const [link] = useState(() => calcReadLink(window.location.search));
  const [key, setKey] = useState(() => (calcFind(link?.calc) || CALC_REGISTRY[0]).key);
  const def = calcFind(key);
  const prefill = link && link.calc === key ? link.values : null;
  return (
    <div className="calc-view">
      <h1 className="calc-title">{L.title}{L.titleSub && <> <span className="title-en">{L.titleSub}</span></>}</h1>
      <p className="calc-lede">{L.lede}</p>
      <SafetyToolsNav setView={setView} />
      <div className="calc-layout">
        <CalcNav current={key} onPick={setKey} />
        <CalcForm key={key} def={def} prefill={prefill} from={prefill ? link.name : ""} />
      </div>
    </div>
  );
}

Object.assign(window, { CalcView });
