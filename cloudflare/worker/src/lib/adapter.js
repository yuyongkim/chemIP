// Adapter results are {status: "success"|"error"|"disabled", ...} like the backend adapters.
// toResponse() = backend/api/routes/utils.handle_adapter_result: disabled -> 503, other non-success -> 502,
// both as FastAPI HTTPException bodies {detail}.
import { detailError, json } from "./http.js";

export function adapterError(result) {
  const status = result?.status;
  if (status === "disabled") return detailError(503, result.message || "API disabled");
  if (status && status !== "success") return detailError(502, result.message || "API Error");
  return null;
}

export function toResponse(result, body = result) {
  return adapterError(result) || json(body);
}

export function errorMessage(e) {
  return e && e.message ? String(e.message).slice(0, 200) : "request failed";
}
