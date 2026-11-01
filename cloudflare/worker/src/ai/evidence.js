// Evidence assembly for AI routes. Port of backend/core/evidence_collector.py + parts of report_builder.py.
//
// The backend reads MSDS sections, English GHS data, guide matches and patents from local DBs. The Worker
// has none of those, so a substance record is taken (in order) from:
//   1. request body `evidence` (same shape as GET /api/chemicals/{id}, plus optional extras below), or
//   2. the static per-substance file at STATIC_BASE + STATIC_SUBSTANCE_PATH ({id} -> chemId).
// Record shape (= backend /api/chemicals/{id} response):
//   { chem_id, name, name_en, cas_no, sections: [{section_seq, section_name, content: [{msdsItemNameKor, itemDetail, ...}] | "<xml>"}],
//     english_safety: {hazard_statements: [...], signal_word, name_en, cas_no},
//     guide_recommendations?: [...], patent_highlights?: [...], drugs?: {mfds, openfda, pubmed} }
import { boolSetting, intSetting, setting } from "../config.js";
import { fetchWithTimeout, tryParseJson } from "../lib/upstream.js";

export const KIPRIS_EVIDENCE_TYPE = "kipris_patent";

// ---- loading ---------------------------------------------------------------

export async function loadSubstance(env, chemId, inline) {
  if (inline && typeof inline === "object" && !Array.isArray(inline)) return { record: inline, origin: "request" };
  const base = String(setting(env, "STATIC_BASE") || "").replace(/\/+$/, "");
  if (!base || !chemId) return { record: null, origin: "none" };
  const path = String(setting(env, "STATIC_SUBSTANCE_PATH")).replace("{id}", encodeURIComponent(chemId));
  try {
    const res = await fetchWithTimeout(`${base}${path}`, { headers: { accept: "application/json" } }, intSetting(env, "UPSTREAM_TIMEOUT_MS"));
    if (!res.ok) return { record: null, origin: `static:${res.status}` };
    return { record: tryParseJson(await res.text()), origin: "static" };
  } catch {
    return { record: null, origin: "static:error" };
  }
}

// ---- MSDS parsing ----------------------------------------------------------

const NAME_KEYS = new Set(["msdsItemNameKor", "itemName"]);

function xmlItems(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const obj = {};
    for (const t of m[1].matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g)) obj[t[1]] = t[2];
    items.push(obj);
  }
  return items;
}

// parse_msds_section_points: "name: detail" per item, up to maxPoints.
export function sectionPoints(content, maxPoints = 5) {
  const items = typeof content === "string" ? xmlItems(content) : Array.isArray(content) ? content : [];
  const points = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const name = String(it.msdsItemNameKor || it.itemName || "").trim();
    let detail = String(it.itemDetail || "").trim();
    if (!detail) {
      for (const [k, v] of Object.entries(it)) {
        if (NAME_KEYS.has(k) || typeof v !== "string") continue;
        if (v.trim()) {
          detail = v.trim();
          break;
        }
      }
    }
    if (!detail) continue;
    points.push(name ? `${name}: ${detail}` : detail);
    if (points.length >= maxPoints) break;
  }
  return points;
}

export function sectionContent(record, seq) {
  for (const s of record?.sections || []) if (parseInt(s.section_seq, 10) === seq) return s.content || "";
  return "";
}

function asList(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const parsed = tryParseJson(v);
    return Array.isArray(parsed) ? parsed : v.split(/\n+/);
  }
  return [];
}

export function english(record) {
  const e = record?.english_safety || record?.english || {};
  return { ...e, hazard_statements: asList(e.hazard_statements).map((h) => String(h).trim()).filter(Boolean) };
}

// ---- search terms (backend/core/guide_linker.py normalize_search_terms) -----

const CAS_RE_G = /\b\d{2,7}-\d{2}-\d\b/g;
const CAS_FULL = /^\d{2,7}-\d{2}-\d$/;

export function normalizeSearchTerms(values, limit = 12) {
  const terms = [];
  const seen = new Set();
  const add = (v) => {
    const t = (v || "").trim();
    if ([...t].length < 2 || /^\d+$/.test(t)) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    terms.push(t);
  };
  for (const value of values) {
    const raw = (value || "").trim();
    if (!raw) continue;
    add(raw);
    for (const cas of raw.match(CAS_RE_G) || []) add(cas);
    for (const part of raw.split(/[,/;|]/)) add(part.trim());
    const noParen = raw.replace(/\([^)]*\)/g, " ").trim();
    if (noParen && noParen !== raw) add(noParen);
  }
  const prio = terms.map((t, i) => ({ t, i })).sort((a, b) => {
    const ka = CAS_FULL.test(a.t) ? 0 : 1;
    const kb = CAS_FULL.test(b.t) ? 0 : 1;
    return ka - kb || [...a.t].length - [...b.t].length || a.i - b.i;
  });
  return prio.map((x) => x.t).slice(0, limit);
}

// ---- bundle (report_builder.EvidenceBundle) ---------------------------------

export function buildBundle(env, chemId, chemicalName, record) {
  const eng = english(record);
  const kiprisAllowed = boolSetting(env, "KIPRIS_IN_AI");
  const patents = (Array.isArray(record?.patent_highlights) ? record.patent_highlights : [])
    .filter((p) => p && (kiprisAllowed || p.type !== KIPRIS_EVIDENCE_TYPE))
    .slice(0, 6);
  return {
    chem_id: chemId,
    chemical_name: chemicalName,
    section2_points: sectionPoints(sectionContent(record, 2), 6),
    section15_points: sectionPoints(sectionContent(record, 15), 4),
    hazard_statements: eng.hazard_statements.slice(0, 4),
    guide_recommendations: (Array.isArray(record?.guide_recommendations) ? record.guide_recommendations : []).slice(0, 6),
    patent_highlights: patents,
  };
}

