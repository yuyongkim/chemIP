// 공용 훅 — CSS 미디어 쿼리가 지금 맞는지(창 크기를 바꾸면 다시 그린다). 예: useMediaQuery("(max-width: 860px)")

function useMediaQuery(query) {
  const read = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);
  const [hit, setHit] = useState(read);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setHit(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return hit;
}

Object.assign(window, { useMediaQuery });
