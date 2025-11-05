/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL || 'http://localhost:8000',
  },
  async rewrites() {
    return [
      {
        source: '/api/orchestrator/:path*',
        destination: `${process.env.ORCHESTRATOR_URL || 'http://localhost:8000'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
