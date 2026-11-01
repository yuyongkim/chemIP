// Trade controls · 목록 항목 한 줄 — 국내 법령 목록(kr_law.jsx)과 상대국 목록(intl_lists.jsx)이 같이 쓴다.
// 물질 이름·CAS 는 Highlight(primitives.jsx)로 표시해 왜 이 목록에 걸렸는지 바로 보이게 한다.

function TcEntryLine({ entry: e, terms }) {
  const t = tcEntryTerms(e, terms || []);
  return (
    <div className="tc-line">
      <span><Highlight text={tcEntryName(e)} terms={t} /></span>
      {e.detail && <span className="tc-muted"> · <Highlight text={e.detail} terms={t} /></span>}
    </div>
  );
}

Object.assign(window, { TcEntryLine });
