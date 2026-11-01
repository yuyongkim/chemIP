// 벤치마크 화면 공용 표시 — 불러오는 중, 오류 한 줄. 스타일: benchmark.css.

function Loading({ text = BENCH_FIXED.loading }) { return <div className="muted bm-loading">{text}</div>; }
function ErrBox({ msg }) { return <div className="muted bm-error">{msg}</div>; }

Object.assign(window, { Loading, ErrBox });
