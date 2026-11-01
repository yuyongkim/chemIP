// API · 수출입 통제(방향·상대국별, 정적 조립 먼저)와 자료 규모 요약(처음 화면 숫자).

/* ── Import/export controls (by CAS · direction · counterpart country) ── */
// 수출 + 상대국이면 KOTRA 수입규제(실시간 전용)가 들어가므로 정적 조립과 /api 를 함께 부르고 /api 가 되면 그것을 쓴다.
// /api 에 닿지 못하면(정적 배포에서 PC 가 꺼졌다고 이미 알면 요청 없이 — api_origin.jsx) 정적 조립 결과
// (destination.kotra_unavailable = "offline")를 쓴다.
function fetchTradeControls(cas, direction, country) {
  const dir = direction || "import";
  const params = new URLSearchParams({ direction: dir, country: country || "" });
  const live = ms => originGet(`/regulations/trade-controls/${encodeURIComponent(cas)}?${params.toString()}`, ms);
  const fromStatic = () => staticTradeControls(cas, dir, country || "");
  const ctry = String(country || "").trim().toUpperCase();
  const needsKotra = dir === "export" && ctry && ctry !== "KR";
  if (!needsKotra || !staticEnabled("pages")) return staticFirst(fromStatic, () => live(30000));
  const st = fromStatic().catch(() => null);
  return live(staticConfig().timeoutMs).catch(async e => {
    const d = await st;
    if (d) return d;
    throw e;
  });
}

function useTradeControls(cas, direction, country) {
  return useApi(
    () => cas ? fetchTradeControls(cas, direction, country) : Promise.resolve(null),
    [cas, direction, country]
  );
}

// 자료 규모 요약(국내 법령 목록 수 등). 처음 화면 문구의 숫자를 채운다.
// 처음 화면의 여러 칸이 함께 쓰므로 한 번만 요청한다(실패하면 다음 화면에서 다시 요청).
let tradeCatalogPromise = null;
function useTradeCatalog() {
  return useApi(() => {
    tradeCatalogPromise = tradeCatalogPromise || staticFirst(staticTradeCatalog, () => originGet("/regulations/trade-controls-catalog", 15000))
      .catch(e => { tradeCatalogPromise = null; throw e; });
    return tradeCatalogPromise;
  }, []);
}

Object.assign(window, { fetchTradeControls, useTradeControls, useTradeCatalog });
