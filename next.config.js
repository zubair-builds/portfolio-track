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
};

module.exports = nextConfig;
