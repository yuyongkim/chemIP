// 화면에 가까이 왔는지(useInView) — 아래 패널이 스크롤로 다가올 때만 요청하게 한다.

// Fetch only once the section is near the viewport — a PRTR cache miss falls
// back to a live portal probe, so we do not pay for it on every page view.
function useInView(ref, force = false) {
  const [inView, setInView] = React.useState(force);
  React.useEffect(() => {
    if (force) { setInView(true); return; }
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [inView, force]);
  return inView;
}

Object.assign(window, { useInView });
