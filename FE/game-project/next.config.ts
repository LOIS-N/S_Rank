import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
  // 1. 최신 버전에서는 experimental 밖으로 꺼내거나 아래와 같이 설정합니다.
  // 만약 계속 경고가 뜨면 아예 삭제해도 무방합니다 (로컬 개발에만 영향)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'authjs.dev' }
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  
  // CORS 문제 해결을 위한 Rewrite 설정 (EC2 백엔드)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://j14e204.p.ssafy.io:8001/api/:path*',
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);