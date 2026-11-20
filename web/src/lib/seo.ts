/**
 * Halchal - Technical SEO & Metadata Engine
 * Architecture: Technical SEO Foundation (ADR-0017)
 *
 * Implements:
 * 1. Canonical URL normalization (case sensitivity, trailing slash, ?t= & tracking param stripping)
 * 2. Crowd-sourced data indexation gating via shouldIndexZone()
 * 3. Unified buildMetadata() ensuring consistent title, description, and canonical tags across all routes
 * 4. SERP preview formatter and length compliance checks
 */

import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { UtilityCategory, ZoneDisplayState } from '@/lib/theme';

export interface ZoneIndexCriteria {
  h3_index?: string;
  confirmed_days_last_30_days?: number;
  confirmedDaysLast30Days?: number;
  distinct_reporters_ever?: number;
  distinctReportersEver?: number;
  distinct_days?: number;
  total_reporters?: number;
  has_confirmed_data?: boolean;
  hasConfirmedData?: boolean;
  state?: ZoneDisplayState;
  categories?: Record<UtilityCategory, { state: ZoneDisplayState; distinct_reporters?: number }> | Record<string, any>;
  [key: string]: any;
}

export interface BuildMetadataOptions {
  title: NonNullable<Metadata['title']>;
  description: string;
  path?: string;
  canonicalPath?: string;
  ogImage?: string | { url: string; width?: number; height?: number; alt?: string };
  noindex?: boolean;
  type?: 'website' | 'article';
}

/**
 * Normalizes any relative or absolute path into an authoritative absolute canonical URL.
 * Strictly complies with ADR-0017:
 * - Lowercases hex slugs (e.g. /z/883CF... -> /z/883cf...)
 * - Normalizes trailing slashes (strips trailing slash except for root '/')
 * - Strips cache-busting timestamp parameter '?t='
 * - Strips marketing/tracking parameters (utm_*, fbclid, gclid, etc.)
 */
