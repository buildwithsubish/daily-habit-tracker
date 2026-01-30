/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure static page generation caching
  experimental: {
    staleTimes: {
      dynamic: 60, // 1 minute for dynamic pages
      static: 300, // 5 minutes for static pages
    },
  },
}

module.exports = nextConfig