export function searchTerms(chemId, chemicalName, record) {
  const eng = english(record);
  return normalizeSearchTerms([chemicalName, record?.name, record?.name_en, record?.cas_no, eng.cas_no, chemId].map((v) => String(v || "")));
}

export function containsKiprisEvidence(result) {
  return (result?.sources || []).some((s) => s && typeof s === "object" && s.type === KIPRIS_EVIDENCE_TYPE);
}

// ---- sources / confidence ---------------------------------------------------

export function buildSources(b) {
  const sources = [];
  if (b.section2_points.length)
    sources.push({ type: "msds_section", id: `${b.chem_id}:2`, title: "MSDS Section 2 (Hazards Identification)", snippet: b.section2_points[0] });
  if (b.section15_points.length)
    sources.push({ type: "msds_section", id: `${b.chem_id}:15`, title: "MSDS Section 15 (Regulatory Information)", snippet: b.section15_points[0] });
  if (b.hazard_statements.length)
    sources.push({ type: "msds_english", id: `${b.chem_id}:english`, title: "MSDS English Hazard Statements", snippet: b.hazard_statements[0] });
  for (const rec of b.guide_recommendations.slice(0, 4)) {
    sources.push({
      type: "kosha_guide",
      id: rec.guide_no || "",
      title: rec.title || "",
      url: rec.file_download_url || "",
      snippet: rec.snippet || rec.text_preview || "",
      match_terms: rec.match_terms || [],
      guide_cas_numbers: rec.guide_cas_numbers || [],
    });
  }
  for (const it of b.patent_highlights.slice(0, 4)) {
    sources.push({ type: it.type || "patent", id: it.id || "", title: it.title || "", snippet: it.snippet || "", url: it.url || "" });
  }
  return sources;
}

export function calculateConfidence(b) {
  const n = b.section2_points.length + b.section15_points.length + b.hazard_statements.length + b.guide_recommendations.length + b.patent_highlights.length;
  return Math.round(Math.min(0.95, 0.4 + n * 0.04) * 100) / 100;
}

// ---- full context for /summarize (build_full_context) ------------------------

const FULL_SECTIONS = [
  [2, "유해위험성"], [4, "응급조치"], [7, "취급저장"], [8, "보호구"], [9, "물리화학적특성"], [11, "독성정보"], [15, "법적규제"],
];

const first = (v) => (Array.isArray(v) && v.length ? String(v[0] ?? "") : "");

export function buildFullContext(chemId, record) {
  const parts = [];
  const counts = {};
  const eng = english(record);
  const name = record?.name || chemId;
  parts.push(`화학물질: ${name} (CAS: ${record?.cas_no || "N/A"})`);
  if (eng.name_en) parts.push(`영문명: ${eng.name_en}`);
  if (eng.signal_word) parts.push(`신호어: ${eng.signal_word}`);
  if (eng.hazard_statements.length) {
    parts.push("\n[GHS 유해성 문구]");
    for (const h of eng.hazard_statements.slice(0, 5)) parts.push(`  - ${h}`);
    counts.ghs = eng.hazard_statements.length;
  }
  let msds = 0;
  for (const [seq, label] of FULL_SECTIONS) {
    const pts = sectionPoints(sectionContent(record, seq), 3);
    if (pts.length) {
      parts.push(`\n[MSDS ${seq}항 - ${label}]`);
      for (const p of pts) parts.push(`  - ${p}`);
      msds += pts.length;
    }
  }
  counts.msds_points = msds;

  const drugs = record?.drugs || {};
  const mfds = Array.isArray(drugs.mfds) ? drugs.mfds : [];
  if (mfds.length) {
    parts.push("\n[식약처(MFDS) 의약품]");
    for (const it of mfds.slice(0, 8)) parts.push(`  - ${it.ITEM_NAME || ""} (${it.ENTP_NAME || ""}): ${String(it.efcyQesitm || "").slice(0, 120)}`);
    counts.mfds = mfds.length;
  }
  const fda = Array.isArray(drugs.openfda) ? drugs.openfda : [];
  if (fda.length) {
    parts.push("\n[OpenFDA 의약품]");
    for (const it of fda.slice(0, 8)) {
      const o = it.openfda && typeof it.openfda === "object" ? it.openfda : {};
      const label = first(o.brand_name) || first(o.generic_name) || first(o.substance_name);
      parts.push(`  - ${label}: ${first(it.indications_and_usage).slice(0, 120)}`);
    }
    counts.openfda = fda.length;
  }
  const pubmed = Array.isArray(drugs.pubmed) ? drugs.pubmed : [];
  if (pubmed.length) {
    parts.push("\n[PubMed 논문]");
    for (const a of pubmed.slice(0, 8)) parts.push(`  - ${a.title || ""} (${a.source || ""}, ${a.pubdate || ""})`);
    counts.pubmed = pubmed.length;
  }
  const guides = Array.isArray(record?.guide_recommendations) ? record.guide_recommendations.slice(0, 6) : [];
  if (guides.length) {
    parts.push("\n[KOSHA 안전보건 가이드]");
    for (const g of guides.slice(0, 5)) parts.push(`  - ${g.title || ""} (매칭: ${(g.match_terms || []).slice(0, 3).join(", ")})`);
    counts.kosha_guides = guides.length;
  }
  return { context: parts.join("\n"), name, sources: counts };
}
