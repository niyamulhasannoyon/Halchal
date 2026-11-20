import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import withBundleAnalyzer from '@next/bundle-analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const redirectsList = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'src/config/redirects.json'), 'utf8')
);

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true, // Enables Brotli and Gzip compression
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    '/api/og': ['./public/fonts/**/*'],
  },
  serverExternalPackages: ['@resvg/resvg-js'],
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  async redirects() {
    return redirectsList;
  },
  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/sitemap/dhaka.xml',
      },
    ];
  },
  async headers() {
    const isNonProduction =
      process.env.VERCEL_ENV === 'preview' ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
      process.env.APP_ENV === 'staging' ||
      process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
      process.env.IS_STAGING === 'true' ||
      process.env.NEXT_PUBLIC_NOINDEX === 'true';

    return [
      // Enforce strict noindex on staging and preview deployments to prevent search index competition
      ...(isNonProduction
        ? [
            {
              source: '/:path*',
              headers: [
                { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
              ],
            },
          ]
        : []),
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
      // API responses strictly protected from crawler indexation
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      // Immutable hashed Next.js static chunks (JS, CSS)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
        ],
      },
      // Web fonts immutable cache
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // PWA icons and favicons
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/(favicon.ico|apple-touch-icon.png|og-fallback.png)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // Dynamic OG Image generation with edge caching
      {
        source: '/api/og',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=600, s-maxage=600, stale-while-revalidate=86400' },
          { key: 'X-Robots-Tag', value: 'all' },
        ],
      },
    ];
  },
};

export default bundleAnalyzer(nextConfig);
