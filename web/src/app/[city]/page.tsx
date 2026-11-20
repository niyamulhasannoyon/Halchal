import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { getAllAreasForCity, getCityMetadata, AreaInfo } from '@/lib/areas';
import { DHAKA_SEED_ZONES, createDefaultZoneStatus, ZoneStatusResponse } from '@/lib/zones';
import { getCachedZoneStatus } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { aggregateZoneStatuses } from '@/lib/aggregation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { StateBadge } from '@/components/StateBadge';
import { toBengaliDigits, formatRelativeTimeBn } from '@/lib/bengali-utils';

export const revalidate = 60; // 60s ISR revalidation

interface CityPageProps {
  params: Promise<{
    city: string;
  }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const cityMeta = getCityMetadata(city);

  if (!cityMeta) {
    return buildMetadata({
      title: 'শহর পাওয়া যায়নি',
      description: 'অনুরোধকৃত শহরটি হালচালে পাওয়া যায়নি। এলাকা দেখতে প্রধান পাতায় যান।',
      path: `/${city}`,
      noindex: true,
    });
  }

  const title = `${cityMeta.nameBn} শহরের বিদ্যুৎ, গ্যাস ও পানির লাইভ হালচাল | হালচাল`;
  const description = `${cityMeta.nameBn} শহরের বিভিন্ন এলাকার বিদ্যুৎ বিভ্রাট, গ্যাসের চাপ, পানির সরবরাহ ও এলপিজি সিলিন্ডারের লাইভ আপডেট। মোহাম্মদপুর, ধানমন্ডি, মিরপুর ও অন্যান্য এলাকার হালচাল।`;

  return buildMetadata({
    title,
    description,
    path: `/${cityMeta.citySlug}`,
    ogImage: `/api/og?city=${cityMeta.citySlug}`,
  });
}

