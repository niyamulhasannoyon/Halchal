/**
 * Halchal - Structured Data (JSON-LD) Engine
 * Architecture: Structured Data & Search Engine Discovery
 *
 * Implements:
 * 1. Safe JSON-LD serialization escaping '<', '>', '&' to prevent XSS / script breakout
 * 2. Strict Schema.org type definitions for WebSite, Organization, BreadcrumbList, WebPage
 * 3. Anti-overclaiming guardrails: No FAQPage, Review, Rating, AggregateRating, Event, or SearchAction
 * 4. Lint-style verification rules checking visible content alignment
 */

import { siteConfig } from '@/config/site';
import { getCanonicalUrl } from '@/lib/seo';

export interface SchemaOrgThing {
  '@context'?: 'https://schema.org';
  '@type': string;
  '@id'?: string;
  [key: string]: unknown;
}

export interface SchemaOrgWebSite extends SchemaOrgThing {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  '@id': string;
  name: string;
  alternateName?: string;
  url: string;
  inLanguage: string;
  description: string;
  publisher?: {
    '@id': string;
  };
  // Strictly NO SearchAction or potentialAction per ADR
}

export interface SchemaOrgOrganization extends SchemaOrgThing {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  '@id': string;
  name: string;
  alternateName?: string;
  url: string;
  logo: string;
  description?: string;
  sameAs?: string[];
  publishingPrinciples?: string;
}

export interface BreadcrumbElement {
  name: string;
  url: string;
}

export interface SchemaOrgBreadcrumbList extends SchemaOrgThing {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  '@id'?: string;
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

export interface SchemaOrgWebPage extends SchemaOrgThing {
  '@context': 'https://schema.org';
  '@type': 'WebPage';
  '@id': string;
  url: string;
  name: string;
  description: string;
  inLanguage: 'bn' | 'bn-BD';
  dateModified: string; // ISO 8601 string
  datePublished?: string; // ISO 8601 string
  isPartOf?: {
    '@id': string;
  };
  breadcrumb?: {
    '@id': string;
  } | SchemaOrgBreadcrumbList;
  publisher?: {
    '@id': string;
  };
}

export interface SchemaOrgGraph {
  '@context': 'https://schema.org';
  '@graph': SchemaOrgThing[];
}

/**
 * Safely serializes data to JSON-LD string escaping '<', '>', '&'.
 * This prevents script breakout vulnerabilities (XSS) when rendered inside <script type="application/ld+json">.
 */
export function serializeJsonLd(data: unknown): string {
  const json = JSON.stringify(data, null, 2);
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Creates Schema.org WebSite markup.
 * Strictly avoids SearchAction / sitelinks searchbox markup as Halchal does not operate a search engine.
 */
export function createWebSiteSchema(siteUrl?: string): SchemaOrgWebSite {
  const origin = (siteUrl || siteConfig.url).replace(/\/+$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: siteConfig.name,
    alternateName: siteConfig.nameEn,
    url: origin,
    inLanguage: 'bn',
    description: siteConfig.description,
    publisher: {
      '@id': `${origin}/#organization`,
    },
  };
}

/**
 * Creates Schema.org Organization markup.
 * Includes name, url, logo, and sameAs only if real external social profiles exist.
 */
export function createOrganizationSchema(
  siteUrl?: string,
  sameAsProfiles?: string[]
): SchemaOrgOrganization {
  const origin = (siteUrl || siteConfig.url).replace(/\/+$/, '');
  const org: SchemaOrgOrganization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: siteConfig.name,
    alternateName: siteConfig.nameEn,
    url: origin,
    logo: `${origin}/icons/icon-512.png`,
    description: siteConfig.description,
    publishingPrinciples: `${origin}/terms`,
  };

  const profiles = sameAsProfiles || (siteConfig as unknown as { sameAs?: string[] }).sameAs;
  if (profiles && profiles.length > 0) {
    org.sameAs = profiles;
  }

  return org;
}

/**
 * Creates Root JSON-LD combining WebSite and Organization in a clean @graph.
 */
export function createRootJsonLd(
  siteUrl?: string,
  sameAsProfiles?: string[]
): SchemaOrgGraph {
  const website = createWebSiteSchema(siteUrl);
  const organization = createOrganizationSchema(siteUrl, sameAsProfiles);

  // Return connected graph
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        ...organization,
        '@context': undefined,
      },
      {
        ...website,
        '@context': undefined,
      },
    ],
  };
}

/**
 * Creates Schema.org BreadcrumbList for area or hub pages.
 */
export function createBreadcrumbSchema(
  items: BreadcrumbElement[],
  canonicalUrl?: string,
  siteUrl?: string
): SchemaOrgBreadcrumbList {
  const origin = (siteUrl || siteConfig.url).replace(/\/+$/, '');
  const canonical = canonicalUrl ? getCanonicalUrl(canonicalUrl, origin) : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    ...(canonical ? { '@id': `${canonical}/#breadcrumb` } : {}),
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.url, origin),
    })),
  };
}

