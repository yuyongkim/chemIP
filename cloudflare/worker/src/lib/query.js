// Query/path readers with FastAPI Query(...) semantics (defaults, ge/le, max_length, required).
import { ValidationError } from "./http.js";

function fail(type, loc, msg, input, ctx) {
  const item = { type, loc, msg, input };
  if (ctx) item.ctx = ctx;
  throw new ValidationError([item]);
}

export function intQuery(url, name, dflt, { ge, le } = {}) {
  const raw = url.searchParams.get(name);
  if (raw === null) return dflt;
  const loc = ["query", name];
  if (!/^\s*-?\d+\s*$/.test(raw)) fail("int_parsing", loc, "Input should be a valid integer, unable to parse string as an integer", raw);
  const n = parseInt(raw, 10);
  if (ge !== undefined && n < ge) fail("greater_than_equal", loc, `Input should be greater than or equal to ${ge}`, raw, { ge });
  if (le !== undefined && n > le) fail("less_than_equal", loc, `Input should be less than or equal to ${le}`, raw, { le });
  return n;
}

export function strQuery(url, name, dflt, { required = false, minLength, maxLength, pattern } = {}) {
  const raw = url.searchParams.get(name);
  const loc = ["query", name];
  if (raw === null) {
    if (required) fail("missing", loc, "Field required", null);
    return dflt;
  }
  if (minLength !== undefined && raw.length < minLength)
    fail("string_too_short", loc, `String should have at least ${minLength} character${minLength === 1 ? "" : "s"}`, raw, { min_length: minLength });
  if (maxLength !== undefined && raw.length > maxLength)
    fail("string_too_long", loc, `String should have at most ${maxLength} characters`, raw, { max_length: maxLength });
  if (pattern && !pattern.test(raw)) fail("string_pattern_mismatch", loc, `String should match pattern '${pattern.source}'`, raw);
  return raw;
}

export function intPath(value, name) {
  if (!/^-?\d+$/.test(value || "")) {
    fail("int_parsing", ["path", name], "Input should be a valid integer, unable to parse string as an integer", value);
  }
  return parseInt(value, 10);
}
