// JSON response helpers. Error shapes match the FastAPI backend:
//  - feedback routes: {code, message, errors?}                (backend/api/routes/feedback.py _error)
//  - adapter routes:  {detail: "..."}                          (HTTPException via routes/utils.py)
//  - validation:      422 {detail: [{type, loc, msg, input}]}  (FastAPI/pydantic)

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function codeError(status, code, message, errors) {
  const body = { code, message };
  if (errors && Object.keys(errors).length) body.errors = errors;
  return json(body, status);
}

export function detailError(status, detail) {
  return json({ detail }, status);
}

// Thrown by query/body parsers; the entry point turns it into a FastAPI-style 422.
export class ValidationError extends Error {
  constructor(items) {
    super("validation error");
    this.items = items;
  }
}

export function validationResponse(err) {
  return json({ detail: err.items }, 422);
}

export async function readJsonObject(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    throw new ValidationError([{ type: "json_invalid", loc: ["body"], msg: "JSON decode error", input: {} }]);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ValidationError([{ type: "dict_type", loc: ["body"], msg: "Input should be a valid dictionary", input: data }]);
  }
  return data;
}

// Pydantic-style required string field on a body model.
export function bodyString(body, name, { required = true, dflt = "" } = {}) {
  const v = body[name];
  if (v === undefined || v === null) {
    if (required) throw new ValidationError([{ type: "missing", loc: ["body", name], msg: "Field required", input: body }]);
    return dflt;
  }
  if (typeof v !== "string") {
    throw new ValidationError([{ type: "string_type", loc: ["body", name], msg: "Input should be a valid string", input: v }]);
  }
  return v;
}
