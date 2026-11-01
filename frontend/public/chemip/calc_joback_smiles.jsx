// SMILES → Joback 원자단 개수(순수 함수, 외부 라이브러리 없음). 지원: 유기 부분집합(B C N O P S F Cl Br I, 방향족 b c n o p s),
// 괄호 원자([nH], [C@@H], [N+](=O)[O-] 등 — 수소 수·전하만 읽고 동위원소·입체는 무시), 결합 - = # : / \, 가지 ( ), 고리 번호 1–9·%nn.
// 지원하지 않는 것: 점(.)으로 나눈 혼합물, 원자단 표에 없는 원소·결합 모양 → { error } 로 돌려준다(그때는 원자단 개수를 직접 넣는다).
// 원자단 판정 규칙은 thermo.group_contribution.joback 의 SMARTS(J. Biggs, MIT)와 같은 뜻: 고리 = 고리 결합을 가진 원자.

const JOBACK_SMILES_VALENCE = { B: [3], C: [4], N: [3, 5], O: [2], P: [3, 5], S: [2, 4, 6], F: [1], Cl: [1], Br: [1], I: [1] };
const JOBACK_SMILES_ORGANIC = /^(Cl|Br|B|C|N|O|P|S|F|I|b|c|n|o|p|s)/;

// 글자 → { atoms: [{ el, arom, hExp|null, charge }], bonds: [{ a, b, order }] } 또는 { error }
function jobackParseSmiles(smiles) {
  const s = String(smiles || "").trim();
  if (!s) return { error: "empty" };
  if (s.includes(".")) return { error: "dot" };
  const atoms = [], bonds = [], stack = [], rings = {};
  let prev = null, pend = null, i = 0;
  const addBond = (a, b, sym) => {
    const arom = atoms[a].arom && atoms[b].arom;
    const order = sym === "=" ? 2 : sym === "#" ? 3 : sym === ":" ? 1.5 : sym == null && arom ? 1.5 : 1;
    bonds.push({ a, b, order });
  };
  const addAtom = (atom) => {
    atoms.push(atom);
    const idx = atoms.length - 1;
    if (prev != null) addBond(prev, idx, pend);
    prev = idx;
    pend = null;
  };
  while (i < s.length) {
    const ch = s[i];
    if (ch === "(") { if (prev == null) return { error: "syntax" }; stack.push(prev); i++; continue; }
    if (ch === ")") { if (!stack.length) return { error: "syntax" }; prev = stack.pop(); i++; continue; }
    if ("-=#:/\\".includes(ch)) { pend = ch === "/" || ch === "\\" ? "-" : ch; i++; continue; }
    if (/[0-9%]/.test(ch)) {
      let key;
      if (ch === "%") { key = s.slice(i + 1, i + 3); if (!/^\d\d$/.test(key)) return { error: "syntax" }; i += 3; } else { key = ch; i++; }
      if (prev == null) return { error: "syntax" };
      if (rings[key]) {
        const open = rings[key];
        addBond(open.atom, prev, pend || open.bond);
        delete rings[key];
      } else {
        rings[key] = { atom: prev, bond: pend };
      }
      pend = null;
      continue;
    }
    if (ch === "[") {
      const j = s.indexOf("]", i);
      if (j < 0) return { error: "syntax" };
      const m = /^(\d*)(Cl|Br|[A-Z][a-z]?|b|c|n|o|p|s)(@*)(H\d*)?([+-]\d*|[+-]+)?(:\d+)?$/.exec(s.slice(i + 1, j));
      if (!m) return { error: "syntax" };
      const el = m[2].length === 1 && m[2] === m[2].toLowerCase() ? m[2].toUpperCase() : m[2];
      const h = m[4] ? (m[4].length > 1 ? Number(m[4].slice(1)) : 1) : 0;
      const q = !m[5] ? 0 : /^[+-]\d+$/.test(m[5]) ? Number(m[5]) : (m[5][0] === "+" ? 1 : -1) * m[5].length;
      addAtom({ el, arom: m[2] !== el && m[2] === m[2].toLowerCase(), hExp: h, charge: q });
      i = j + 1;
      continue;
    }
    const m = JOBACK_SMILES_ORGANIC.exec(s.slice(i));
    if (!m) return { error: "atom", at: s.slice(i, i + 3) };
    const t = m[1];
    const el = t.length === 1 && t === t.toLowerCase() ? t.toUpperCase() : t;
    addAtom({ el, arom: t !== el, hExp: null, charge: 0 });
    i += t.length;
  }
  if (stack.length || Object.keys(rings).length) return { error: "syntax" };
  return { atoms, bonds };
}

