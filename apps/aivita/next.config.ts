import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const CABINET_ROUTES = 'home|profile|habits|nutrition|chat|test|family|report|settings|notifications|install';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@medsoft/shared'],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        // Service worker must be served with correct scope and no caching
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        // Prevent bfcache from serving stale authenticated pages after sign-out
        source: `/:locale(ru|uz|en)/:path(${CABINET_ROUTES})`,
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
        ],
      },
      {
        source: `/:locale(ru|uz|en)/:path(${CABINET_ROUTES})/:rest*`,
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Route /downloads/aivita.apk through an API handler
      // (Next.js won't serve .apk from public/ in standalone mode without this)
      {
        source: '/downloads/aivita.apk',
        destination: '/api/download/apk',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
