/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/psx/:path*',
        destination: 'https://psxterminal.com/api/:path*',
      },
    ];
  },
  // CORS is now handled by middleware.ts for dynamic origin handling
  // This allows proper CORS with credentials support
};

module.exports = nextConfig;