export interface WebPageSchemaOptions {
  title: string;
  description: string;
  pathOrUrl: string;
  type?: string;
  dateModified: string | Date;
  datePublished?: string | Date;
  breadcrumbs?: BreadcrumbElement[];
  siteUrl?: string;
}

/**
 * Helper to build WebPage JSON-LD compatible with about, contact, terms, privacy, and guide pages.
 */
export function buildWebPageJsonLd(options: {
  title: string;
  description: string;
  path: string;
  type?: string;
  dateModified?: string | Date;
  datePublished?: string | Date;
  breadcrumbs?: BreadcrumbElement[];
  siteUrl?: string;
}): SchemaOrgWebPage {
  return createWebPageSchema({
    title: options.title,
    description: options.description,
    pathOrUrl: options.path,
    type: options.type,
    dateModified: options.dateModified || new Date('2026-11-20T00:00:00.000Z'),
    datePublished: options.datePublished,
    breadcrumbs: options.breadcrumbs,
    siteUrl: options.siteUrl,
  });
}

export function buildArticleJsonLd(guide: {
  title?: string;
  metaDescription?: string;
  description?: string;
  path?: string;
  lastReviewed?: string;
  datePublished?: string;
  dateModified?: string;
  author?: { name: string; role?: string };
} | any) {
  const origin = siteConfig.url.replace(/\/+$/, '');
  const canonical = getCanonicalUrl(guide.path || '/guides');
  const pubDate = guide.datePublished || guide.lastReviewed || '2026-11-01T00:00:00.000Z';
  const modDate = guide.dateModified || guide.lastReviewed || '2026-11-20T00:00:00.000Z';

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title || '',
    description: guide.metaDescription || guide.description || '',
    inLanguage: 'bn-BD',
    datePublished: new Date(pubDate).toISOString(),
    dateModified: new Date(modDate).toISOString(),
    author: {
      '@type': 'Person',
      name: guide.author?.name || 'হালচাল টিম',
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: origin,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/icons/icon-512.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
  };
}

/**
 * Creates Schema.org WebPage markup with real dateModified and inLanguage: "bn".
 */
export function createWebPageSchema(options: WebPageSchemaOptions): SchemaOrgWebPage {
  const origin = (options.siteUrl || siteConfig.url).replace(/\/+$/, '');
  const canonical = getCanonicalUrl(options.pathOrUrl, origin);

  // Parse ISO dateModified
  const modDate =
    typeof options.dateModified === 'string'
      ? new Date(options.dateModified)
      : options.dateModified;
  const isoModified = !isNaN(modDate.getTime())
    ? modDate.toISOString()
    : new Date().toISOString();

  // Parse ISO datePublished (defaults to Halchal launch baseline)
  const pubDate = options.datePublished
    ? typeof options.datePublished === 'string'
      ? new Date(options.datePublished)
      : options.datePublished
    : new Date('2026-11-01T00:00:00.000Z');
  const isoPublished = !isNaN(pubDate.getTime())
    ? pubDate.toISOString()
    : '2026-11-01T00:00:00.000Z';

  return {
    '@context': 'https://schema.org',
    '@type': (options.type as any) || 'WebPage',
    '@id': `${canonical}/#webpage`,
    url: canonical,
    name: options.title,
    description: options.description,
    inLanguage: 'bn',
    dateModified: isoModified,
    datePublished: isoPublished,
    isPartOf: {
      '@id': `${origin}/#website`,
    },
    breadcrumb: {
      '@id': `${canonical}/#breadcrumb`,
    },
    publisher: {
      '@id': `${origin}/#organization`,
    },
  };
}

// =========================================================================
// ANTI-OVERCLAIMING LINT ENGINE
// =========================================================================

export const FORBIDDEN_SCHEMA_TYPES = [
  'FAQPage',
  'Question',
  'Answer',
  'Review',
  'Rating',
  'AggregateRating',
  'Event',
  'Product',
  'Offer',
  'LocalBusiness',
  'GovernmentService',
] as const;

export const FORBIDDEN_SCHEMA_FIELDS = [
  'potentialAction',
  'aggregateRating',
  'review',
  'ratingValue',
  'reviewCount',
  'priceRange',
  'offers',
  'eventSchedule',
  'performers',
] as const;

export interface LintResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Lint-style validator that strictly checks structured data objects against Google Search
 * quality standards and anti-overclaiming rules. Fails if the markup claims fields or types
 * not legitimately supported by the visible crowd-sourced page.
 */
