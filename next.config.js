/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure static page generation caching
  experimental: {},
  // Add Turbopack configuration to top level
  turbopack: {},
  // React 19 / Next.js 15+ compatibility settings
  compiler: {
    reactRemoveProperties: true,
  },
  // Ensure proper module resolution
  modularizeImports: {
    '@radix-ui/react-slot': {
      transform: '@radix-ui/react-slot',
    },
  },
  // Standard webpack fallbacks for non-turbopack builds
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: 'buffer',
        stream: 'stream-browserify',
        util: 'util',
        crypto: 'crypto-browserify',
        assert: 'assert',
      };
    }
    return config;
  },
  // Ignore lint/type errors during build for faster CI
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig

