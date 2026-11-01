// Request path -> (metric, subject). Port of backend/usage/matcher.py (pure functions).

const SUBJECT_RE = /^[0-9A-Za-z-]{1,32}$/;

// [metric, path regex]; the first group is the substance identifier.
export const ROUTES = [
  ["substance_view", /^\/api\/chemicals\/([^/]+)$/],
  ["trade_controls", /^\/api\/regulations\/trade-controls\/([^/]+)$/],
];

const NOT_SUBJECTS = new Set(["autocomplete"]);
const BOT_RE = /bot|spider|crawl|slurp|headless|preview/i;

export function match(method, path) {
  if (method !== "GET") return null;
  for (const [metric, re] of ROUTES) {
    const m = re.exec(path);
    if (m) {
      let subject;
      try {
        subject = decodeURIComponent(m[1]);
      } catch {
        subject = m[1];
      }
      if (NOT_SUBJECTS.has(subject)) return null;
      return [metric, SUBJECT_RE.test(subject) ? subject : ""];
    }
  }
  return null;
}

export function isBot(userAgent) {
  return BOT_RE.test(userAgent || "");
}
