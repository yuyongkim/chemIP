import type { NextConfig } from "next";

const defaultBackendOrigin = "http://127.0.0.1:7011";
const rawBackendOrigin = process.env.BACKEND_ORIGIN ?? defaultBackendOrigin;

function resolveBackendOrigin(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return defaultBackendOrigin;
    }
    return parsed.origin;
  } catch {
    return defaultBackendOrigin;
  }
}

const backendOrigin = resolveBackendOrigin(rawBackendOrigin);

const LEGACY_PAGES = ['/home', '/chemical/:path*', '/patents', '/guide', '/drugs', '/ghs', '/trade', '/docs'];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "nedrug.mfds.go.kr" },
      { protocol: "http", hostname: "nedrug.mfds.go.kr" },
    ],
  },
  // 고정 사본(vendor)과 화면 묶음(dist/app.js?v=해시)은 브라우저·Cloudflare 가 오래 들고 있게 한다.
  // 묶음은 내용이 바뀌면 ?v= 가 바뀌므로 오래 둬도 옛 화면이 남지 않는다.
  // 예전 Next 화면들(/home, /chemical …)은 지금 화면(/chemip)과 내용이 겹친다. 그대로 열리되 검색엔진 색인에서는 뺀다.
  async headers() {
    return [
      ...LEGACY_PAGES.map(source => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }] })),
      { source: '/chemip/vendor/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
      { source: '/chemip/dist/app.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
  // 원본(개발용) 주소로 들어오면 운영 화면으로 보낸다. 루트(/)도 이 주소로 보내므로 함께 정리된다.
  async redirects() {
    return [{ source: '/chemip/index.html', destination: '/chemip', permanent: true }];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
      // 물질별 특허 매핑 파일 — Cloudflare 에서는 Worker(R2)가, 이 PC 에서는 백엔드가 같은 주소로 내준다
      // (backend/api/routes/patent_mapping.py, 로컬 E:\dev-cache\chemip-patents\out\v1 읽기 전용).
      {
        source: '/data/v1/pat/:cas/:file',
        destination: `${backendOrigin}/data/v1/pat/:cas/:file`,
      },
      // 규제 목록·변경 알림 정적 파일(v1/reg/) — 배포에서는 Worker(R2), 이 PC 에서는 백엔드가 같은 주소로 내준다
      // (backend/api/routes/static_areas.py, 로컬 E:/dev-cache/chemip-static/out/v1 읽기 전용).
      {
        source: '/data/v1/reg/:path*',
        destination: `${backendOrigin}/data/v1/reg/:path*`,
      },
      // 노출기준 비교 정적 파일(v1/oel/<CAS>.json) — 배포에서는 Worker(R2), 이 PC 에서는 백엔드 static_areas.py 가 같은 주소로 내준다.
      {
        source: '/data/v1/oel/:file',
        destination: `${backendOrigin}/data/v1/oel/:file`,
      },
      // 비상대응 기준 정적 파일(v1/el/<CAS>.json, v1/el/index.json) — 배포는 Worker(R2), 이 PC 는 백엔드 static_areas.py.
      {
        source: '/data/v1/el/:file',
        destination: `${backendOrigin}/data/v1/el/:file`,
      },
      // 화학사고 소식 정적 파일(v1/feed/latest.json, v1/feed/by-cas/<CAS>.json) — 배포는 Worker(R2), 이 PC 는 백엔드 static_areas.py.
      {
        source: '/data/v1/feed/:path*',
        destination: `${backendOrigin}/data/v1/feed/:path*`,
      },
      // 물성·식별자(f)·관련 물질(rel)·PRTR 지도(prtr)·기술지침 본문 색인(gs)·공용 파일(g)·온도별 물성(tp)·국내 법령 말뭉치(law) — 배포는 Worker(R2), 이 PC 는 백엔드 static_areas.py.
      {
        source: '/data/v1/:area(f|rel|prtr|gs|g|tp|law)/:file',
        destination: `${backendOrigin}/data/v1/:area/:file`,
      },
      // 운영 화면은 미리 번역한 dist/index.html(scripts/build_chemip.cjs). 원본 index.html 은 개발용으로 남는다.
      {
        source: '/chemip',
        destination: '/chemip/dist/index.html',
      },
      {
        source: '/chemip/',
        destination: '/chemip/dist/index.html',
      },
    ];
  },
};

export default nextConfig;
