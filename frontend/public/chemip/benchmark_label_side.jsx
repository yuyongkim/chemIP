// 벤치마크 "Label" 탭 옆줄 — 진행 막대·선택지별 개수, 단축키 안내. 문구: BENCH_T. 스타일: benchmark.css.

function LabelSidebar({ t, scheme, total, progress, optLabel }) {
  const { done, pct, counts } = progress;
  return (
    <aside className="lc-side">
      <div className="panel bm-side-panel">
        <div className="bm-progress-head">
          <span className="muted">{t.progress}</span><b className="tnum">{done}/{total} · {pct}%</b>
        </div>
        <div className="lc-pbar"><div className="lc-pfill bm-fill" style={{ "--w": pct + "%" }} /></div>
        <div className="bm-stats">
          {scheme.options.map(([v, c]) => (
            <div className="lc-stat" key={v}><span className={`sw ${c}`} /><span className="nm">{optLabel(v)}</span><span className="ct">{counts[v]}</span></div>
          ))}
          <div className="lc-stat"><span className="sw none" /><span className="nm">{t.unlabeled}</span><span className="ct">{total - done}</span></div>
        </div>
      </div>
      <div className="panel bm-side-panel bm-keys">
        <b className="bm-keys-title">{t.keyboard}</b>
        <div className="bm-keys-row"><kbd>1</kbd>–<kbd>{scheme.options.length}</kbd> {t.kbLabel} · <kbd>←</kbd><kbd>→</kbd> {t.kbMove} · <kbd>⏎</kbd> {t.kbNext}</div>
      </div>
    </aside>
  );
}

Object.assign(window, { LabelSidebar });
