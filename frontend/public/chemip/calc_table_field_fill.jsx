// 계산기 표 칸 행 채우기 단추 CalcRowFill — 표 정의의 rowFill: "<종류>" 가 있으면 calc_table_field.jsx 가 행마다 그린다.
// 채우기 함수는 API 층 api_calc_fill.jsx 의 CALC_ROW_FILLERS[종류](row, choices) → { patch, info } | { error, name }. 문구: CALC_LABELS.rowFill.

// 채우기 결과 → 안내 줄 { ok, text }
function calcRowFillNote(L, rowNo, r) {
  if (r.patch) {
    const i = r.info;
    if (i.source === "props_flash") return { ok: true, text: L.propsFlash(rowNo, i.name, i.cas, i.how) };
    if (i.source === "props_limits") return { ok: true, text: L.propsLimits(rowNo, i.name, i.cas) };
    if (i.source === "preset") return { ok: true, text: L.preset(rowNo, i.name, calcFormatNumber(i.tmin, 3), calcFormatNumber(i.tmax, 3), calcFormatNumber(i.err, 2)) };
    return { ok: true, text: L.fitted(rowNo, i.name, calcFormatNumber(i.p1, 3), calcFormatNumber(i.t1, 3), calcFormatNumber(i.tb, 4)) };
  }
  if (r.error === "empty") return { ok: false, text: L.empty(rowNo) };
  if (r.error === "notFound") return { ok: false, text: L.notFound(rowNo, r.name) };
  return { ok: false, text: L.noData(rowNo, r.name) };
}

function CalcRowFill({ kind, row, choices, rowNo, onFill, onNote }) {
  const L = { ...CALC_LABELS.rowFill, ...((CALC_LABELS.rowFill.kinds || {})[kind] || {}) };   // 종류별 단추·안내 문구가 있으면 그것
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    let note;
    try {
      const r = await CALC_ROW_FILLERS[kind](row, choices || {});
      if (r.patch) onFill(r.patch);
      note = calcRowFillNote(L, rowNo, r);
    } catch (e) {
      note = { ok: false, text: L.failed(rowNo) };
    }
    setBusy(false);
    onNote(note);
  };
  return (
    <button type="button" className="btn sm ghost calc-row-fill" title={L.hint} aria-label={L.button(rowNo)} aria-busy={busy} disabled={busy} onClick={go}>
      <Icon name="search" size={12} />
    </button>
  );
}

Object.assign(window, { CalcRowFill, calcRowFillNote });