// 분자 그래프 → 원자마다 이웃·수소 수·고리 여부
function jobackAnnotate(mol) {
  const n = mol.atoms.length;
  const nb = Array.from({ length: n }, () => []);
  mol.bonds.forEach((b, k) => { nb[b.a].push({ to: b.b, order: b.order, k }); nb[b.b].push({ to: b.a, order: b.order, k }); });
  // 고리 결합: 그 결합을 빼도 두 끝이 이어지면
  const ringBond = mol.bonds.map((b, k) => {
    const seen = new Set([b.a]);
    const queue = [b.a];
    while (queue.length) {
      const u = queue.shift();
      for (const e of nb[u]) {
        if (e.k === k || seen.has(e.to)) continue;
        if (e.to === b.b) return true;
        seen.add(e.to);
        queue.push(e.to);
      }
    }
    return false;
  });
  return mol.atoms.map((a, idx) => {
    const sum = nb[idx].reduce((t, e) => t + e.order, 0);
    const hNb = nb[idx].filter(e => mol.atoms[e.to].el === "H").length;   // explicit [H] atoms count as hydrogens of this atom
    let h = a.hExp;
    if (h == null) {
      const used = a.arom ? nb[idx].filter(e => e.order !== 1.5).reduce((t, e) => t + e.order, 0) + nb[idx].filter(e => e.order === 1.5).length + 1 : sum;
      const vals = JOBACK_SMILES_VALENCE[a.el] || [0];
      const v = a.arom ? vals[0] : vals.find(x => x >= used);   // aromatic o, s, n: lowest valence (no implicit H beyond it)
      h = v == null ? 0 : Math.max(0, v - used);
    }
    return { ...a, idx, nb: nb[idx].filter(e => mol.atoms[e.to].el !== "H"), h: h + hNb, ring: nb[idx].some(e => ringBond[e.k]) };
  });
}

