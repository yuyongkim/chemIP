// 용어사전 · 첫 글자 색인 줄(ㄱ–ㅎ·A–Z·#). 그 글자로 시작하는 항목이 없으면 흐리게(누를 수 없음). 다시 누르면 풀린다.

function GlossaryIndexBar({ letter, setLetter, counts }) {
  const L = GLOSSARY_LABELS;
  return (
    <nav className="gl-index" aria-label={L.indexAria}>
      <button type="button" className={`gl-letter${letter ? "" : " on"}`} aria-pressed={!letter} onClick={() => setLetter("")}>{L.indexAll}</button>
      {glLetters(CHEMIP_LANG).map(ch => (
        <button key={ch} type="button" className={`gl-letter${letter === ch ? " on" : ""}`} aria-pressed={letter === ch}
          disabled={!counts[ch]} onClick={() => setLetter(letter === ch ? "" : ch)}>{ch}</button>
      ))}
    </nav>
  );
}

Object.assign(window, { GlossaryIndexBar });
