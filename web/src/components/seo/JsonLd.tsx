import React from 'react';
import {
  serializeJsonLd,
  createRootJsonLd,
  createBreadcrumbSchema,
  createWebPageSchema,
  BreadcrumbElement,
  SchemaOrgGraph,
  SchemaOrgBreadcrumbList,
  SchemaOrgWebPage,
} from '@/lib/json-ld';
import { siteConfig } from '@/config/site';

interface JsonLdProps {
  data: unknown;
  id?: string;
}

/**
 * Base server component rendering a safe <script type="application/ld+json">.
 * Serializes data via serializeJsonLd to escape '<', '>', '&', completely preventing script breakout.
 */
export function JsonLd({ data, id }: JsonLdProps) {
  if (!data) return null;

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
    />
  );
}

/**
 * Server component rendering WebSite and Organization JSON-LD on root layout.
 * Strictly excludes SearchAction/sitelinks searchbox markup.
 */
export function RootJsonLd({
  siteUrl,
  sameAsProfiles,
}: {
  siteUrl?: string;
  sameAsProfiles?: string[];
}) {
  const rootGraph: SchemaOrgGraph = createRootJsonLd(siteUrl, sameAsProfiles);
  return <JsonLd data={rootGraph} id="halchal-root-jsonld" />;
}

/**
 * Server component rendering BreadcrumbList markup on area and hub pages.
 */
export function BreadcrumbJsonLd({
  items,
  canonicalUrl,
}: {
  items: BreadcrumbElement[];
  canonicalUrl?: string;
}) {
  const breadcrumbSchema: SchemaOrgBreadcrumbList = createBreadcrumbSchema(items, canonicalUrl);
  return <JsonLd data={breadcrumbSchema} id="halchal-breadcrumb-jsonld" />;
}

/**
 * Server component rendering WebPage markup with real dateModified and inLanguage: "bn".
 */
export function WebPageJsonLd({
  title,
  description,
  pathOrUrl,
  dateModified,
  datePublished,
  siteUrl,
}: {
  title: string;
  description: string;
  pathOrUrl: string;
  dateModified: string | Date;
  datePublished?: string | Date;
  siteUrl?: string;
}) {
  const webpageSchema: SchemaOrgWebPage = createWebPageSchema({
    title,
    description,
    pathOrUrl,
    dateModified,
    datePublished,
    siteUrl,
  });

  return <JsonLd data={webpageSchema} id="halchal-webpage-jsonld" />;
}
