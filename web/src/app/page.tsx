import React from 'react';
import type { Metadata } from 'next';
import { DEFAULT_DHAKA_ZONE, createDefaultZoneStatus, ZoneStatusResponse } from '@/lib/zones';
import { getCachedZoneStatus } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import { siteConfig } from '@/config/site';
import { BreadcrumbJsonLd, WebPageJsonLd } from '@/components/seo/JsonLd';
import { HomeClientView } from './HomeClientView';

export const revalidate = 60; // 60s ISR revalidation

export const metadata: Metadata = buildMetadata({
  title: 'হালচাল — এলাকার লাইভ ইউটিলিটি খবর',
  description:
    'এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস জানুন। নাগরিকদের তথ্যের ভিত্তিতে হালচাল।',
  path: '/',
});

export default async function HomePage() {
  const defaultH3 = DEFAULT_DHAKA_ZONE.h3_index;
  let statusData: ZoneStatusResponse | null = null;

  try {
    // 1. Try Redis cache
    statusData = await getCachedZoneStatus<ZoneStatusResponse>(defaultH3);

    // 2. On miss, query Supabase
    if (!statusData) {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.rpc('get_zone_status', { p_h3: defaultH3 });
      if (!error && data && Array.isArray(data) && data.length > 0) {
        statusData = createDefaultZoneStatus(defaultH3);
        for (const row of data) {
          if (statusData.categories[row.category as keyof typeof statusData.categories]) {
            statusData.categories[row.category as keyof typeof statusData.categories] = {
              category: row.category,
              state: row.state,
              distinct_reporters: row.distinct_reporters,
              weighted_score: Number(row.weighted_score || 0),
              state_since: row.state_since,
              updated_at: row.updated_at,
            };
          }
        }
      }
    }
  } catch {
    // Non-fatal, fallback to default
  }

  if (!statusData) {
    statusData = createDefaultZoneStatus(defaultH3);
  }

  return (
    <>
      <BreadcrumbJsonLd
        items={[{ name: 'হোম', url: siteConfig.url }]}
        canonicalUrl={siteConfig.url}
      />
      <WebPageJsonLd
        title="হালচাল — এলাকার লাইভ ইউটিলিটি খবর"
        description="এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস জানুন। নাগরিকদের তথ্যের ভিত্তিতে হালচাল।"
        pathOrUrl="/"
        dateModified={statusData.updated_at}
      />
      <HomeClientView
        initialZone={DEFAULT_DHAKA_ZONE}
        initialStatus={statusData}
      />
    </>
  );
}
