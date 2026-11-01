// 미리 보기 맞춤 훅 — 실제 크기(mm)로 그린 표지를 틀 너비에 맞게 줄일 배율(최대 1)과 줄인 높이(px).
// 틀 크기가 바뀌면(화면 폭·크기 고르기) 다시 잰다. CSS 는 --gl-scale · --gl-fit-h 로 받는다(checklist_print.css).

function useGhsFitScale(frameRef, deps) {
  const [fit, setFit] = React.useState({ scale: 1, height: 0 });
  React.useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const measure = () => {
      const sheet = frame.firstElementChild;
      if (!sheet) return;
      const w = sheet.offsetWidth || 1;
      const scale = Math.min(1, frame.clientWidth / w);
      setFit(prev => (Math.abs(prev.scale - scale) < 0.001 && prev.height === Math.round(sheet.offsetHeight * scale))
        ? prev : { scale, height: Math.round(sheet.offsetHeight * scale) });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    if (frame.firstElementChild) ro.observe(frame.firstElementChild);
    return () => ro.disconnect();
  }, deps);
  return fit;
}

Object.assign(window, { useGhsFitScale });
