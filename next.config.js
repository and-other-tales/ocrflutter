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

  // Build optimizations
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  // Reduce memory usage during build
  typescript: {
    tsconfigPath: './tsconfig.json',
  },

  // Disable SWC minification if it causes issues (use terser instead)
  // swcMinify: false,
}

module.exports = nextConfig
