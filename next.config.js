/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker/Cloud Run
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Configure for Cloud Run
  // Cloud Run provides PORT env var (8080 by default)
  // Next.js will use this automatically in standalone mode
}

module.exports = nextConfig
