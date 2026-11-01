// CAS Registry Number shape and check digit (same rule as scripts/trade_controls/intl/intl_common.py cas_is_valid).

const CAS_RE = /^(\d{2,7})-(\d{2})-(\d)$/;

export function normalizeCas(value) {
  return String(value || "").replace(/\s+/g, "");
}

export function casIsValid(cas) {
  const m = CAS_RE.exec(cas || "");
  if (!m) return false;
  const digits = (m[1] + m[2]).split("").reverse();
  const sum = digits.reduce((s, d, i) => s + (i + 1) * Number(d), 0);
  return sum % 10 === Number(m[3]);
}
