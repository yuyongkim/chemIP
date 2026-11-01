// 계산기 결과 표(순수 함수) — 정의의 table(values, outputs) → { caption?, columns, rows, filename? } 를 화면 글자·CSV·TSV 로.
// 열: { key, label, dim?, unit(기준 단위), show?(보일 단위), digits? }. 행: { <열 key>: 기준 단위 숫자 }. 화면은 calc_table_out.jsx.

// 정의의 table(values, outputs) → 표 또는 null. 표 함수가 실패해도 결과 패널은 그대로 둔다.
function calcTableFor(def, result) {
  if (typeof def.table !== "function" || !result?.outputs || !result.values) return null;
  try {
    const t = def.table(result.values, result.outputs);
    return t && Array.isArray(t.columns) && Array.isArray(t.rows) ? t : null;
  } catch (e) { return null; }
}

function calcTableUnit(col) {
  return col.dim ? calcUnitLabel(col.dim, col.show || col.unit) : (col.unit || "");
}

// 열 머리: "h_f (kJ/kg)"
function calcTableHead(col) {
  const u = calcTableUnit(col);
  return u && u !== "—" ? `${col.label} (${u})` : col.label;
}

// 보일 단위로 바꾼 숫자(없으면 null)
function calcTableValue(col, row) {
  const v = row[col.key];
  if (v == null || !Number.isFinite(v)) return null;
  return col.dim ? calcConvert(col.dim, v, col.unit, col.show || col.unit) : v;
}

// 파일·복사용 숫자 글자: 유효숫자 digits, 천 단위 쉼표 없음
function calcTablePlain(n, digits = 6) {
  if (n == null) return "";
  if (n === 0) return "0";
  return String(Number(n.toPrecision(digits)));
}

function calcTableMatrix(table) {
  return [
    table.columns.map(calcTableHead),
    ...table.rows.map(r => table.columns.map(c => calcTablePlain(calcTableValue(c, r), c.digits))),
  ];
}

function calcCsvCell(s) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV(쉼표, 줄바꿈 \r\n). 엑셀이 °·² 를 읽도록 파일로 받을 때 앞에 BOM 을 붙이는 것은 화면 쪽이 한다.
function calcTableCsv(table) {
  return calcTableMatrix(table).map(row => row.map(calcCsvCell).join(",")).join("\r\n");
}

// 탭 구분(스프레드시트에 붙여 넣기)
function calcTableTsv(table) {
  return calcTableMatrix(table).map(row => row.join("\t")).join("\n");
}

Object.assign(window, { calcTableFor, calcTableHead, calcTableValue, calcTablePlain, calcTableCsv, calcTableTsv });
