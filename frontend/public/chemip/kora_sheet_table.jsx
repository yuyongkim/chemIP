// "KORA 입력 준비표" 표 — 절마다 [항목 · 값 · 출처·메모] 세 열. 화면과 인쇄가 같은 표를 쓴다. 자료 모양: koraSheetModel(kora_sheet_core.jsx).
// 빈칸(blank)은 손으로 쓸 밑줄 칸, 확인 줄(check)은 ☐. 한국어 MSDS 원문 값은 data-source-text 로 표시(영어 화면 한글 점검에서 뺀다).

function KoraSheetTable({ model }) {
  const C = KORA_SHEET.cols;
  return (
    <div className="kora-sheet">
      {model.sections.map(sec => (
        <section key={sec.key} className="kora-sec">
          <h4 className="kora-sec-title">{sec.title}</h4>
          <table className="kora-table">
            <thead><tr><th scope="col">{C.item}</th><th scope="col">{C.value}</th><th scope="col">{C.source}</th></tr></thead>
            <tbody>
              {sec.rows.map((r, i) => (
                <tr key={`${sec.key}-${i}`} className={r.blank ? "is-blank" : r.check ? "is-check" : ""}>
                  <th scope="row">{r.label}</th>
                  <td {...(r.sourceText ? { "data-source-text": "" } : {})}>{r.value}</td>
                  <td className="kora-src">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

Object.assign(window, { KoraSheetTable });
