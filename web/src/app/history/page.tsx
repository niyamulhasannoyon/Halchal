import React from 'react';
import type { Metadata } from 'next';
import { DEFAULT_DHAKA_ZONE, getZoneMetadata } from '@/lib/zones';
import { createDefaultZone7DayInsights, Zone7DayInsights } from '@/lib/insights';
import { getCachedZoneInsights } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import { siteConfig } from '@/config/site';
import { BreadcrumbJsonLd, WebPageJsonLd } from '@/components/seo/JsonLd';
import { HistoryClientView } from './HistoryClientView';

export const revalidate = 60; // 60s ISR revalidation

export const metadata: Metadata = buildMetadata({
  title: '৭ দিনের ইউটিলিটি রিপোর্ট ও ইতিহাস',
  description:
    'এলাকাভিত্তিক গত ৭ দিনের বিদ্যুৎ বিভ্রাট, গ্যাস সংকট ও পানির প্রেসারের নির্ভরযোগ্য ইতিহাস এবং কমিউনিটি বিশ্লেষণ। নাগরিকদের রিপোর্টের সারসংক্ষেপ।',
  path: '/history',
});

interface HistoryPageProps {
  searchParams: Promise<{
    h3?: string;
  }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const { h3 } = await searchParams;
  const targetZone = (h3 ? getZoneMetadata(h3) : null) || DEFAULT_DHAKA_ZONE;
  const targetH3 = targetZone.h3_index;

  let initialInsights: Zone7DayInsights | null = null;

  try {
    // 1. Try Redis cache
    initialInsights = await getCachedZoneInsights<Zone7DayInsights>(targetH3);

    // 2. On miss, try Supabase RPC
    if (!initialInsights) {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.rpc('get_zone_7day_insights', { p_h3: targetH3 });
      if (!error && data) {
        initialInsights = data as Zone7DayInsights;
      }
    }
  } catch {
    // Fallback on error
  }

  if (!initialInsights) {
    initialInsights = createDefaultZone7DayInsights(
      targetH3,
      targetZone.area_name_bn,
      targetZone.ward,
      targetZone.city,
      { isSynthetic: true }
    );
  }

  const historyBreadcrumbs = [
    { name: 'হোম', url: siteConfig.url },
    { name: 'ইউটিলিটি ইতিহাস', url: `${siteConfig.url}/history` },
    ...(h3 && targetZone
      ? [
          {
            name: `${targetZone.area_name_bn} ইতিহাস`,
            url: `${siteConfig.url}/history?h3=${targetH3}`,
          },
        ]
      : []),
  ];

  return (
    <>
      <BreadcrumbJsonLd
        items={historyBreadcrumbs}
        canonicalUrl={h3 ? `${siteConfig.url}/history?h3=${targetH3}` : `${siteConfig.url}/history`}
      />
      <WebPageJsonLd
        title="৭ দিনের ইউটিলিটি রিপোর্ট ও ইতিহাস"
        description="এলাকাভিত্তিক গত ৭ দিনের বিদ্যুৎ বিভ্রাট, গ্যাস সংকট ও পানির প্রেসারের নির্ভরযোগ্য ইতিহাস এবং কমিউনিটি বিশ্লেষণ। নাগরিকদের রিপোর্টের সারসংক্ষেপ।"
        pathOrUrl={h3 ? `/history?h3=${targetH3}` : '/history'}
        dateModified={initialInsights.generated_at}
      />
      <HistoryClientView
        initialZone={targetZone}
        initialInsights={initialInsights}
      />
    </>
  );
}
