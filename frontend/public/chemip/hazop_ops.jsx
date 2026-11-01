// HAZOP 워크시트 고치기 순수 함수(hzOp*): study → 새 study. 화면(hazop_view.jsx)은 setStudy(s => hzOp…(s, …)) 로만 고친다.

function hzOpPatchStudy(s, patch) {
  return { ...s, ...patch };
}

function hzOpPatchNode(s, nodeId, patch) {
  return { ...s, nodes: s.nodes.map(n => (n.id === nodeId ? { ...n, ...patch } : n)) };
}

function hzOpAddNode(s) {
  if (s.nodes.length >= HAZOP_MAX_NODES) return s;
  const nums = s.nodes.map(n => parseInt(n.no, 10)).filter(Number.isFinite);
  return { ...s, nodes: [...s.nodes, hzNewNode((nums.length ? Math.max(...nums) : 0) + 1)] };
}

function hzOpRemoveNode(s, nodeId) {
  const nodes = s.nodes.filter(n => n.id !== nodeId);
  return { ...s, nodes: nodes.length ? nodes : [hzNewNode(1)] };
}

function hzOpAddRows(s, nodeId, rows) {
  return hzOpMapRows(s, nodeId, list => [...list, ...rows].slice(0, HAZOP_MAX_ROWS));
}

function hzOpPatchRow(s, nodeId, rowId, patch) {
  return hzOpMapRows(s, nodeId, list => list.map(r => (r.id === rowId ? { ...r, ...patch } : r)));
}

function hzOpRemoveRow(s, nodeId, rowId) {
  return hzOpMapRows(s, nodeId, list => list.filter(r => r.id !== rowId));
}

// 줄 순서 옮기기(dir = −1 위, +1 아래)
function hzOpMoveRow(s, nodeId, rowId, dir) {
  return hzOpMapRows(s, nodeId, list => {
    const i = list.findIndex(r => r.id === rowId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return list;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
}

// 고른 줄의 칸(field)에 제안 한 줄 더하기
function hzOpAppendToRow(s, nodeId, rowId, field, text) {
  return hzOpMapRows(s, nodeId, list => list.map(r => (r.id === rowId ? { ...r, [field]: hzAppendLine(r[field], text) } : r)));
}

function hzOpMapRows(s, nodeId, fn) {
  return { ...s, nodes: s.nodes.map(n => (n.id === nodeId ? { ...n, rows: fn(n.rows) } : n)) };
}

Object.assign(window, {
  hzOpPatchStudy, hzOpPatchNode, hzOpAddNode, hzOpRemoveNode, hzOpAddRows, hzOpPatchRow, hzOpRemoveRow, hzOpMoveRow, hzOpAppendToRow,
});
