// GHS 분류 글 → 유해성 항목(순수 함수). 규칙: SAFETY_RULES.ghs(safety_rules_data.jsx). 파이썬 scripts/portal_build/ghs_parse.py 와 같은 결과를
// 내야 한다(시험 tests/fixtures/safety_parse_cases.json 을 두 쪽이 함께 돌린다).
// 유해성 항목 = "<유해성 key>:<구분>" 글자(예 "acute_oral:3", "skin:1A", "stot_se:3R"), 부속서 VI 최소 분류("Acute Tox. 3 *")는 끝에 "*".
//   KOSHA MSDS 2항 B02 "인화성 액체 : 구분2|…" · CLP 코드 줄("Acute Tox. 3 *" + 같은 줄 순서의 H 문구) · 부속서 VI "M, SCL, ATE" 칸 ·
//   사용자가 직접 적은 분류(한 줄에 하나: CLP 코드[+ H 코드], KOSHA 문장, SCL 줄, "oral: ATE = 125 mg/kg bw", "M = 10").

const GHP_SPACE_RE = /[\s ]+/g;

function ghpNorm(text) {
  return String(text || "").replace(GHP_SPACE_RE, " ").trim();
}

// "0,01" / ",01" / "1 000" / "10.0" → 숫자
function ghpNum(text) {
  let t = String(text || "").replace(/[\s ]/g, "");
  if (/^\d*,\d+$/.test(t)) t = t.replace(",", ".");
  t = t.replace(/,/g, "");
  if (t.startsWith(".")) t = `0${t}`;
  const v = Number(t);
  return t !== "" && Number.isFinite(v) ? v : null;
}

function ghpCategory(rules, cat) {
  return rules.category_alias[cat] || cat;
}

function ghpEntryParts(entry) {
  const [key, cat] = String(entry).replace(/\*+$/, "").split(":");
  return { key, cat: cat || "", minimum: /\*$/.test(entry) };
}

/* ── KOSHA MSDS 2항 ── */
function ghpKoshaLine(line, rules = SAFETY_RULES.ghs) {
  const text = ghpNorm(line);
  if (!text || text === "자료없음") return null;
  const key = Object.keys(rules.hazards).find(k => rules.hazards[k].kosha && new RegExp(rules.hazards[k].kosha).test(text));
  if (!key) return null;
  const m = text.match(new RegExp(rules.category_patterns.kosha));
  let cat = "";
  if (key === "lact") cat = "1";
  else if (m) {
    cat = m.slice(1).find(g => g) || "";
    if (cat.startsWith("불안정")) cat = "unst";
  }
  cat = ghpCategory(rules, cat);
  if (key === "stot_se" && cat === "3") cat = text.includes(rules.stot_se3.kosha_narc) ? "3N" : "3R";
  return `${key}:${cat}`;
}

function ghpKoshaClassification(text, rules = SAFETY_RULES.ghs) {
  const out = [];
  String(text || "").split("|").forEach(part => {
    const h = ghpKoshaLine(part, rules);
    if (h && !out.includes(h)) out.push(h);
  });
  return out;
}

/* ── CLP 코드 ── */
function ghpClpKey(code, rules) {
  for (const key of Object.keys(rules.hazards)) {
    for (const prefix of rules.hazards[key].clp || []) {
      if (code === prefix || code.startsWith(`${prefix} `) || code.startsWith(prefix.replace(/\.+$/, ""))) return key;
    }
  }
  return null;
}

function ghpAcuteRoute(hCode, rules) {
  const h = String(hCode || "").slice(0, 4);
  return Object.keys(rules.hazards).find(k => (rules.hazards[k].h_route || []).includes(h)) || null;
}

