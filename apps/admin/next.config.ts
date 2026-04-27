import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@medsoft/shared'],
  experimental: {
    serverActions: { allowedOrigins: ['admin.aivita.uz', 'localhost:3000'] },
  },
};

export default nextConfig;
