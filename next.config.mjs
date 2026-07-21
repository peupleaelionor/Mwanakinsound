/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Africa-first: aggressively optimize the images that dominate the UI (covers, avatars).
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Supabase Storage public buckets.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      // Cloudflare R2 / CDN for massive audio-adjacent assets.
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'cdn.mwanakinsound.com' },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  experimental: {
    // Ship less JS: only import the icons/components actually used.
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Long-cache the service worker's audio/static assets.
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
