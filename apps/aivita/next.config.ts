import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@medsoft/shared'],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
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
