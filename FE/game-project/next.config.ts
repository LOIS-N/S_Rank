import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
  // 1. 최신 버전에서는 experimental 밖으로 꺼내거나 아래와 같이 설정합니다.
  // 만약 계속 경고가 뜨면 아예 삭제해도 무방합니다 (로컬 개발에만 영향)
  experimental: {
    // @ts-ignore
    allowedDevOrigins: [
      "localhost:3000",
      "127.0.0.1:3000",
      "192.168.56.1:3000",
      "172.24.208.1:3000"
    ],
  },

  // 2. CSP 'eval' 에러 해결을 위한 웹팩/터보팩 설정
  // 개발 환경에서 소스맵 생성 방식 때문에 발생할 수 있습니다.

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'authjs.dev' }
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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