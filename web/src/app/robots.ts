import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://halchal.bd';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/map', '/history', '/privacy', '/terms', '/z/'],
      disallow: ['/api/', '/admin/', '/auth/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
