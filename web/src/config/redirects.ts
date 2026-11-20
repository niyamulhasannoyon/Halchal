/**
 * Halchal - URL Redirects Specification
 * Architecture: Technical SEO Foundation (ADR-0017)
 *
 * Implements 301 Permanent Redirects for renamed slugs and legacy aliases
 * to preserve search equity and prevent soft 404 penalties.
 */

import redirectsData from './redirects.json';

export interface SlugRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

export const SLUG_REDIRECTS: SlugRedirect[] = redirectsData as SlugRedirect[];
