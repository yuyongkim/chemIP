// 국내 법령 보기 안쪽 링크 — ?view=law&law=&art=&q= 주소를 가진 <a>. onOpen 이 있으면(같은 화면 안) 새로 읽지 않고 상태만 바꾼다.
// 새 탭(⌘·Ctrl·Shift·가운데 단추)은 브라우저 기본 동작 그대로. 주소 규칙: law_core.jsx lawViewHref.

function LawLink({ law, art = "", q = "", onOpen, className = "", title, children }) {
  const href = lawViewHref(law, art, q);
  const click = (e) => {
    if (!onOpen || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onOpen(law, art, q);
  };
  return <a className={className || undefined} href={href} onClick={click} title={title}>{children}</a>;
}

Object.assign(window, { LawLink });