export async function generateStaticParams() {
  return [{ city: 'dhaka' }];
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const cityMeta = getCityMetadata(city);

  if (!cityMeta) {
    notFound();
  }

  const areas = getAllAreasForCity(city);

  // Fetch status for all pilot areas
  const areasWithStatus: Array<{ area: AreaInfo; status: ZoneStatusResponse }> = [];

  for (const area of areas) {
    const cellStatuses: ZoneStatusResponse[] = [];

    for (const h3 of area.h3Cells) {
      let statusData = await getCachedZoneStatus<ZoneStatusResponse>(h3);

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
      cellStatuses.push(statusData);
    }

    const aggregated = aggregateZoneStatuses(cellStatuses, {
      areaNameBn: area.nameBn,
      ward: area.ward,
      city: area.cityNameBn,
    });

    areasWithStatus.push({
      area,
      status: aggregated,
    });
  }

  // Count active stats
  const totalAreasCount = toBengaliDigits(areas.length);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-6 md:py-10 max-w-5xl mx-auto pb-28">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: 'হোম', href: '/' },
          { name: cityMeta.nameBn, href: `/${cityMeta.citySlug}` },
        ]}
        className="mb-4"
      />

      {/* Main Page Header */}
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-medium mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          সিটি হাব — লাইভ উপাত্ত
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          {cityMeta.nameBn}: বিভিন্ন এলাকার কারেন্ট, গ্যাস ও পানির লাইভ হালচাল
        </h1>
        <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-3xl">
          {cityMeta.nameBn} শহরের {totalAreasCount}টি গুরুত্বপূর্ণ এলাকার বিদ্যুৎ বিভ্রাট (লোডশেডিং),
          গ্যাসের চাপ, ওয়াসা পানির সরবরাহ এবং এলপিজি সিলিন্ডারের রিয়েল-টাইম তথ্য।
          নাগরিকদের সরাসরি রিপোর্টের ভিত্তিতে তৈরি লাইভ হালচাল।
        </p>
      </header>

      {/* Trust & Community Disclaimer Banner */}
      <section className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 mb-1">
            কমিউনিটি-রিপোর্টেড তথ্য, সরকারি পরিমাপ নয়
          </h2>
          <p className="text-xs text-neutral-400 leading-normal">
            হালচালের সমস্ত স্ট্যাটাস এলাকার সাধারণ নাগরিকদের তথ্যের ভিত্তিতে স্বয়ংক্রিয়ভাবে তৈরি হয়। কোনো অফিশিয়াল সরকারি বা ইউটিলিটি কোম্পানির তথ্য নয়।
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <span>আপনার এলাকার হাল জানান</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </section>

      {/* Crawlable Area Directory Grid */}
      <section aria-labelledby="areas-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="areas-heading" className="text-xl font-bold text-white">
            {cityMeta.nameBn} শহরের এলাকাগুলোর তালিকা ({totalAreasCount}টি এলাকা)
          </h2>
          <span className="text-xs text-neutral-400">প্রতি ৬০ সেকেন্ডে স্বয়ংক্রিয় হালনাগাদ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areasWithStatus.map(({ area, status }) => {
            const electricity = status.categories.electricity;
            const gas = status.categories.gas;
            const water = status.categories.water;
            const lpg = status.categories.lpg;

            return (
              <Link
                key={area.slug}
                href={`/${area.citySlug}/${area.slug}`}
                className="group block bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800/80 hover:border-neutral-700 rounded-xl p-5 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {area.nameBn}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{area.ward}</p>
                  </div>
                  <span className="text-neutral-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>

                {/* 4 Status Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-neutral-950/60 rounded-lg p-2 flex items-center justify-between border border-neutral-800/50">
                    <span className="text-neutral-400">বিদ্যুৎ</span>
                    <StateBadge state={electricity?.state || 'unknown'} category="electricity" size="sm" />
                  </div>
                  <div className="bg-neutral-950/60 rounded-lg p-2 flex items-center justify-between border border-neutral-800/50">
                    <span className="text-neutral-400">গ্যাস</span>
                    <StateBadge state={gas?.state || 'unknown'} category="gas" size="sm" />
                  </div>
                  <div className="bg-neutral-950/60 rounded-lg p-2 flex items-center justify-between border border-neutral-800/50">
                    <span className="text-neutral-400">পানি</span>
                    <StateBadge state={water?.state || 'unknown'} category="water" size="sm" />
                  </div>
                  <div className="bg-neutral-950/60 rounded-lg p-2 flex items-center justify-between border border-neutral-800/50">
                    <span className="text-neutral-400">এলপিজি</span>
                    <StateBadge state={lpg?.state || 'unknown'} category="lpg" size="sm" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800/40">
                  <span>আপডেট: {formatRelativeTimeBn(status.updated_at)}</span>
                  <span className="text-emerald-400 font-medium">বিস্তারিত দেখুন &rarr;</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Explainer Links Section */}
      <section className="mt-12 pt-8 border-t border-neutral-800/60">
        <h2 className="text-lg font-semibold text-white mb-4">
          গুরুত্বপূর্ণ ইউটিলিটি গাইড ও ব্যাখ্যা
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/gas-crisis-dhaka"
            className="p-4 bg-neutral-900/40 border border-neutral-800/60 rounded-xl hover:border-neutral-700 transition-colors"
          >
            <h3 className="font-medium text-emerald-400 mb-1">ঢাকায় গ্যাস সংকট</h3>
            <p className="text-xs text-neutral-400">
              ঢাকার বিভিন্ন এলাকার লাইভ গ্যাস প্রেসার ও সংকট মোকাবিলায় করণীয় তথ্য।
            </p>
          </Link>
          <Link
            href="/load-shedding"
            className="p-4 bg-neutral-900/40 border border-neutral-800/60 rounded-xl hover:border-neutral-700 transition-colors"
          >
            <h3 className="font-medium text-emerald-400 mb-1">ঢাকায় লোডশেডিং</h3>
            <p className="text-xs text-neutral-400">
              এলাকাভিত্তিক বিদ্যুৎ বিভ্রাট, লোডশেডিংয়ের লাইভ অবস্থা ও সতর্কতা।
            </p>
          </Link>
          <Link
            href="/lpg-price"
            className="p-4 bg-neutral-900/40 border border-neutral-800/60 rounded-xl hover:border-neutral-700 transition-colors"
          >
            <h3 className="font-medium text-emerald-400 mb-1">এলপিজি সিলিন্ডারের দাম</h3>
            <p className="text-xs text-neutral-400">
              ১২ কেজি এলপিজি সিলিন্ডারের আজকের বিইআরসি সরকারি রেট ও বাজারদর।
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
