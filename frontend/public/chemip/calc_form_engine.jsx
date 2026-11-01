// 계산기 정의의 engine 칸(무거운 계산 엔진, 예: CoolProp wasm)을 그 계산기를 열 때만 불러오는 훅. 화면 상태는 CalcEngineStatus.
// engine = { id, name, size, load(): Promise, ready(): boolean }. 엔진이 없거나 이미 있으면 바로 "ready".
// compute 는 엔진이 준비되기 전에는 빈 결과를 돌려주고, 준비되면 이 훅의 status 가 바뀌어 calcEvaluate 를 다시 돈다(calc_form.jsx).

function useCalcEngine(def) {
  const eng = def.engine || null;
  const [status, setStatus] = useState(() => (!eng || eng.ready() ? "ready" : "loading"));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!eng || eng.ready()) { setStatus("ready"); return undefined; }
    let alive = true;
    setStatus("loading");
    eng.load().then(() => { if (alive) setStatus("ready"); }, () => { if (alive) setStatus("failed"); });
    return () => { alive = false; };
  }, [eng, attempt]);
  return { status, retry: () => setAttempt(n => n + 1) };
}

Object.assign(window, { useCalcEngine });