// 원자 → 원자단 코드(JOBACK_GROUPS 의 code). 탄소의 C=O·C≡N 은 산소·질소를 함께 쓴다(used 에 표시).
function jobackAssign(at) {
  const counts = {};
  const used = new Set();
  const add = (code, ...idx) => { counts[code] = (counts[code] || 0) + 1; idx.forEach(x => used.add(x)); };
  const A = i => at[i];
  const dbl = (a, el) => a.nb.filter(e => e.order === 2 && A(e.to).el === el && !A(e.to).arom);
  // 1) 탄소 작용기(카복실산·에스터·알데하이드·케톤·나이트릴)
  for (const a of at) {
    if (a.el !== "C" || a.arom || used.has(a.idx)) continue;
    const oDbl = dbl(a, "O").filter(e => A(e.to).nb.length === 1);
    const nTri = a.nb.filter(e => e.order === 3 && A(e.to).el === "N" && A(e.to).nb.length === 1);
    if (nTri.length === 1) { add("CN", a.idx, nTri[0].to); continue; }
    if (oDbl.length !== 1) continue;
    if (a.nb.filter(e => A(e.to).el === "O").length > 2) return { error: "group", at: a.idx };   // carbonate-like: no Joback group
    const o1 = oDbl[0].to;
    const singleO = a.nb.filter(e => e.order === 1 && A(e.to).el === "O" && !used.has(e.to));
    const oh = singleO.find(e => A(e.to).h === 1);
    const ether = singleO.find(e => A(e.to).h === 0 && A(e.to).nb.length === 2);
    if (oh) { add("COOH", a.idx, o1, oh.to); continue; }
    if (ether && a.h === 0) { add("COO", a.idx, o1, ether.to); continue; }
    if (ether) return { error: "group", at: a.idx };   // formate H-C(=O)-O-: no Joback group
    if (a.h === 1 && a.nb.length === 2 && a.nb.some(e => e.to !== o1 && A(e.to).el === "C")) { add("CHO", a.idx, o1); continue; }
    if (a.h === 0 && a.nb.length === 3) { add(a.ring ? "rC=O" : "C=O", a.idx, o1); continue; }
  }
  // 2) 나이트로(N 이 O 둘과: N(=O)=O 또는 [N+](=O)[O-])
  for (const a of at) {
    if (a.el !== "N" || used.has(a.idx)) continue;
    const os = a.nb.filter(e => A(e.to).el === "O" && A(e.to).nb.length === 1);
    if (os.length === 2) add("NO2", a.idx, os[0].to, os[1].to);
  }
  // 3) 나머지 원자 하나씩
  for (const a of at) {
    if (used.has(a.idx) || a.el === "H") continue;
    const deg = a.nb.length;
    const triple = a.nb.some(e => e.order === 3);
    const doubles = a.nb.filter(e => e.order === 2).length;
    if (a.el === "C") {
      if (a.arom) { if (a.h === 1) add("r=CH", a.idx); else if (a.h === 0) add("r=C", a.idx); else return { error: "group", at: a.idx }; continue; }
      if (triple) { if (a.h === 1) add("#CH", a.idx); else if (a.h === 0) add("#C", a.idx); else return { error: "group", at: a.idx }; continue; }
      if (doubles === 2) { add("=C=", a.idx); continue; }
      if (doubles === 1) {
        if (a.h === 2) add("=CH2", a.idx);
        else if (a.h === 1) add(a.ring ? "r=CH" : "=CH", a.idx);
        else if (a.h === 0) add(a.ring ? "r=C" : "=C", a.idx);
        else return { error: "group", at: a.idx };
        continue;
      }
      if (a.h === 3 && deg >= 1) add("CH3", a.idx);
      else if (a.h === 2) add(a.ring ? "rCH2" : "CH2", a.idx);
      else if (a.h === 1) add(a.ring ? "rCH" : "CH", a.idx);
      else if (a.h === 0) add(a.ring ? "rC" : "C", a.idx);
      else return { error: "group", at: a.idx };
      continue;
    }
    if (a.el === "O") {
      if (a.charge !== 0) return { error: "group", at: a.idx };
      if (a.h === 1 && deg === 1) { add(A(a.nb[0].to).arom ? "ArOH" : "OH", a.idx); continue; }
      if (a.h === 0 && deg === 2 && !doubles) { add(a.ring ? "rO" : "O", a.idx); continue; }
      const nbr = deg === 1 ? A(a.nb[0].to) : null;
      if (a.h === 0 && deg === 1 && doubles === 1 && !(nbr.el === "C" && nbr.nb.length + nbr.h === 3)) { add("=O", a.idx); continue; }   // not on a carbonyl C
      return { error: "group", at: a.idx };
    }
    if (a.el === "N") {
      if (a.charge !== 0) return { error: "group", at: a.idx };
      if (a.h === 2 && deg === 1) { add("NH2", a.idx); continue; }
      if (a.h === 1) {
        if (doubles === 1 && deg === 1) add("=NH", a.idx);
        else if (deg === 2 && !doubles) add(a.ring ? "rNH" : "NH", a.idx);
        else return { error: "group", at: a.idx };
        continue;
      }
      if (a.h === 0 && (doubles === 1 || a.arom) && deg === 2) { add(a.ring ? "r-N=" : "-N=", a.idx); continue; }
      if (a.h === 0 && deg === 3 && !doubles) { add("N", a.idx); continue; }
      return { error: "group", at: a.idx };
    }
    if (a.el === "S") {
      if (a.h === 1 && deg === 1) { add("SH", a.idx); continue; }
      if (a.h === 0 && deg === 2) { add(a.ring ? "rS" : "S", a.idx); continue; }   // two connections (as thermo's [#16X2H0])
      return { error: "group", at: a.idx };
    }
    if (["F", "Cl", "Br", "I"].includes(a.el) && deg + a.h === 1) { add(a.el, a.idx); continue; }
    return { error: "element", at: a.idx, el: a.el };
  }
  return { counts };
}

// SMILES → { counts: { <코드>: n }, atoms: 전체 원자 수(H 포함) } 또는 { error, at? }
function jobackGroupsFromSmiles(smiles) {
  const mol = jobackParseSmiles(smiles);
  if (mol.error) return mol;
  const at = jobackAnnotate(mol);
  const res = jobackAssign(at);
  if (res.error) return { ...res, el: res.el || (at[res.at] && at[res.at].el) };
  const heavy = at.filter(a => a.el !== "H");
  return { counts: res.counts, atoms: heavy.length + heavy.reduce((t, a) => t + a.h, 0) };
}

Object.assign(window, { jobackParseSmiles, jobackAnnotate, jobackAssign, jobackGroupsFromSmiles });
