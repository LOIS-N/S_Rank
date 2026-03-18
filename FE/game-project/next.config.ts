import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'authjs.dev' }
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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

export default withSentryConfig(withPWA(nextConfig), {
  org: "ssafy-e204",
  project: "javascript-nextjs",
  silent: true,
});
