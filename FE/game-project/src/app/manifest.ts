import type { MetadataRoute } from 'next';

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'S급 개발자들이 나를 따르는 이유',
    short_name: 'S급개발자',
    description: '최고의 스타트업을 만들어보세요.',
    start_url: '/',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: `${ASSET_BASE}/assets/icons/icon-192.webp`,
        sizes: '192x192',
        type: 'image/webp',
      },
      {
        src: `${ASSET_BASE}/assets/icons/icon-512.webp`,
        sizes: '512x512',
        type: 'image/webp',
      },
    ],
  };
}