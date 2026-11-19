import type { MetadataRoute } from 'next';
import { DHAKA_SEED_ZONES } from '@/lib/zones';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://halchal.bd';
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'always',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/history`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  const zoneRoutes: MetadataRoute.Sitemap = DHAKA_SEED_ZONES.map((zone) => ({
    url: `${baseUrl}/z/${zone.h3_index}`,
    lastModified: now,
    changeFrequency: 'always',
    priority: 0.8,
  }));

  return [...staticRoutes, ...zoneRoutes];
}
