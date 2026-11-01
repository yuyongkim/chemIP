// 적용 법규 판정기 · 방유제 용량·최대보유량 도우미(상태는 이 컴포넌트 안). 계산은 apl_dike_core.jsx(aplDike·aplHolding).
// "새 행으로 추가"는 저장탱크 최대보유량(t)을 취급량 표에 한 행으로 넣는다(onAddRow).

function AplDike({ onAddRow }) {
  const L = APL_LABELS.dike;
  const T = APL_TERMS;
  const [basis, setBasis] = useState("tank");
  const [tanks, setTanks] = useState("1000, 500");
  const [area, setArea] = useState("");
  const [height, setHeight] = useState("");
  const [disp, setDisp] = useState("");
  const [vol, setVol] = useState("");
  const [dens, setDens] = useState("");
  const list = tanks.split(/[,\s;]+/).map(aplNum).filter(v => v != null);
  const res = aplDike({ basis, tanks: list, area: aplNum(area), height: aplNum(height), displacement: aplNum(disp) });
  const held = aplHolding(aplNum(vol), aplNum(dens));
  return (
    <div className="panel calc-panel apl-no-print">
      <h3><b>{L.title}</b></h3>
      <div className="body apl-law">
        <AplSelect label={L.basis} value={basis} onChange={setBasis}>
          {Object.keys(L.bases).map(k => <option key={k} value={k}>{L.bases[k]}</option>)}
        </AplSelect>
        <div className="apl-dike-grid">
          <label className="apl-field apl-wide">
            <span className="calc-label">{L.tanks}</span>
            <input className="calc-input mono" value={tanks} onChange={e => setTanks(e.target.value)} />
          </label>
          <AplNumField label={L.area} value={area} onChange={setArea} />
          <AplNumField label={L.height} value={height} onChange={setHeight} />
          <AplNumField label={L.displacement} value={disp} onChange={setDisp} />
        </div>
        {res && (
          <div>
            <div className="calc-out"><span className="calc-out-k">{L.required}<TermHint term={T.dike} /></span><span className="calc-out-v mono tnum">{aplFmt(res.required)}</span><span className="calc-out-u">m³</span></div>
            {res.effective != null && <div className="calc-out"><span className="calc-out-k">{L.effective}</span><span className="calc-out-v mono tnum">{aplFmt(res.effective)}</span><span className="calc-out-u">m³</span></div>}
            {res.minHeight != null && <div className="calc-out"><span className="calc-out-k">{L.minHeight}</span><span className="calc-out-v mono tnum">{aplFmt(res.minHeight, 2)}</span><span className="calc-out-u">m</span></div>}
            {res.ok != null && <div className={`calc-alert ${res.ok ? "apl-ok" : "is-warn"}`}>{res.ok ? L.ok : L.short}</div>}
          </div>
        )}
        <div className="apl-cites"><AplCiteLink k={basis === "process" ? "hz_rule_b4" : "hz_rule_b6"} /></div>
        <p className="calc-hint">{L.cca} <AplCiteLink k="cca_r_b5" /></p>
        <div className="calc-sub">{L.holding}</div>
        <div className="apl-dike-grid">
          <AplNumField label={L.holdingVolume} value={vol} onChange={setVol} />
          <AplNumField label={L.holdingDensity} term={T.density} value={dens} onChange={setDens} />
        </div>
        {held != null && (
          <div className="calc-out">
            <span className="calc-out-k">{L.holdingResult}<TermHint term={T.qty} /></span>
            <span className="calc-out-v mono tnum">{aplFmt(held)}</span>
            <span className="calc-out-u">t</span>
          </div>
        )}
        {held != null && <button type="button" className="btn sm" onClick={() => onAddRow({ qty: String(+held.toFixed(4)), unit: "t", density: dens, use: "tank_out" })}><Icon name="plus" size={12} /> {APL_LABELS.inv.add}</button>}
        <p className="calc-hint">{L.holdingCite} <AplCiteLink k="cca_notice_b4" /></p>
      </div>
    </div>
  );
}

Object.assign(window, { AplDike });
