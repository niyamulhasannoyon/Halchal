import React from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const baseUrl = siteConfig.url.replace(/\/+$/, '');

  // Generate BreadcrumbList JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const isLast = index === items.length - 1;
      const fullUrl = item.href
        ? item.href.startsWith('http')
          ? item.href
          : `${baseUrl}${item.href.startsWith('/') ? item.href : `/${item.href}`}`
        : baseUrl;

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        ...(item.href && !isLast ? { item: fullUrl } : {}),
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="ব্রেডক্রাম্ব" className={`text-sm text-neutral-400 ${className}`}>
        <ol className="flex flex-wrap items-center gap-1.5 list-none p-0 m-0">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={`${item.name}-${index}`} className="inline-flex items-center gap-1.5">
                {index > 0 && (
                  <svg
                    className="w-3.5 h-3.5 text-neutral-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {isLast || !item.href ? (
                  <span
                    className="text-neutral-200 font-medium truncate max-w-[200px] sm:max-w-none"
                    aria-current="page"
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-neutral-400 hover:text-emerald-400 transition-colors underline-offset-4 hover:underline"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
