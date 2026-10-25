// 물질 상세의 "이 물질 자료가 틀렸나요?" 링크 — 요청 게시판 글쓰기를 CAS 를 채운 채로 연다(fbReportHref).

function FeedbackReportLink({ selected }) {
  const R = FEEDBACK_LABELS.report;
  if (!selected) return null;
  return (
    <a className="fb-report-link" href={fbReportHref(selected)} title={R.hint}>
      <Icon name="doc" size={13} /> {R.link}
    </a>
  );
}

Object.assign(window, { FeedbackReportLink });
