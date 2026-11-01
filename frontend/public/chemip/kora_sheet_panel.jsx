// 장외 영향 사전 검토 계산기 아래 "KORA 입력 준비표" 패널 — 계산기 정의의 panel 로 붙는다(calc_form.jsx).
// 고른 물질의 정적 자료를 받아(useFacts: f/<CAS>.json, useEmergencyLimits: el/<CAS>.json) 준비표 모양(koraSheetModel)을 만들고
// 화면에 보이며 인쇄 단추를 단다. 자료가 없거나 정적 자료가 꺼져 있어도 계산기 입력·결과로 채운 줄은 그대로 보인다.

function KoraSheetPanel({ result }) {
  const L = KORA_SHEET;
  const values = result && result.values;
  const cas = values ? (values.cat === "flam" ? values.sub_f : values.sub_t) : "";
  const facts = useFacts(cas);
  const el = useEmergencyLimits(values && values.cat !== "flam" ? cas : "", Boolean(cas));
  if (!values) return null;
  const model = koraSheetModel({ values, outputs: result.outputs, facts: facts.data, el: el.data && el.data.file, lang: CHEMIP_LANG });
  const made = L.made(new Date().toISOString().slice(0, 10));
  return (
    <div className="panel calc-panel kora-panel">
      <h3><b>{L.title}</b>{L.titleSub && <> <span className="title-en">{L.titleSub}</span></>}</h3>
      <div className="body">
        <p className="calc-summary">{L.lede}</p>
        <div className="calc-alert is-warn kora-disclaimer">{L.disclaimer}</div>
        <div className="kora-bar">
          <KoraSheetPrintButton model={model} made={made} />
          <span className="ui-hint">{(facts.loading || el.loading) ? L.loading : L.printHint}</span>
        </div>
        <KoraSheetTable model={model} />
      </div>
    </div>
  );
}

Object.assign(window, { KoraSheetPanel });
