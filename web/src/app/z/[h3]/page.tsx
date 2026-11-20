import React from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  isValidH3Zone,
  getZoneMetadata,
  DHAKA_SEED_ZONES,
  createDefaultZoneStatus,
  ZoneStatusResponse,
} from '@/lib/zones';
import { getCachedZoneStatus } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { buildMetadata, shouldIndexZone } from '@/lib/seo';
import { getAreaByH3 } from '@/lib/areas';
import { SEED_ZONE_METRICS } from '@/app/sitemap';
import { siteConfig } from '@/config/site';
import { BreadcrumbJsonLd, WebPageJsonLd } from '@/components/seo/JsonLd';
import { ZoneViewClient } from './ZoneViewClient';

export const revalidate = 60; // ISR revalidate every 60s

interface ZonePageProps {
  params: Promise<{
    h3: string;
  }>;
}

export async function generateMetadata({
  params,
}: ZonePageProps): Promise<Metadata> {
  const { h3 } = await params;
  const cleanH3 = (h3 || '').toLowerCase();

  if (!isValidH3Zone(cleanH3)) {
    return buildMetadata({
      title: 'এলাকা পাওয়া যায়নি',
      description: 'অনুরোধকৃত এলাকাটি হালচালে পাওয়া যায়নি। এলাকাটি নির্বাচন করতে প্রধান পাতায় যান।',
      path: `/z/${cleanH3}`,
      noindex: true,
    });
  }

  const meta = getZoneMetadata(cleanH3);
  const areaName = meta?.area_name_bn || 'ঢাকা এলাকা';

  // Check if zone meets crowd-sourced indexing threshold
  const metrics = SEED_ZONE_METRICS[cleanH3];
  const isIndexable = shouldIndexZone(metrics);

  const title = `${areaName} এলাকার হালচাল`;
  const description = `${areaName} এলাকার বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের সর্বশেষ লাইভ স্ট্যাটাস। নাগরিকদের তথ্যের ভিত্তিতে তৈরি হালচাল।`;

  const matchingArea = getAreaByH3(cleanH3);
  const canonicalPath = matchingArea
    ? `/${matchingArea.citySlug}/${matchingArea.slug}`
    : `/z/${cleanH3}`;

  return buildMetadata({
    title,
    description,
    path: `/z/${cleanH3}`,
    canonicalPath,
    ogImage: `/api/og?h3=${cleanH3}`,
    noindex: !isIndexable,
  });
}

export async function generateStaticParams() {
  return DHAKA_SEED_ZONES.map((zone) => ({
    h3: zone.h3_index,
  }));
}

export default async function ZonePage({ params }: ZonePageProps) {
  const { h3 } = await params;

  // Enforce lowercase H3 URL canonicalization via 301 permanent redirect
  if (h3 !== h3.toLowerCase()) {
    permanentRedirect(`/z/${h3.toLowerCase()}`);
  }

  if (!isValidH3Zone(h3)) {
    notFound();
  }

  const meta = getZoneMetadata(h3);
  const areaName = meta?.area_name_bn || 'ঢাকা এলাকা';

  // 1. Check Redis cache
  let statusData = await getCachedZoneStatus<ZoneStatusResponse>(h3);

  // 2. On miss, query Supabase RPC
  if (!statusData) {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.rpc('get_zone_status', { p_h3: h3 });
      if (!error && data && Array.isArray(data) && data.length > 0) {
        statusData = createDefaultZoneStatus(h3);
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
    } catch {
      // Fallback to default
    }
  }

  if (!statusData) {
    statusData = createDefaultZoneStatus(h3);
  }

  const cleanH3 = h3.toLowerCase();
  const breadcrumbItems = [
    { name: 'হোম', url: siteConfig.url },
    { name: 'ঢাকা', url: `${siteConfig.url}/map` },
    {
      name: `${areaName}${meta?.ward ? ` (${meta.ward})` : ''}`,
      url: `${siteConfig.url}/z/${cleanH3}`,
    },
  ];

  return (
    <>
      <BreadcrumbJsonLd
        items={breadcrumbItems}
        canonicalUrl={`${siteConfig.url}/z/${cleanH3}`}
      />
      <WebPageJsonLd
        title={`${areaName} এলাকার হালচাল`}
        description={`${areaName} এলাকার বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের সর্বশেষ লাইভ স্ট্যাটাস। নাগরিকদের তথ্যের ভিত্তিতে তৈরি হালচাল।`}
        pathOrUrl={`/z/${cleanH3}`}
        dateModified={statusData.updated_at}
      />
      <ZoneViewClient
        h3={h3}
        initialStatus={statusData}
        seedMeta={meta || DHAKA_SEED_ZONES[0]}
      />
    </>
  );
}
