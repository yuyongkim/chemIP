// HAZOP 작성기 · 도구 줄: CSV 내려받기(엑셀용 BOM), 인쇄(HazopPrintButton), 예시 불러오기, 새로 시작, 저장 상태. 문구: HAZOP_LABELS.toolbar

function hzDownloadCsv(study) {
  const L = HAZOP_LABELS;
  const blob = new Blob(["﻿", hzCsv(study, L)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${L.toolbar.csvName}${study.date ? `_${study.date}` : ""}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function HazopToolbar({ study, saved, onReplace }) {
  const T = HAZOP_LABELS.toolbar;
  // 적은 내용이 있을 때만 확인 창(빈 검토는 바로 바꾼다)
  const filled = study.nodes.some(n => n.rows.length || n.name || n.intent);
  const ask = (msg) => (!filled || typeof window.confirm !== "function" ? true : window.confirm(msg));
  return (
    <div className="hz-toolbar">
      <button type="button" className="btn sm primary" onClick={() => hzDownloadCsv(study)}><Icon name="doc" size={12} /> {T.csv}</button>
      <HazopPrintButton study={study} />
      <button type="button" className="btn sm" onClick={() => { if (ask(T.confirmExample)) onReplace(hzExampleStudy(HAZOP_LABELS)); }}>{T.example}</button>
      <button type="button" className="btn sm ghost" onClick={() => { if (ask(T.confirmReset)) onReplace(hzNewStudy()); }}>{T.reset}</button>
      <span className={`hz-saved${saved ? "" : " is-off"}`} role="status">{saved ? T.saved : T.notSaved}</span>
    </div>
  );
}

Object.assign(window, { HazopToolbar, hzDownloadCsv });
