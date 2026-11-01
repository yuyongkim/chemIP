// 물질 상세 · EU REACH 등록 항목 한 칸(국가별 규제 절의 EU_REACH_REGISTERED 묶음, 해외 규제 탭의 REACH 패널이 같이 쓴다).
// entry = { name, detail, facts, reachState, checked, echaUrl }. facts 가 있으면 EC·활성 등록·톤수·날짜를 줄로(reach_format.jsx),
// 없으면(옛 응답) ECHA 가 준 detail 글 그대로. 확인 중·미등록·조회 불가는 상태 글만. 출처 표시(ECHA 고지 5.1.1)는 언제나.
// 문구: REACH_LABELS(reach_labels*.jsx). 스타일: product_detail.css .pd-reach-*

function ReachEntry({ entry }) {
  const L = REACH_LABELS;
  const state = entry.reachState || (entry.facts || entry.detail ? "registered" : "checking");
  const facts = entry.facts ? reachFacts(entry.facts) : null;
  const url = (facts && facts.url) || entry.echaUrl || "";
  const when = entry.checked ? (entry.onDemand ? L.checkedAt(entry.checked) : L.bundledAt(entry.checked)) : "";
  if (state === "checking") return <div className="pd-reg-entry muted">{L.checking}</div>;
  return (
    <div className="pd-reg-entry pd-reach-entry">
      {state === "none" && <div>{L.none(entry.checked || "—")}</div>}
      {state === "unknown" && <div className="muted">{L.unknown}</div>}
      {state === "ambiguous" && <div className="muted">{L.ambiguous}</div>}
      {state === "registered" && facts && (
        <dl className="pd-reach-facts">
          {reachRows(facts, L, CHEMIP_LANG).map(r => (
            <div key={r.key} className="pd-reach-fact">
              <dt className="muted">{r.label}</dt>
              <dd className={r.mono ? "mono tnum" : "tnum"}>{r.value}{r.sub && <span className="muted pd-reach-sub">{r.sub}</span>}</dd>
            </div>
          ))}
        </dl>
      )}
      {state === "registered" && !facts && entry.detail && <div>{entry.detail}</div>}
      {state === "registered" && entry.name && <div className="muted">{entry.name}</div>}
      {url && (
        <div className="pd-reach-link">
          <a href={url} target="_blank" rel="noopener noreferrer">{L.link} ↗</a>
          <span className="muted mono"> {url.replace(/^https?:\/\//, "")}</span>
        </div>
      )}
      <div className="muted pd-reach-source">{L.attribution}{when && state !== "none" ? ` · ${when}` : ""}</div>
    </div>
  );
}

Object.assign(window, { ReachEntry });
