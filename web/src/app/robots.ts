import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  const isNonProduction =
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
    process.env.APP_ENV === 'staging' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
    process.env.IS_STAGING === 'true' ||
    process.env.NEXT_PUBLIC_NOINDEX === 'true';

  if (isNonProduction) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  const baseUrl = siteConfig.url;

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/dhaka',
        '/dhaka/',
        '/lpg-price',
        '/load-shedding',
        '/gas-crisis-dhaka',
        '/map',
        '/history',
        '/privacy',
        '/terms',
        '/about',
        '/how-it-works',
        '/contact',
        '/guides',
        '/guides/',
        '/sitemap-pages',
        '/z/',
        '/api/og', // EXPLICITLY allow /api/og so social & image crawlers can fetch share cards
      ],
      disallow: [
        '/api/report',
        '/api/zone/',
        '/api/push/',
        '/api/restore-vote',
        '/api/user/',
        '/api/admin/',
        '/admin/',
        '/auth/',
        '/settings',
        '/notifications',
        '/login',
        '/design-preview',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
