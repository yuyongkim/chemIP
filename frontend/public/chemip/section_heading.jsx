// 상세 화면 절 머리(국가별 규제·사고 사례·취급 사업장 …): 한국어 제목 + 작은 영문 + 오른쪽 상태 글.
// t 는 { ko, en } (product_labels.jsx). 영어 화면에서는 영문 제목 하나만 보인다. 스타일: landing.css(.sec-heading).

function SectionHeading({ t, meta }) {
  const main = tr(t.ko, t.en || null);
  const sub = tr(t.en, "");
  return (
    <div className="sec-heading">
      <h3>
        {main}{sub && sub !== main && <span className="title-en" lang="en">{sub}</span>}
      </h3>
      {meta != null && meta !== "" && <span className="sec-heading-meta">{meta}</span>}
    </div>
  );
}

Object.assign(window, { SectionHeading });
