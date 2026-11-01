// 경고표지 미리 보기 — 실제 크기 표지(GhsLabelSheet)를 틀 너비에 맞게 줄여 보인다. 인쇄는 줄이지 않은 같은 표지.

function GhsLabelPreview({ label }) {
  const ref = React.useRef(null);
  const fit = useGhsFitScale(ref, [label.size.k]);
  const vars = { "--gl-scale": fit.scale, "--gl-fit-h": fit.height ? `${fit.height}px` : "auto" };
  return (
    <div className="gl-preview">
      <div className="calc-label">{GHS_LABELS.view.preview}</div>
      <div className="gl-preview-frame" ref={ref} style={vars}>
        <GhsLabelSheet label={label} />
      </div>
    </div>
  );
}

Object.assign(window, { GhsLabelPreview });
