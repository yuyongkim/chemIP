// Pure rules for one REACH lookup: which ECHA search hit is this CAS, and the summary of its active registrations.
// A line-by-line port of scripts/trade_controls/intl/parse_echa_reach.py (pick_substance, subtype_label,
// summarize_dossiers, detail_text, lookup → entry) so an on-demand entry looks exactly like a bundled one.
// Values are copied as ECHA shows them (tonnage band text, subtype names); nothing is estimated.
import { substancePageUrl } from "../upstreams/echa.js";

const SUBTYPE_LABELS = [
  ["article 10", "full registration (Art. 10)"],
  ["article 17", "on-site isolated intermediate (Art. 17)"],
  ["article 18", "transported isolated intermediate (Art. 18)"],
];
const REGISTERED = "REACH REGISTERED";

export function clean(text) {
  return String(text == null ? "" : text).replace(/\s+/g, " ").trim();
}

// Search hits → { sub, how, ambiguous } (sub = substanceIndex of this CAS, or null with the reason in how;
// ambiguous = several ECHA substances carry this CAS, none of them the single registered one).
export function pickSubstance(cas, items) {
  const idx = (items || []).map((it) => (it && it.substanceIndex) || {});
  const exact = idx.filter((s) => String(s.rmlCas || "").trim() === cas);
  if (exact.length === 1) return { sub: exact[0], how: "ECHA CHEM rmlCas" };
  const registered = exact.filter((x) => (x.listParticipation || []).includes(REGISTERED));
  if (exact.length > 1 && registered.length === 1) {
    return { sub: registered[0], how: `ECHA CHEM rmlCas (the registered one of ${exact.length})` };
  }
  const listed = idx.filter((s) => (s.casNumber || []).includes(cas));
  if (listed.length === 1) return { sub: listed[0], how: "ECHA CHEM casNumber" };
  return { sub: null, how: `${exact.length} rmlCas / ${listed.length} casNumber hits`, ambiguous: exact.length > 1 || listed.length > 1 };
}

export function subtypeLabel(subtype) {
  const low = String(subtype || "").toLowerCase();
  for (const [key, label] of SUBTYPE_LABELS) if (low.includes(key)) return label;
  return clean(subtype) || "unspecified";
}

function info(d) {
  return (d && d.reachDossierInfo) || {};
}

export function summarizeDossiers(dossiers) {
  const counts = new Map();
  dossiers.forEach((d) => {
    const k = subtypeLabel(info(d).dossierSubtype || "");
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  const types = Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1])); // stable: ties keep first-seen order
  const nons = dossiers.filter((d) => String(info(d).nonsAssetFlag || "").toUpperCase() === "T").length;
  const regDates = dossiers.map((d) => d.registrationDate || "").filter(Boolean).sort();
  const upd = dossiers.map((d) => d.lastUpdatedDate || "").filter(Boolean).sort();
  const lead = dossiers.filter((d) => String(info(d).registrationRole || "").toLowerCase().includes("lead"));
  return {
    active: dossiers.length, types, nons,
    first_registered: regDates[0] || "", last_updated: upd.length ? upd[upd.length - 1] : "",
    joint_submission: lead.length > 0,
  };
}

export function detailText(sub, summary, total) {
  const parts = [];
  if (sub.rmlEc) parts.push(`EC ${sub.rmlEc}`);
  const types = Object.entries(summary.types).map(([k, v]) => `${k} ${v}`).join(", ");
  parts.push(`REACH registered — active registrations ${total}` + (types ? ` (${types})` : ""));
  if (summary.nons) parts.push(`NONS (notified under Directive 67/548/EEC) ${summary.nons}`);
  if (sub.tonnageBand) parts.push(`total tonnage band ${clean(sub.tonnageBand)} per annum`);
  if (summary.first_registered) parts.push(`first registration ${summary.first_registered}`);
  if (summary.last_updated) parts.push(`latest dossier update ${summary.last_updated}`);
  parts.push(`ECHA CHEM ${substancePageUrl(sub.rmlId || "")}`);
  return parts.join("; ");
}

// intl_common.entry(): name/detail whitespace-collapsed, extras dropped when null, "" or [].
function entry(cas, name, detail, extra) {
  const item = { cas, name: clean(name), detail: clean(detail) };
  Object.entries(extra).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) return;
    item[k] = v;
  });
  return item;
}

export function isRegistered(sub, dossiers) {
  return (sub.listParticipation || []).includes(REGISTERED) || dossiers.length > 0;
}

// Substance record + its active dossiers → the same entry as EU_REACH_REGISTERED.json.
export function reachEntry(cas, subIdx, sub, how, dossiers, total) {
  const summary = summarizeDossiers(dossiers);
  const rml = sub.rmlId || subIdx.rmlId || "";
  return entry(cas, sub.rmlName || subIdx.rmlName || "", detailText({ ...sub, rmlId: rml }, summary, total), {
    ec: sub.rmlEc || "", echa_id: rml, match_method: how, tonnage_band: clean(sub.tonnageBand || ""),
    active_registrations: total, registration_types: summary.types, nons: summary.nons,
    first_registered: summary.first_registered, last_updated: summary.last_updated, url: substancePageUrl(rml),
  });
}
