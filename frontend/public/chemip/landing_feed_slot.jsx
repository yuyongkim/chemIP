// 처음 화면 · 최근 화학사고 소식 자리 — v1/feed/latest.json 이 있을 때만 보인다(없거나 오류면 아무것도 그리지 않는다).
// 자료: api_feed.jsx useFeedLatest(소식 화면과 같은 파일), 가공: landingFeedItems. "모두 보기"는 소식 화면(?view=feed)이 등록돼 있을 때만.

const LANDING_FEED_SHOWN = 4;

function LandingFeedList({ views }) {
  const D = LANDING_DISCOVER.feed;
  const { data } = useFeedLatest();
  const items = landingFeedItems(data, LANDING_FEED_SHOWN);
  if (!items.length) return null;
  return (
    <section className="section ld-disc-sec">
      <div className="ld-inner">
        <div className="ld-disc-head">
          <div className="ld-eyebrow">{D.eyebrow}</div>
          {(views || []).includes("feed") && <a className="ld-disc-more" href={landingViewHref("feed")}>{D.more} <Icon name="chev" size={12} /></a>}
        </div>
        <ul className="ld-feed-list">
          {items.map(it => (
            <li key={it.id} className="ld-feed-item">
              <span className="ld-feed-date">{it.date}</span>
              {it.url
                ? <a className="ld-feed-title" href={it.url} target="_blank" rel="noopener">{it.title}</a>
                : <span className="ld-feed-title">{it.title}</span>}
              {it.source && <span className="ld-feed-src">{it.source}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// 소식 기능(api_feed.jsx)이 아직 실리지 않은 화면에서는 자리를 비워 둔다.
function LandingFeedSlot({ views }) {
  return typeof useFeedLatest === "function" ? <LandingFeedList views={views} /> : null;
}

Object.assign(window, { LandingFeedSlot, LandingFeedList });