function ghpClpCode(code, hCode = "", rules = SAFETY_RULES.ghs) {
  let text = ghpNorm(code);
  if (!text) return null;
  const minimum = text.endsWith("*");
  text = text.replace(/[*\s]+$/, "").trim();
  const h = hCode ? ghpNorm(hCode).split(" ")[0] : "";
  let key;
  if (text.startsWith(rules.clp_acute_tox)) {
    key = h ? ghpAcuteRoute(h, rules) : null;
    if (!key) return null;
  } else {
    key = ghpClpKey(text, rules);
    if (!key) return null;
  }
  const m = ` ${text}`.match(new RegExp(rules.category_patterns.clp));
  let cat = m ? m[1] : (key === "lact" ? "1" : (text.startsWith("Unst") ? "unst" : ""));
  if (!m) {
    const tail = text.match(/(1A|1B|1C|1|2|3|4)$/);
    if (tail) cat = tail[1];
  }
  cat = ghpCategory(rules, cat);
  if (key === "stot_se" && cat === "3") cat = h.startsWith(rules.stot_se3.h_narc) ? "3N" : "3R";
  return `${key}:${cat}${minimum ? "*" : ""}`;
}

function ghpClpClassification(codes, hCodes = "", rules = SAFETY_RULES.ghs) {
  const cLines = String(codes || "").split("\n").filter(c => c.trim());
  const hLines = String(hCodes || "").split("\n").filter(h => h.trim());
  const aligned = cLines.length === hLines.length;
  const acuteH = hLines.map(h => h.trim()).filter(h => ghpAcuteRoute(h, rules));
  const out = [];
  cLines.forEach((c, i) => {
    let h = aligned ? hLines[i] : "";
    if (!aligned && ghpNorm(c).startsWith(rules.clp_acute_tox) && acuteH.length) h = acuteH.shift();
    if (!aligned && ghpNorm(c).startsWith("STOT SE 3")) h = hLines.find(x => /^\s*H33[56]/.test(x)) || "";
    const entry = ghpClpCode(c, h, rules);
    if (entry && !out.includes(entry)) out.push(entry);
  });
  return out;
}

/* ── 부속서 VI "M, SCL, ATE" 칸 ── */
const GHP_SCL_RE = /^([A-Za-z][A-Za-z .-]*?\s(?:1A|1B|1C|1|2|3|4))\s*;\s*(H\d{3}[A-Za-z]*)?\s*[:;]\s*(.+)$/;
const GHP_LOW_RE = /C\s*[≥>]=?\s*([\d.,\s]+?)\s*%|([\d.,\s]+?)\s*%\s*[≤<]=?\s*C/;
const GHP_ATE_RE = /(oral|dermal|inhalation)\s*:\s*ATE\s*=\s*([\d.,\s]+?)\s*(mg\/kg(?: bw)?|mg\/L|mg\/l|ppmV|ppm)\s*(.*)/i;
const GHP_M_RE = /^M\s*=\s*([\d\s]+)$/;

function ghpInhalationForm(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("gas") || t.includes("ppm")) return "gas";
  if (t.includes("dust") || t.includes("mist")) return "dust";
  return "vapour";
}

// 한 줄 → { ate: [route, 값] } | { m: 값 } | { scl: [key, cat, 하한 %] } | null
function ghpSclLine(line, rules = SAFETY_RULES.ghs) {
  const text = ghpNorm(line);
  if (!text) return null;
  const a = text.match(GHP_ATE_RE);
  if (a) {
    const value = ghpNum(a[2]);
    let route = a[1].toLowerCase();
    if (route === "inhalation") route = ghpInhalationForm(`${a[3]} ${a[4]}`);
    return value == null ? null : { ate: [route, value] };
  }
  const m = text.match(GHP_M_RE);
  if (m) {
    const value = ghpNum(m[1]);
    return value == null ? null : { m: value };
  }
  const s = text.match(GHP_SCL_RE);
  if (s) {
    const entry = ghpClpCode(s[1], s[2] || "", rules);
    const low = s[3].match(GHP_LOW_RE);
    if (entry && low) {
      const value = ghpNum(low[1] || low[2]);
      const { key, cat } = ghpEntryParts(entry);
      if (value != null) return { scl: [key, cat, value] };
    }
  }
  return null;
}

