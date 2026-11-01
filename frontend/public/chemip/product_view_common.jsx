// 보조 화면 공용 조각 — 화면 제목(한국어 + 작은 영문), 물질을 고르지 않았을 때의 빈 화면.
// 스타일: product_views.css(.pv-*), product_detail.css(.pd-empty-*).

function ViewTitle({ t }) {
  return <h1>{t.ko}{t.en && t.en !== t.ko && <span className="title-en" lang="en">{t.en}</span>}</h1>;
}

function EmptyView({ icon, title, hint }) {
  return (
    <div className="card pv-empty-card">
      <Icon name={icon} size={28} className="pd-empty-icon" />
      <h3 className="pd-empty-title">{title}</h3>
      <p className="pd-empty-hint">{hint}</p>
    </div>
  );
}

Object.assign(window, { ViewTitle, EmptyView });