export function getCanonicalUrl(pathOrUrl: string = '/', baseOrigin?: string): string {
  const origin = (baseOrigin || siteConfig.url).replace(/\/+$/, '');

  try {
    // If input is relative, resolve against dummy origin
    const urlObj = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
      ? new URL(pathOrUrl)
      : new URL(pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`, 'https://dummy.local');

    // 1. Normalize pathname
    let pathname = urlObj.pathname;

    // Lowercase hex slugs under /z/
    if (pathname.startsWith('/z/')) {
      const parts = pathname.split('/');
      // /z/[slug]
      if (parts[2]) {
        parts[2] = parts[2].toLowerCase();
      }
      pathname = parts.join('/');
    }

    // Strip trailing slash (unless root '/')
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // 2. Strip tracking params and cache busters (?t=, utm_*, fbclid, gclid)
    const paramsToKeep: [string, string][] = [];
    urlObj.searchParams.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey === 't' ||
        lowerKey === 'fbclid' ||
        lowerKey === 'gclid' ||
        lowerKey.startsWith('utm_')
      ) {
        // Drop cache-buster & tracking param
        return;
      }
      paramsToKeep.push([key, value]);
    });

    const search = paramsToKeep.length > 0
      ? '?' + new URLSearchParams(paramsToKeep).toString()
      : '';

    return `${origin}${pathname}${search}`;
  } catch {
    // Fallback if parsing fails
    const cleanPath = pathOrUrl.split('?')[0].replace(/\/+$/, '') || '/';
    return `${origin}${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`;
  }
}

/**
 * Decides whether a crowd-sourced zone page meets search engine indexing standards.
 * Rules:
 * - Must have confirmed data on at least 3 distinct days in the last 30 days
 * - AND at least 10 distinct reporters ever
 * - Pages in unknown or unverified state NEVER get indexed on that basis alone
 * - Otherwise emits noindex, follow and excludes from sitemap
 */
export function shouldIndexZone(zone: ZoneIndexCriteria | null | undefined): boolean {
  if (!zone || typeof zone !== 'object') {
    return false;
  }

  // 1. Resolve distinct confirmed days in the last 30 days
  const confirmedDays =
    zone.confirmedDaysLast30Days ??
    zone.confirmed_days_last_30_days ??
    zone.distinct_days ??
    0;

  // 2. Resolve distinct reporters ever
  const reportersEver =
    zone.distinctReportersEver ??
    zone.distinct_reporters_ever ??
    zone.total_reporters ??
    0;

  // 3. Minimum thresholds: at least 3 confirmed days AND at least 10 distinct reporters
  if (confirmedDays < 3 || reportersEver < 10) {
    return false;
  }

  // 4. "Pages in unknown/unverified state NEVER get indexed on that basis alone"
  // If explicitly flagged with zero confirmed data
  if (zone.hasConfirmedData === false || zone.has_confirmed_data === false) {
    return false;
  }

  // If a single overall state is provided, check if it's purely unknown or unverified
  if (zone.state === 'unknown' || zone.state === 'unverified') {
    // Even if reporters exist, unverified/unknown current state without confirmed data history cannot index
    if (confirmedDays < 3) return false;
  }

  // If categories status dictionary is provided, inspect category states
  if (zone.categories && typeof zone.categories === 'object') {
    const categoryEntries = Object.values(zone.categories);
    if (categoryEntries.length > 0) {
      const allUnknownOrUnverified = categoryEntries.every(
        (cat) => cat && (cat.state === 'unknown' || cat.state === 'unverified')
      );
      // If currently all categories are unknown/unverified and no confirmed days recorded
      if (allUnknownOrUnverified && confirmedDays < 3) {
        return false;
      }
    }
  }

  return true;
}

export function getTimeBucket(): string {
  return String(Math.floor(Date.now() / 600000));
}

export function appendOgTimeBucket(url: string, bucket?: string): string {
  const t = bucket || getTimeBucket();
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('t')) {
      parsed.searchParams.set('t', t);
    }
    return parsed.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}t=${t}`;
  }
}

/**
 * Reusable metadata builder ensuring that NO route ships without:
 * - Unique Bengali title
 * - Unique description
 * - Absolute canonical URL without ?t= or tracking params
 * - Consistent Open Graph and Twitter tags (with og:locale = bn_BD)
 * - Safe robots configuration
 */
export function buildMetadata(options: BuildMetadataOptions): Metadata {
  const {
    title,
    description,
    path = '/',
    canonicalPath,
    ogImage,
    noindex = false,
    type = 'website',
  } = options;

  const canonicalUrl = getCanonicalUrl(canonicalPath || path);

  // Format OG image URL (with 10-minute time bucket strictly restricted to the image URL)
  const defaultOgImage = `${siteConfig.url}/api/og`;
  let formattedOgImages: Array<{ url: string; width: number; height: number; alt: string }>;

  if (typeof ogImage === 'string') {
    const absoluteImg = ogImage.startsWith('http') ? ogImage : `${siteConfig.url}${ogImage.startsWith('/') ? ogImage : '/' + ogImage}`;
    const imgUrlWithBucket = absoluteImg.includes('/api/og') ? appendOgTimeBucket(absoluteImg) : absoluteImg;
    formattedOgImages = [
      {
        url: imgUrlWithBucket,
        width: 1200,
        height: 630,
        alt: typeof title === 'string' ? `${title} — ${siteConfig.name}` : siteConfig.name,
      },
    ];
  } else if (ogImage && typeof ogImage === 'object') {
    const absoluteImg = ogImage.url.startsWith('http') ? ogImage.url : `${siteConfig.url}${ogImage.url.startsWith('/') ? ogImage.url : '/' + ogImage.url}`;
    const imgUrlWithBucket = absoluteImg.includes('/api/og') ? appendOgTimeBucket(absoluteImg) : absoluteImg;
    formattedOgImages = [
      {
        url: imgUrlWithBucket,
        width: ogImage.width || 1200,
        height: ogImage.height || 630,
        alt: ogImage.alt || (typeof title === 'string' ? title : siteConfig.name),
      },
    ];
  } else {
    formattedOgImages = [
      {
        url: appendOgTimeBucket(defaultOgImage),
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ];
  }

  const plainTitle =
    typeof title === 'string'
      ? title
      : typeof title === 'object' && title !== null && 'default' in title
      ? (title as { default: string }).default
      : typeof title === 'object' && title !== null && 'absolute' in title
      ? (title as { absolute: string }).absolute
      : String(title);

  const isNonProduction =
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
    process.env.APP_ENV === 'staging' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
    process.env.IS_STAGING === 'true' ||
    process.env.NEXT_PUBLIC_NOINDEX === 'true';

  const effectiveNoindex = noindex || isNonProduction;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: plainTitle,
      description,
      url: canonicalUrl,
      siteName: siteConfig.name,
      locale: siteConfig.ogLocale,
      type,
      images: formattedOgImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: plainTitle,
      description,
      images: [formattedOgImages[0].url],
    },
    robots: effectiveNoindex
      ? {
          index: false,
          follow: !isNonProduction,
          googleBot: {
            index: false,
            follow: !isNonProduction,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
  };
}

/**
 * SERP Preview Helper
 * Formats a Google search snippet preview for unit tests and visual verification.
 */
export function formatSerpPreview(
  title: string,
  description: string,
  path: string = '/'
) {
  const canonical = getCanonicalUrl(path);
  const formattedTitle = title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`;

  return {
    title: formattedTitle,
    titleLength: formattedTitle.length,
    description,
    descriptionLength: description.length,
    canonical,
    isTitleWithinBudget: formattedTitle.length <= 60,
    isDescriptionWithinBudget: description.length >= 100 && description.length <= 165,
    previewBlock: `
┌─────────────────────────────────────────────────────────────┐
│ Google SERP Preview                                         │
├─────────────────────────────────────────────────────────────┤
│ ${canonical}                                                │
│ \x1b[34m${formattedTitle}\x1b[0m (${formattedTitle.length} chars)                                    │
│ ${description} (${description.length} chars)
└─────────────────────────────────────────────────────────────┘
    `.trim(),
  };
}
