// 처음 화면 · "고객 수요 → ChemIP 해결" 가상 사례 FAQ. (예시이며 특정 고객 후기가 아니다. ChemIP 실제 기능에만 매핑.)
// 문구·이미지는 LANDING_FAQ(landing_faq_labels.jsx · landing_faq_labels_en.jsx) 한 곳.
// 각 항목의 img 는 벤젠(71-43-2)을 실제 조회한 결과 화면(faq/*.png). 질문별로 결과가 나온 패널만 잘라 둔다.

function LandingFaq() {
  const F = LANDING_FAQ;
  return (
    <section className="section" id="ld-faq">
      <div className="ld-inner">
        <div className="ld-eyebrow">{F.eyebrow}</div>
        <h2 className="ld-h2">{F.title}</h2>
        <p className="ld-faq-lede">{F.lede}</p>
        <div className="ld-faq-list">
          {F.items.map((it, i) => (
            <div key={i} className="ld-faq-item">
              <span className="ld-faq-role">{it.role}</span>
              <p className="ld-faq-q"><span className="ld-faq-mark">Q</span>{it.q}</p>
              <p className="ld-faq-a"><span className="ld-faq-mark ld-faq-mark-a">A</span>{it.a}</p>
              {it.img && (
                <figure className="ld-faq-shot">
                  <img src={it.img} alt={it.alt} loading="lazy" />
                  <figcaption className="ld-faq-cap">{it.cap}</figcaption>
                </figure>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LandingFaq });
