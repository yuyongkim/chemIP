// 첫 방문 언어 힌트: 사이트 HTML 답에 접속 나라 쿠키(chemip-geo=<ISO 2자리>)를 붙인다. 언어는 화면(lang.jsx)이 정한다 —
// 주소 ?lang= → 저장한 선택 → 브라우저 언어가 한국어면 ko → 나라가 KR 이 아니면 en → ko.
// 검색 로봇에는 붙이지 않는다(해외에서 긁는 로봇이 한국어 화면을 영어로 색인하지 않게).
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse|headless/i;
export const GEO_COOKIE = "chemip-geo";

export function geoCookie(request) {
  const cc = String((request.cf && request.cf.country) || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  if (BOT_UA.test(request.headers.get("user-agent") || "")) return null;
  return `${GEO_COOKIE}=${cc}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;
}