export function lintStructuredData(
  schema: unknown,
  visibleTextChunks?: string[]
): LintResult {
  const errors: string[] = [];

  if (!schema || typeof schema !== 'object') {
    return { isValid: false, errors: ['Schema must be a non-null object'] };
  }

  function inspectNode(node: Record<string, unknown>, currentPath: string = '$'): void {
    if (!node || typeof node !== 'object') return;

    // 1. Check @type against forbidden rich result types
    const type = node['@type'];
    if (typeof type === 'string') {
      if (FORBIDDEN_SCHEMA_TYPES.includes(type as (typeof FORBIDDEN_SCHEMA_TYPES)[number])) {
        errors.push(
          `Forbidden schema type "${type}" detected at ${currentPath}. Halchal strictly forbids overclaiming rich results.`
        );
      }
    } else if (Array.isArray(type)) {
      for (const t of type) {
        if (FORBIDDEN_SCHEMA_TYPES.includes(t as (typeof FORBIDDEN_SCHEMA_TYPES)[number])) {
          errors.push(
            `Forbidden schema type "${t}" in array at ${currentPath}.`
          );
        }
      }
    }

    // 2. Check forbidden fields
    for (const field of FORBIDDEN_SCHEMA_FIELDS) {
      if (field in node && node[field] !== undefined) {
        errors.push(
          `Forbidden field "${field}" detected at ${currentPath}.${field}. Visible crowd data cannot justify this markup.`
        );
      }
    }

    // 3. WebSite specific rule: NO SearchAction / potentialAction
    if (type === 'WebSite') {
      if ('potentialAction' in node || 'searchAction' in node) {
        errors.push(
          `SearchAction/sitelinks searchbox is strictly forbidden on WebSite at ${currentPath}.`
        );
      }
    }

    // 4. WebPage specific rules: inLanguage must be Bengali, dateModified must be valid ISO
    if (type === 'WebPage') {
      const inLang = node['inLanguage'];
      if (inLang !== 'bn' && inLang !== 'bn-BD') {
        errors.push(
          `WebPage inLanguage must be "bn" or "bn-BD" at ${currentPath}, found "${inLang}".`
        );
      }

      const dateMod = node['dateModified'];
      if (!dateMod || typeof dateMod !== 'string') {
        errors.push(
          `WebPage must have a string "dateModified" timestamp at ${currentPath}.`
        );
      } else {
        const d = new Date(dateMod);
        if (isNaN(d.getTime())) {
          errors.push(
            `WebPage dateModified "${dateMod}" is not a valid ISO 8601 date at ${currentPath}.`
          );
        }
      }
    }

    // 5. BreadcrumbList specific rules
    if (type === 'BreadcrumbList') {
      const items = node['itemListElement'];
      if (!Array.isArray(items) || items.length === 0) {
        errors.push(`BreadcrumbList must contain at least one item at ${currentPath}.`);
      } else {
        items.forEach((item, idx) => {
          if (!item || typeof item !== 'object') {
            errors.push(`Breadcrumb item ${idx} is not an object.`);
            return;
          }
          if (item['@type'] !== 'ListItem') {
            errors.push(`Breadcrumb item ${idx} @type must be "ListItem".`);
          }
          if (item['position'] !== idx + 1) {
            errors.push(
              `Breadcrumb item ${idx} position must be ${idx + 1}, found ${item['position']}.`
            );
          }
          if (!item['name'] || typeof item['name'] !== 'string') {
            errors.push(`Breadcrumb item ${idx} must have non-empty string name.`);
          }
          if (!item['item'] || typeof item['item'] !== 'string' || !item['item'].startsWith('http')) {
            errors.push(`Breadcrumb item ${idx} item URL must be absolute.`);
          }
        });
      }
    }

    // 6. Visible Content Correlation Check
    if (visibleTextChunks && visibleTextChunks.length > 0) {
      const name = node['name'];
      if (typeof name === 'string' && name.trim()) {
        const isMatched = visibleTextChunks.some((chunk) =>
          chunk.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(chunk.toLowerCase())
        );
        if (!isMatched && type !== 'Organization' && type !== 'WebSite') {
          errors.push(
            `Schema name "${name}" at ${currentPath} was not found among visible text on the page.`
          );
        }
      }
    }

    // Recursively inspect object properties and arrays
    for (const [key, val] of Object.entries(node)) {
      if (key === '@context') continue;
      if (Array.isArray(val)) {
        val.forEach((elem, i) => {
          if (elem && typeof elem === 'object') {
            inspectNode(elem as Record<string, unknown>, `${currentPath}.${key}[${i}]`);
          }
        });
      } else if (val && typeof val === 'object') {
        inspectNode(val as Record<string, unknown>, `${currentPath}.${key}`);
      }
    }
  }

  inspectNode(schema as Record<string, unknown>);

  return {
    isValid: errors.length === 0,
    errors,
  };
}
