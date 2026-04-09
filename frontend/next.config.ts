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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "nedrug.mfds.go.kr" },
      { protocol: "http", hostname: "nedrug.mfds.go.kr" },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
