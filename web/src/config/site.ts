/**
 * Halchal - Site Configuration Module
 * Architecture: Technical SEO Foundation (ADR-0017)
 *
 * Provides a single typed source of truth for site branding, locale,
 * and canonical origin. Fails production builds if the site URL is missing.
 */

export interface SiteConfig {
  name: string;
  nameEn: string;
  locale: string;
  ogLocale: string;
  tagline: string;
  description: string;
  url: string;
  links: {
    terms: string;
    privacy: string;
    map: string;
    history: string;
    about: string;
    howItWorks: string;
    contact: string;
    guides: string;
    sitemap: string;
  };
}

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!url) {
    if (process.env.NODE_ENV === 'production' && !process.env.HALCHAL_TEST_MODE) {
      throw new Error(
        'CRITICAL: NEXT_PUBLIC_SITE_URL (or NEXT_PUBLIC_APP_URL) is missing in production environment. ' +
          'Production build aborted to prevent corrupted canonical URLs and metadataBase.'
      );
    }
    return 'http://localhost:3000';
  }

  // Normalize by stripping trailing slash
  return url.replace(/\/+$/, '');
}

export const siteConfig: SiteConfig = {
  name: 'হালচাল',
  nameEn: 'Halchal',
  locale: 'bn-BD',
  ogLocale: 'bn_BD',
  tagline: 'এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর',
  description:
    'এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস।',
  get url() {
    return getSiteUrl();
  },
  links: {
    terms: '/terms',
    privacy: '/privacy',
    map: '/map',
    history: '/history',
    about: '/about',
    howItWorks: '/how-it-works',
    contact: '/contact',
    guides: '/guides',
    sitemap: '/sitemap-pages',
  },
};
