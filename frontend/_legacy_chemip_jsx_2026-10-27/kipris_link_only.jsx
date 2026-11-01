// KIPRIS 링크 전용 표시 — 백엔드가 display_mode="link_only"(KIPRIS_PUBLIC_DISPLAY=false)로
// 답하면 특허 탭은 결과 목록 대신 "KIPRIS에서 보기" 링크만 보인다(KIPRIS Plus 약관 제19조).
// 문구: PRODUCT_LABELS.patents.linkOnly. 링크 주소는 백엔드(kipris_policy.py)가 만든다.

function isKiprisLinkOnly(data) {
  return data?.display_mode === "link_only";
}

function KiprisLinkOnly({ data, query }) {
  const L = PRODUCT_LABELS.patents.linkOnly;
  const href = data?.kipris_link || "https://www.kipris.or.kr/khome/main.do";
  return (
    <div className="panel kipris-link-only" data-display-mode="link_only">
      <PanelTitle t={L.heading(query)} />
      <div className="body">
        <p style={{ fontSize: 13, margin: "0 0 12px" }}>{L.body}</p>
        <a className="btn sm primary" href={href} target="_blank" rel="noopener noreferrer">
          {data?.link_label || L.button} ↗
        </a>
        <div className="ui-hint" style={{ marginTop: 12 }}>{L.note}</div>
      </div>
    </div>
  );
}

Object.assign(window, { KiprisLinkOnly, isKiprisLinkOnly });
