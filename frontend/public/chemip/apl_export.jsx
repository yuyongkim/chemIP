// 적용 법규 판정기 · 인쇄/PDF·CSV 단추. 인쇄는 body.apl-printing 동안 입력 칸·상단 바를 숨기고(calc.css @media print) 결과만 찍는다.
// CSV 는 aplCsvRows → aplCsvString(BOM 포함, 엑셀 한글) 을 tcDownloadText(체크리스트와 같은 내려받기 도우미)로 내려받는다.

function AplExport({ result, rows, names }) {
  const L = APL_LABELS.export;
  const print = () => {
    document.body.classList.add("apl-printing");
    const done = () => { document.body.classList.remove("apl-printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => { window.print(); setTimeout(done, 1000); }, 50);
  };
  const csv = () => {
    const day = new Date().toISOString().slice(0, 10);
    tcDownloadText(`${L.file}_${day}.csv`, aplCsvString(aplCsvRows(result, rows, names, APL_LABELS)), "text/csv;charset=utf-8");
  };
  return (
    <div className="apl-actions apl-no-print">
      <button type="button" className="btn sm primary" onClick={print}><Icon name="doc" size={12} /> {L.print}</button>
      <button type="button" className="btn sm" onClick={csv}><Icon name="down" size={12} /> {L.csv}</button>
    </div>
  );
}

Object.assign(window, { AplExport });
