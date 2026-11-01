// 물질 「국내 근거 조문」 패널 · 이 물질이 오른 국내 목록 카드 묶음(LawBasisCard). 처음엔 LAW_BASIS_FIRST 개, 나머지는 "더 보기".
// 문구: LAW_LABELS.panel. 스타일: product_detail.css(.pd-law-cards).

const LAW_BASIS_FIRST = 6;

function LawBasisList({ lists }) {
  const P = LAW_LABELS.panel;
  const [all, setAll] = useState(false);
  const shown = all ? lists : lists.slice(0, LAW_BASIS_FIRST);
  return (
    <div className="pd-law-lists">
      <div className="pd-law-cards">
        {shown.map(l => <LawBasisCard key={l.id} list={l} />)}
      </div>
      {lists.length > LAW_BASIS_FIRST && (
        <button type="button" className="btn sm ghost" onClick={() => setAll(v => !v)}>
          {all ? P.showLess : P.showMore(lists.length - LAW_BASIS_FIRST)}
        </button>
      )}
    </div>
  );
}

Object.assign(window, { LawBasisList });
