import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  isValidH3Zone,
  getZoneMetadata,
  DHAKA_SEED_ZONES,
  createDefaultZoneStatus,
  ZoneStatusResponse,
} from '@/lib/zones';
import { getCachedZoneStatus } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { ZoneViewClient } from './ZoneViewClient';

export const revalidate = 60; // ISR revalidate every 60s

interface ZonePageProps {
  params: Promise<{
    h3: string;
  }>;
  searchParams: Promise<{
    t?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ZonePageProps): Promise<Metadata> {
  const { h3 } = await params;
  const { t } = await searchParams;

  if (!isValidH3Zone(h3)) {
    return {
      title: 'এলাকা পাওয়া যায়নি — হালচাল',
    };
  }

  const meta = getZoneMetadata(h3);
  const areaName = meta?.area_name_bn || 'ঢাকা এলাকা';
  const timeBucket = t || String(Math.floor(Date.now() / 600000));
  const ogImageUrl = `/api/og?h3=${h3}&t=${timeBucket}`;

  const title = `${areaName} এলাকার হালচাল — লাইভ ইউটিলিটি খবর`;
  const description = `${areaName} এলাকার বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের লাইভ খবর। নাগরিকদের তথ্যের ভিত্তিতে তৈরি।`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'bn_BD',
      url: `/z/${h3}?t=${timeBucket}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${areaName} এলাকার লাইভ ইউটিলিটি স্ট্যাটাস কার্ড`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export async function generateStaticParams() {
  return DHAKA_SEED_ZONES.map((zone) => ({
    h3: zone.h3_index,
  }));
}

export default async function ZonePage({ params }: ZonePageProps) {
  const { h3 } = await params;

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

  return (
    <ZoneViewClient
      h3={h3}
      initialStatus={statusData}
      seedMeta={meta || DHAKA_SEED_ZONES[0]}
    />
  );
}
