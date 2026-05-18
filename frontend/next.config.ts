import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // AI servisi için CORS bypass — gateway multipart'ı desteklemiyor
  async rewrites() {
    return [
      {
        source: '/ai-proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_AI_DIRECT_URL ?? 'http://localhost:3004/api'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
