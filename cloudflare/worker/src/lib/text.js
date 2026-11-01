// Text normalisation ported from backend/api/text_utils.py and kotra_adapter.py.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function unescapeHtml(s) {
  return s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, ent) => {
    if (ent[0] === "#") {
      const code = ent[1] === "x" || ent[1] === "X" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[ent] !== undefined ? ENTITIES[ent] : m;
  });
}

const HANGUL = /[가-힣]/;

// Mojibake repair: text.encode("latin1").decode("utf-8") when that yields Hangul.
function repairLatin1(text) {
  if (HANGUL.test(text)) return null;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) > 255) return null;
  try {
    const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
    const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return HANGUL.test(repaired) ? repaired : null;
  } catch {
    return null;
  }
}

export function normalizeText(obj) {
  if (typeof obj === "string") {
    const text = obj.trim();
    if (!text) return "";
    const repaired = repairLatin1(text);
    return repaired !== null ? repaired : unescapeHtml(text);
  }
  if (Array.isArray(obj)) return obj.map(normalizeText);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = normalizeText(v);
    return out;
  }
  return obj;
}

export function htmlToText(html) {
  let t = html || "";
  t = t.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "");
  t = unescapeHtml(t).replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");
  return t.trim();
}