function ghpSclColumn(text, rules = SAFETY_RULES.ghs) {
  const raw = String(text || "").replace(/ /g, " ").replace(/\*/g, "")
    .replace(/(oral|dermal|inhalation)\s*:\s*\n\s*ATE/gi, "$1: ATE");
  const out = { scl: [], ate: {}, m: [] };
  raw.split("\n").forEach(line => {
    const r = ghpSclLine(line, rules);
    if (!r) return;
    if (r.ate) out.ate[r.ate[0]] = r.ate[1];
    else if (r.m != null) out.m.push(r.m);
    else if (r.scl) out.scl.push(r.scl);
  });
  return out;
}

// 부속서 VI M 계수 → { acute, chronic } (두 값이면 급성·만성 순서, 하나면 그 항목의 구분 1 수생 분류 모두)
function ghpMFactors(hazards, mValues) {
  const hasA = hazards.some(h => h.replace(/\*+$/, "") === "aq_acute:1");
  const hasC = hazards.some(h => h.replace(/\*+$/, "") === "aq_chronic:1");
  const out = {};
  if (!mValues || !mValues.length) return out;
  if (mValues.length >= 2 && hasA && hasC) return { acute: mValues[0], chronic: mValues[1] };
  if (hasA) out.acute = mValues[0];
  if (hasC) out.chronic = !hasA || mValues.length < 2 ? mValues[0] : mValues[1];
  return out;
}

/* ── 직접 적은 분류 ── */
// 한 줄에 하나. 돌려주는 모양은 부속서 VI 항목과 같다: { hazards, scl, ate, m: {acute, chronic}, euh, unknown: [읽지 못한 줄] }
function ghpParseTyped(text, rules = SAFETY_RULES.ghs) {
  const out = { hazards: [], scl: [], ate: {}, m: {}, euh: [], unknown: [] };
  const mList = [];
  String(text || "").split(/\n|;(?![^:]*:)/).forEach(raw => {
    const line = ghpNorm(raw);
    if (!line) return;
    (line.match(/EUH\d{3}/g) || []).forEach(c => { if (!out.euh.includes(c)) out.euh.push(c); });
    const s = ghpSclLine(line, rules);
    if (s) {
      if (s.ate) out.ate[s.ate[0]] = s.ate[1];
      else if (s.m != null) mList.push(s.m);
      else out.scl.push(s.scl);
      return;
    }
    const inlineM = line.match(/\bM\s*=\s*(\d+)/);
    const base = line.replace(/\bM\s*=\s*\d+/, "").trim();
    const h = (base.match(/H\d{3}[A-Za-z]*/) || [""])[0];
    const code = base.replace(/H\d{3}[A-Za-z]*/g, "").replace(/EUH\d{3}/g, "").replace(/[,(]\s*\)?$/, "").trim();
    const entry = ghpKoshaLine(code, rules) || ghpClpCode(code, h, rules);
    if (entry) {
      if (!out.hazards.includes(entry)) out.hazards.push(entry);
      if (inlineM) mList.push(Number(inlineM[1]));
    } else if (!/^EUH\d{3}$/.test(line)) {
      out.unknown.push(line);
    }
  });
  out.m = ghpMFactors(out.hazards, mList);
  return out;
}

/* ── MSDS 상세 응답 ── */
// detail.sections[] → 항목 코드별 글 { B02: "…", B0402: "GHS02.gif|…" }. "자료없음" 은 뺀다.
function ghpMsdsItems(detail, seq) {
  const sec = (detail?.sections || []).find(s => Number(s.section_seq) === seq);
  const out = {};
  (sec?.content || []).forEach(it => {
    const t = String(it.itemDetail || "").trim();
    if (it.msdsItemCode && t && t !== "자료없음" && !(it.msdsItemCode in out)) out[it.msdsItemCode] = t;
  });
  return out;
}

Object.assign(window, {
  ghpNorm, ghpNum, ghpEntryParts, ghpKoshaLine, ghpKoshaClassification, ghpClpCode, ghpClpClassification,
  ghpSclLine, ghpSclColumn, ghpMFactors, ghpParseTyped, ghpMsdsItems,
});
