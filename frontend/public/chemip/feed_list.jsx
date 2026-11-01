// 화학사고 소식 · 목록: 처음 FEED_PAGE 건, "더 보기"로 FEED_PAGE 건씩. 거르기가 바뀌면 부모가 key 를 바꿔 처음으로 돌린다.
// 문구: FEED_LABELS. 스타일: product_views.css(.feed-*).

function FeedList({ items, sources, disciplines, emptyText }) {
  const L = FEED_LABELS;
  const [shown, setShown] = useState(FEED_PAGE);
  if (!items.length) return <EmptyState card>{emptyText || L.none}</EmptyState>;
  const rest = items.length - shown;
  return (
    <div className="feed-list">
      {items.slice(0, shown).map(it => <FeedItem key={it.id} item={it} sources={sources} disciplines={disciplines} />)}
      {rest > 0 && (
        <button type="button" className="btn sm feed-more" onClick={() => setShown(n => n + FEED_PAGE)}>
          {L.more(Math.min(rest, FEED_PAGE))}
        </button>
      )}
    </div>
  );
}

Object.assign(window, { FeedList });
