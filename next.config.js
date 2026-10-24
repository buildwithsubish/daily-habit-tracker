/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https:;",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
