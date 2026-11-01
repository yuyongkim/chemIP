// /chemical/<chem_id> (legacy Next detail page on the PC site; the SPA "전체 화면" link still points here)
// → the SPA's substance view. Pages _redirects cannot put a path placeholder into a query string, hence a Function.
const SPA = "/chemip";

function decoded(seg) {
  try { return decodeURIComponent(seg); } catch { return seg; }
}

export function onRequest({ request, params }) {
  const parts = [].concat(params.path || []).filter(Boolean);
  const target = parts.length
    ? `${SPA}?view=product&pv=chemical&chem=${encodeURIComponent(decoded(parts[0]))}`
    : SPA;
  return Response.redirect(new URL(target, request.url).toString(), 302);
}
