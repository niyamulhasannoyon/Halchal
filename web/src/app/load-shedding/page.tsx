import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DHAKA_PILOT_AREAS } from '@/lib/areas';
import { createDefaultZoneStatus, ZoneStatusResponse } from '@/lib/zones';
import { getCachedZoneStatus } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { aggregateZoneStatuses, BENGALI_CATEGORY_DESCRIPTIONS } from '@/lib/aggregation';
import { StateBadge } from '@/components/StateBadge';
import { formatRelativeTimeBn, toBengaliDigits } from '@/lib/bengali-utils';

export const revalidate = 60; // 60s ISR revalidation

export const metadata: Metadata = buildMetadata({
  title: 'ঢাকায় লোডশেডিং: লাইভ খবর ও এলাকার অবস্থা',
  description:
    'ঢাকার বিভিন্ন এলাকার বিদ্যুৎ বিভ্রাট, ডেসকো ও ডিপিডিসি ফিডারের লোডশেডিংয়ের লাইভ খবর এবং নাগরিকদের রিয়েল-টাইম রিপোর্ট।',
  path: '/load-shedding',
});

export default async function LoadSheddingPage() {
  const areas = DHAKA_PILOT_AREAS;
  const areaElectricityStatus: Array<{
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

    const el = aggregated.categories.electricity;
    areaElectricityStatus.push({
      nameBn: area.nameBn,
      slug: area.slug,
      citySlug: area.citySlug,
      ward: area.ward,
      state: el?.state || 'unknown',
      reporters: el?.distinct_reporters || 0,
      updatedAt: el?.updated_at || aggregated.updated_at,
    });
  }

  const outageCount = areaElectricityStatus.filter((a) => a.state === 'out').length;
  const lowCount = areaElectricityStatus.filter((a) => a.state === 'low').length;
  const okCount = areaElectricityStatus.filter((a) => a.state === 'ok').length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-6 md:py-10 max-w-4xl mx-auto pb-28">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: 'হোম', href: '/' },
          { name: 'লোডশেডিং লাইভ খবর', href: '/load-shedding' },
        ]}
        className="mb-4"
      />

      <header className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800/40 text-amber-400 text-xs font-medium mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          লাইভ বিদ্যুৎ মনিটর
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          ঢাকায় লোডশেডিং: এলাকার লাইভ খবর ও লোডশেডিং পরিস্থিতি
        </h1>
        <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
          ঢাকার ডেসকো (DESCO) ও ডিপিডিসি (DPDC) বিদ্যুৎ বিতরণ এলাকার নাগরিকদের সরাসরি রিপোর্টকৃত
          লাইভ লোডশেডিং আপডেট। কোন এলাকায় এখন বিদ্যুৎ আছে আর কোথায় লোডশেডিং চলছে তা একনজরে দেখুন।
        </p>
      </header>

      {/* Live Overview Counters */}
      <section className="mb-8 grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900/80 border border-emerald-900/40 text-center">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            {toBengaliDigits(okCount)}
          </span>
          <p className="text-xs text-neutral-400 mt-1">স্বাভাবিক বিদ্যুৎ</p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-900/80 border border-amber-900/40 text-center">
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">
            {toBengaliDigits(lowCount)}
          </span>
          <p className="text-xs text-neutral-400 mt-1">স্বল্প/ভোল্টেজ সমস্যা</p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-900/80 border border-rose-900/40 text-center">
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-400">
            {toBengaliDigits(outageCount)}
          </span>
          <p className="text-xs text-neutral-400 mt-1">লোডশেডিং চলছে</p>
        </div>
      </section>

      {/* Live Area Electricity Status Table / Grid */}
      <section aria-labelledby="live-areas-heading" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 id="live-areas-heading" className="text-lg font-bold text-white">
            ঢাকার বিভিন্ন এলাকার লাইভ বিদ্যুৎ অবস্থা
          </h2>
          <span className="text-xs text-neutral-400">রিয়েল-টাইম নাগরিক ইনপুট</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {areaElectricityStatus.map((area) => (
            <Link
              key={area.slug}
              href={`/${area.citySlug}/${area.slug}/electricity`}
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
              <StateBadge state={area.state as any} category="electricity" size="md" />
            </Link>
          ))}
        </div>
      </section>

      {/* Load Shedding FAQs & Survival Guidelines */}
      <section aria-labelledby="guide-heading" className="mb-10 p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-4">
        <h2 id="guide-heading" className="text-lg font-bold text-white">
          লোডশেডিং সংক্রান্ত জরুরি প্রশ্নোত্তর ও তথ্য
        </h2>

        <div className="space-y-3 text-xs sm:text-sm text-neutral-300">
          <div>
            <h3 className="font-semibold text-white">প্রশ্ন: লোডশেডিং কতক্ষণ স্থায়ী হতে পারে?</h3>
            <p className="text-neutral-400 mt-1 leading-relaxed">
              জাতীয় গ্রিডে বিদ্যুৎ উৎপাদনের ঘাটতি অনুযায়ী সাধারণত ১ থেকে ২ ঘণ্টা পর্যন্ত লোডশেডিং হতে পারে। হালচালের ৭ দিনের হিস্ট্রি পাতায় গিয়ে আপনার এলাকার গড় বিভ্রাট সময় দেখে নিতে পারেন।
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">প্রশ্ন: আমার এলাকার তথ্য ভুল দেখালে করণীয় কী?</h3>
            <p className="text-neutral-400 mt-1 leading-relaxed">
              হালচাল সাধারণ নাগরিকদের তথ্যের ওপর নির্ভরশীল। আপনার এলাকায় বিদ্যুৎ চলে গেলে বা ফিরে আসলে সরাসরি হালচালে রিপোর্ট করুন। ৩ জন নাগরিক রিপোর্ট করলেই স্ট্যাটাস হালনাগাদ হয়ে যায়।
            </p>
          </div>
        </div>
      </section>

      {/* Mandatory Disclaimer */}
      <section className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/70 text-xs text-neutral-400">
        <p className="font-medium text-neutral-300 mb-1">কমিউনিটি-রিপোর্টেড তথ্য, সরকারি পরিমাপ নয়</p>
        <p>
          হালচালের সমস্ত তথ্য নাগরিক সমাজের পারস্পরিক সহযোগিতার ভিত্তিতে তৈরি। ডেসকো, ডিপিডিসি বা বিদ্যুৎ উন্নয়ন বোর্ডের (PDB) কোনো অফিশিয়াল ঘোষণার সাথে হালচালের প্রত্যক্ষ সম্পর্ক নেই।
        </p>
      </section>
    </main>
  );
}
