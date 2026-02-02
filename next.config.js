
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  allowedDevOrigins: ['881fb39d-a511-4e88-8f4f-f3055dfa4796-00-344r8pux93lao.kirk.replit.dev', '127.0.0.1'],
  experimental: {
    ppr: false,
  },
  images: {
    unoptimized: true
  },
  async rewrites() {
    return []
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
