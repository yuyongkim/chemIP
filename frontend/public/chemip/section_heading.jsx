// 상세 화면 절 머리(국가별 규제·사고 사례·취급 사업장 …): 한국어 제목 + 작은 영문 + 오른쪽 상태 글.
// t 는 { ko, en } (product_labels.jsx).

function SectionHeading({ t, meta, size = 18 }) {
  return (
    <div className="sec-heading">
      <h3 style={{ fontSize: size }}>
        {t.ko}{t.en && t.en !== t.ko && <span className="title-en" lang="en">{t.en}</span>}
      </h3>
      {meta != null && meta !== "" && <span className="sec-heading-meta">{meta}</span>}
    </div>
  );
}

Object.assign(window, { SectionHeading });
