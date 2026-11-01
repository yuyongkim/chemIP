// 적용 법규 판정기 · 맨 위 큰 안내 "법적 판단이 아닌 사전 검토용". 기준일(법령 원문 받은 날·규정수량 고시)을 함께 보인다.

function AplDisclaimer({ notice }) {
  const D = APL_LABELS.disclaimer;
  const asOf = D.basis({ laws: APL_PSM.source.retrieved, notice: notice ? `${tr(notice.number, notice.number_en)} (${notice.effective})` : "—" });
  return (
    <div className="apl-disclaimer" role="note">
      <b>{D.title}</b>
      <p>{D.body}</p>
      <p className="apl-asof">{asOf}</p>
    </div>
  );
}

Object.assign(window, { AplDisclaimer });
