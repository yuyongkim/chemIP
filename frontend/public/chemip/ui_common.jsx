// Shared UI — empty state ("자료 준비 중"), error, badge, source link, titled panel, collapsible group.
// 두 화면 이상에서 쓰는 표시 조각만 둔다. 스타일은 trade_controls.css 의 .ui-* (tokens.css 변수 사용).
// 문구는 부르는 쪽이 넘긴다(기본 문구만 UI_COMMON_TEXT 에).

const UI_COMMON_TEXT = {
  preparing: "자료 준비 중입니다. 수집이 끝나면 자동으로 표시됩니다.",
  error: "조회하지 못했습니다.",
  sourceLink: "원문 ↗",
  chemNotFound: id => `요청한 물질(${id})을 찾지 못했습니다. 검색에서 이름·CAS 로 다시 찾아 주십시오.`,
  goSearch: "물질 검색으로 가기",
};

// kind: "empty"(기본) | "preparing" | "error". card=true 면 카드 모양으로 단독 표시.
function EmptyState({ kind = "empty", card = false, children }) {
  const text = children || (kind === "preparing" ? UI_COMMON_TEXT.preparing : kind === "error" ? UI_COMMON_TEXT.error : "");
  return <div className={`ui-empty${kind === "error" ? " error" : ""}${card ? " card-like" : ""}`}>{text}</div>;
}

function ErrorState({ message, card = false }) {
  return <EmptyState kind="error" card={card}>{UI_COMMON_TEXT.error}{message ? ` (${message})` : ""}</EmptyState>;
}

// tone: "" | "accent" | "safe" | "hazard" (app.css .chip 변형)
function Badge({ tone = "", title, children }) {
  return <span className={`chip ui-badge${tone ? ` ${tone}` : ""}`} title={title}>{children}</span>;
}

function SourceLink({ url, label = UI_COMMON_TEXT.sourceLink }) {
  if (!url) return null;
  return <a className="ui-source-link" href={url} target="_blank" rel="noopener">{label}</a>;
}

function SectionPanel({ title, aside, id, children }) {
  return (
    <div className="panel ui-section" id={id}>
      <h3><b>{title}</b>{aside ? <span className="muted">{aside}</span> : null}</h3>
      <div className="body">{children}</div>
    </div>
  );
}

// 접고 펼치는 묶음(<details>). 키보드·인쇄 기본 동작을 그대로 쓴다. 바깥에서 한꺼번에 열고 닫으려면 key 를 바꾼다.
function Collapsible({ summary, defaultOpen = false, className = "", children }) {
  return (
    <details className={`ui-collapse${className ? ` ${className}` : ""}`} open={defaultOpen || undefined}>
      <summary className="ui-collapse-sum">{summary}</summary>
      <div className="ui-collapse-body">{children}</div>
    </details>
  );
}

// 묶음 전체 펼치기/접기 버튼. open: null(각자) | true | false. 문구는 부르는 쪽이 넘긴다.
function ExpandAllToggle({ open, setOpen, labels }) {
  return (
    <button type="button" className="ui-link-btn" onClick={() => setOpen(open ? false : true)}>
      {open ? labels.collapseAll : labels.expandAll}
    </button>
  );
}

Object.assign(window, { UI_COMMON_TEXT, EmptyState, ErrorState, Badge, SourceLink, SectionPanel, Collapsible, ExpandAllToggle });
