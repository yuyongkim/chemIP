// 결과 아래 "이어서 계산" 링크 줄 — 정의에 links 가 있을 때 CalcForm 이 그린다. 자료는 calcNextLinksFor(calc_next_data.jsx).
// 링크는 같은 화면의 계산기 딥링크(?view=calc&calc=…&<칸>=<값>)이고, 받는 계산기는 "주소로 받은 값" 줄로 채운 값을 보인다.

function CalcNextLinks({ def, result }) {
  const L = CALC_LABELS.nextLinks;
  const links = calcNextLinksFor(def, result);
  if (!links.length) return null;
  return (
    <div className="panel calc-panel calc-next">
      <h3><b>{L.title}</b></h3>
      <div className="body">
        <ul className="calc-next-list">
          {links.map(l => (
            <li key={l.key}><a className="calc-next-link" href={l.href} title={l.title}>{l.label} <span aria-hidden="true">→</span></a></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

Object.assign(window, { CalcNextLinks });
