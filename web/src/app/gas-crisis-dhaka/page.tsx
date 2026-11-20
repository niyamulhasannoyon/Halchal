import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DHAKA_PILOT_AREAS } from '@/lib/areas';
import { createDefaultZoneStatus, ZoneStatusResponse } from '@/lib/zones';
import { getCachedZoneStatus } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { aggregateZoneStatuses } from '@/lib/aggregation';
import { StateBadge } from '@/components/StateBadge';
import { formatRelativeTimeBn, toBengaliDigits } from '@/lib/bengali-utils';

export const revalidate = 60; // 60s ISR revalidation

export const metadata: Metadata = buildMetadata({
  title: 'ঢাকায় গ্যাস সংকট: লাইভ প্রেসার ও এলাকার অবস্থা',
  description:
    'ঢাকার তিতাস গ্যাস বিতরণ এলাকার লাইভ গ্যাস সংকট আপডেট, রান্নার গ্যাসের স্বল্প চাপ বা সরবরাহহীনতার রিয়েল-টাইম নাগরিক খবর।',
  path: '/gas-crisis-dhaka',
});

export default async function GasCrisisPage() {
  const areas = DHAKA_PILOT_AREAS;
  const areaGasStatus: Array<{
    nameBn: string;
    slug: string;
    citySlug: string;
    ward: string;
    state: string;
    reporters: number;
    updatedAt: string;
  }> = [];

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
        } catch {}
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

    const gas = aggregated.categories.gas;
    areaGasStatus.push({
      nameBn: area.nameBn,
      slug: area.slug,
      citySlug: area.citySlug,
      ward: area.ward,
      state: gas?.state || 'unknown',
      reporters: gas?.distinct_reporters || 0,
      updatedAt: gas?.updated_at || aggregated.updated_at,
    });
  }

  const outageCount = areaGasStatus.filter((a) => a.state === 'out').length;
  const lowCount = areaGasStatus.filter((a) => a.state === 'low').length;
  const okCount = areaGasStatus.filter((a) => a.state === 'ok').length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-6 md:py-10 max-w-4xl mx-auto pb-28">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: 'হোম', href: '/' },
          { name: 'ঢাকায় গ্যাস সংকট', href: '/gas-crisis-dhaka' },
        ]}
        className="mb-4"
      />

      <header className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-950/60 border border-orange-800/40 text-orange-400 text-xs font-medium mb-3">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          লাইভ গ্যাস প্রেসার মনিটর
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          ঢাকায় গ্যাস সংকট: বিভিন্ন এলাকার লাইভ গ্যাস প্রেসার ও পরিস্থিতি
        </h1>
        <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
          তিতাস গ্যাস ট্রান্সমিশন অ্যান্ড ডিস্ট্রিবিউশন কোম্পানির আওতাধীন ঢাকার বিভিন্ন আবাসিক এলাকায়
          গ্যাসের প্রেসার কম বা গ্যাস না থাকার লাইভ আপডেট। নাগরিকরা সরাসরি জানাচ্ছেন রান্নার গ্যাসের বর্তমান অবস্থা।
        </p>
      </header>

      {/* Live Gas Counters */}
      <section className="mb-8 grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900/80 border border-emerald-900/40 text-center">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            {toBengaliDigits(okCount)}
          </span>
          <p className="text-xs text-neutral-400 mt-1">স্বাভাবিক চাপ</p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-900/80 border border-amber-900/40 text-center">
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">
            {toBengaliDigits(lowCount)}
          </span>
          <p className="text-xs text-neutral-400 mt-1">গ্যাসের চাপ কম</p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-900/80 border border-rose-900/40 text-center">
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-400">
            {toBengaliDigits(outageCount)}
          </span>
          <p className="text-xs text-neutral-400 mt-1">গ্যাস সম্পূর্ণ বন্ধ</p>
        </div>
      </section>

      {/* Live Area Gas Status Grid */}
      <section aria-labelledby="live-gas-areas-heading" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 id="live-gas-areas-heading" className="text-lg font-bold text-white">
            ঢাকার এলাকাভিত্তিক লাইভ গ্যাস প্রেসার
          </h2>
          <span className="text-xs text-neutral-400">নাগরিক ইনপুটের ভিত্তিতে হালনাগাদ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {areaGasStatus.map((area) => (
            <Link
              key={area.slug}
              href={`/${area.citySlug}/${area.slug}/gas`}
              className="p-4 rounded-xl bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 transition-all flex items-center justify-between group"
            >
              <div>
                <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {area.nameBn}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {area.ward} &bull; আপডেট: {formatRelativeTimeBn(area.updatedAt)}
                </p>
              </div>
              <StateBadge state={area.state as any} category="gas" size="md" />
            </Link>
          ))}
        </div>
      </section>

      {/* Gas Crisis Survival Advice */}
      <section aria-labelledby="gas-advice-heading" className="mb-10 p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-4">
        <h2 id="gas-advice-heading" className="text-lg font-bold text-white">
          গ্যাসের চাপ কম থাকলে করণীয় ও নিরাপত্তা সতর্কতা
        </h2>

        <div className="space-y-3 text-xs sm:text-sm text-neutral-300">
          <div>
            <h3 className="font-semibold text-white">১. চুলা জ্বালিয়ে ঘর গরম করবেন না</h3>
            <p className="text-neutral-400 mt-1 leading-relaxed">
              শীতকালে বা অন্য সময় গ্যাস জ্বালিয়ে রুম গরম রাখা মারাত্মক ঝুঁকিপূর্ণ। এর ফলে বদ্ধ ঘরে কার্বন মনোক্সাইড বিষক্রিয়া হতে পারে।
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">২. কম্প্রেসার বা বুস্টার পাম্প ব্যবহার নিষিদ্ধ</h3>
            <p className="text-neutral-400 mt-1 leading-relaxed">
              পাইপলাইনে মোটর বা বুস্টার পাম্প লাগিয়ে গ্যাস টানা সম্পূর্ণ বেআইনি এবং চরম বিপজ্জনক। এতে পাইপ ফেটে পুরো এলাকায় অগ্নিকাণ্ড ঘটতে পারে।
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">৩. জরুরি রান্নার ব্যাকআপ</h3>
            <p className="text-neutral-400 mt-1 leading-relaxed">
              ঢাকায় শীত মৌসুমে গ্যাস সংকট তীব্র হয়। তাই বাড়িতে ইলেকট্রিক কেটলি, রাইস কুকার বা জরুরি ছোট এলপিজি সিলিন্ডার রাখা সবচেয়ে বুদ্ধিমানের কাজ।
            </p>
          </div>
        </div>
      </section>

      {/* Mandatory Disclaimer */}
      <section className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/70 text-xs text-neutral-400">
        <p className="font-medium text-neutral-300 mb-1">কমিউনিটি-রিপোর্টেড তথ্য, সরকারি পরিমাপ নয়</p>
        <p>
          হালচালের গ্যাস প্রেসার সংক্রান্ত তথ্য সম্পূর্ণ নাগরিকদের বাস্তব অভিজ্ঞতার প্রতিফলন। তিতাস গ্যাস কর্তৃপক্ষের সাথে হালচালের কোনো আনুষ্ঠানিক সংযোগ নেই।
        </p>
      </section>
    </main>
  );
}
