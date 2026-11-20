import React from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { buildMetadata, shouldIndexZone } from '@/lib/seo';
import {
  getAreaBySlug,
  resolveSlugRedirect,
  DHAKA_PILOT_AREAS,
  AreaInfo,
} from '@/lib/areas';
import { createDefaultZoneStatus, ZoneStatusResponse } from '@/lib/zones';
import { getCachedZoneStatus, getCachedZoneInsights } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { aggregateZoneStatuses, generateAreaBengaliSummary } from '@/lib/aggregation';
import { Zone7DayInsights } from '@/lib/insights';
import { SEED_ZONE_METRICS } from '@/app/sitemap';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { StateBadge } from '@/components/StateBadge';
import { OutageSummaryCard } from '@/components/insights/OutageSummaryCard';
import { InsightsHeatmap } from '@/components/insights/InsightsHeatmap';
import { AreaReportCTA } from './AreaReportCTA';
import { UtilityCategory, UTILITY_CATEGORIES } from '@/lib/theme';

export const revalidate = 60; // 60s ISR revalidation

interface AreaPageProps {
  params: Promise<{
    city: string;
    area: string;
  }>;
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  const { city, area: areaSlug } = await params;
  const cleanCity = (city || '').toLowerCase();
  const cleanArea = (areaSlug || '').toLowerCase();

  const area = getAreaBySlug(cleanCity, cleanArea);
  if (!area) {
    return buildMetadata({
      title: 'এলাকা পাওয়া যায়নি',
      description: 'অনুরোধকৃত এলাকাটি হালচালে পাওয়া যায়নি। এলাকাটি নির্বাচন করতে প্রধান পাতায় যান।',
      path: `/${cleanCity}/${cleanArea}`,
      noindex: true,
    });
  }

  // Evaluate indexation gating
  const metrics = SEED_ZONE_METRICS[area.primaryH3];
  const isIndexable = shouldIndexZone(metrics);

  const title = `${area.nameBn}: এখনকার কারেন্ট, গ্যাস ও পানির হাল | হালচাল`;
  const description = `${area.nameBn} এলাকার বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের লাইভ স্ট্যাটাস। নাগরিকদের তথ্যের ভিত্তিতে তৈরি সর্বশেষ আপডেট ও ৭ দিনের ধারা।`;

  return buildMetadata({
    title,
    description,
    path: `/${area.citySlug}/${area.slug}`,
    ogImage: `/api/og?h3=${area.primaryH3}`,
    noindex: !isIndexable,
  });
}

export async function generateStaticParams() {
  return DHAKA_PILOT_AREAS.map((a) => ({
    city: a.citySlug,
    area: a.slug,
  }));
}

export default async function AreaPage({ params }: AreaPageProps) {
  const { city, area: areaSlug } = await params;
  const cleanCity = (city || '').toLowerCase();
  const cleanArea = (areaSlug || '').toLowerCase();

  // Check permanent 301 redirects for legacy aliases
  const redirectTarget = resolveSlugRedirect(cleanCity, cleanArea);
  if (redirectTarget) {
    permanentRedirect(`/${cleanCity}/${redirectTarget}`);
  }

  const area = getAreaBySlug(cleanCity, cleanArea);
  if (!area) {
    notFound();
  }

  // 1. Fetch live status for all H3 cells in this area
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

  // 2. Aggregate across cells: "worst confirmed state wins, with counts"
  const aggregatedStatus = aggregateZoneStatuses(cellStatuses, {
    areaNameBn: area.nameBn,
    ward: area.ward,
    city: area.cityNameBn,
  });

  // 3. Fetch 7-day pattern / insights
  let insights: Zone7DayInsights | null = null;
  try {
    insights = await getCachedZoneInsights<Zone7DayInsights>(area.primaryH3);
    if (!insights) {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.rpc('get_zone_7day_insights', {
        p_h3: area.primaryH3,
      });
      if (!error && data) {
        insights = data as Zone7DayInsights;
      }
    }
  } catch {
    // Non-fatal
  }

  // Check indexation threshold
  const metrics = SEED_ZONE_METRICS[area.primaryH3];
  const isIndexable = shouldIndexZone(metrics);

  // 4. Generate deterministic Bengali summary text
  const trendSummary =
    insights?.data_confidence === 'ok'
      ? insights.categories.electricity?.outage_event_count && insights.categories.electricity.outage_event_count > 0
        ? `গত ৭ দিনে এই এলাকায় মোট ${insights.categories.electricity.outage_event_count}টি বিদ্যুৎ বিভ্রাটের ঘটনা রেকর্ড করা হয়েছে।`
        : 'গত ৭ দিনের তথ্য অনুযায়ী বিদ্যুৎ ও গ্যাস সরবরাহ তুলনামূলক স্থিতিশীল ছিল।'
      : null;

  const summary = generateAreaBengaliSummary(aggregatedStatus, area.nameBn, trendSummary);

  // Neighbor areas lookup
  const neighborAreas = area.neighborSlugs
    .map((slug) => getAreaBySlug(area.citySlug, slug))
    .filter((a): a is AreaInfo => a !== null);

  const categoriesList: UtilityCategory[] = ['electricity', 'gas', 'water', 'lpg'];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-5 md:py-8 max-w-4xl mx-auto pb-28">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: 'হোম', href: '/' },
          { name: area.cityNameBn, href: `/${area.citySlug}` },
          { name: area.nameBn, href: `/${area.citySlug}/${area.slug}` },
        ]}
        className="mb-4"
      />

      {/* Above the Fold: Mobile-First Header & Deterministic Summary */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-300">
            {area.cityNameBn} &bull; {area.ward}
          </span>
          <span className="text-xs text-neutral-400">{summary.lastUpdatedText}</span>
        </div>

        {/* H1 strictly formatted per requirements */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          {area.nameBn}: এখনকার কারেন্ট, গ্যাস ও পানির হাল
        </h1>

        {/* Deterministic Bengali Lead Summary Paragraph */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-200 text-sm sm:text-base leading-relaxed">
          <p className="font-medium text-emerald-400 mb-1.5">{summary.headline}</p>
          <p className="mb-2">{summary.leadParagraph}</p>
          {summary.trendText && (
            <p className="text-xs text-neutral-400 pt-2 border-t border-neutral-800">
              {summary.trendText}
            </p>
          )}
        </div>
      </header>

      {/* Insufficient Data State Guardrail */}
      {!isIndexable && (
        <section
          aria-label="পর্যাপ্ত তথ্যের অভাব সতর্কতা"
          className="mb-8 p-5 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-neutral-200"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">
              📢
            </span>
            <div className="flex-1">
              <h2 className="text-base font-bold text-amber-300 mb-1">
                এখনো পর্যাপ্ত তথ্য নেই, আপনার এলাকার হাল জানান
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-3">
                {area.nameBn} এলাকার জন্য সাম্প্রতিক সময়ে নাগরিকদের পর্যাপ্ত নিশ্চিত রিপোর্ট জমা
                হয়নি। আপনি কি এই এলাকায় অবস্থান করছেন? মাত্র একটি ট্যাপে আপনার এলাকার বর্তমান
                কারেন্ট, গ্যাস বা পানির অবস্থা জানিয়ে প্রতিবেশীদের সাহায্য করুন।
              </p>
              <AreaReportCTA
                area={area}
                label="আপনার এলাকার তথ্য দিন"
                initialCategory="electricity"
                showIcon={false}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
              />
            </div>
          </div>
        </section>
      )}

      {/* 4 Utility Category Status Cards (Clickable to distinct category sub-pages) */}
      <section aria-labelledby="status-cards-heading" className="mb-8">
        <h2 id="status-cards-heading" className="sr-only">
          {area.nameBn} এলাকার ৪টি ইউটিলিটি বিভাগ
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categoriesList.map((cat) => {
            const catMeta = UTILITY_CATEGORIES[cat];
            const catStatus = aggregatedStatus.categories[cat];
            const state = catStatus?.state || 'unknown';

            return (
              <Link
                key={cat}
                href={`/${area.citySlug}/${area.slug}/${cat}`}
                className="group block p-4 bg-neutral-900/70 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {catMeta.nameBn}
                    </span>
                  </div>
                  <StateBadge state={state} category={cat} size="md" />
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                  {catStatus?.distinct_reporters && catStatus.distinct_reporters > 0
                    ? `${catStatus.distinct_reporters} জন নাগরিকের ইনপুট`
                    : 'নাগরিক রিপোর্টের অপেক্ষায়'}
                </p>

                <div className="flex items-center justify-between text-xs text-emerald-400 pt-2 border-t border-neutral-800/40">
                  <span>{catMeta.nameBn} সংক্রান্ত বিস্তারিত তথ্য</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Primary CTA Button (Does not push status off the first screen on mobile) */}
      <section className="mb-10 text-center">
        <AreaReportCTA
          area={area}
          className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-base rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-2"
        />
      </section>

      {/* 7-Day Pattern Block (Rendered when data_confidence is ok) */}
      {insights && insights.data_confidence === 'ok' && (
        <section aria-labelledby="pattern-heading" className="mb-10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="pattern-heading" className="text-lg font-bold text-white">
                {area.nameBn} এলাকার ৭ দিনের চিত্র ও প্যাটার্ন
              </h2>
              <p className="text-xs text-neutral-400">
                গত ৭ দিনে নাগরিকদের নিশ্চিত রিপোর্টের ওপর ভিত্তি করে তৈরি প্যাটার্ন
              </p>
            </div>
          </div>

          {/* Reused Outage Summary Card */}
          <OutageSummaryCard
            electricityInsight={insights.categories.electricity}
            dataConfidence={insights.data_confidence}
            areaNameBn={area.nameBn}
          />

          {/* Reused Insights Heatmap */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-200 mb-3">
              ২৪ ঘণ্টার সময়ভিত্তিক ইউটিলিটি হিটম্যাপ
            </h3>
            <InsightsHeatmap
              hourlyHeatmap={insights.hourly_heatmap}
              areaNameBn={area.nameBn}
            />
          </div>
        </section>
      )}

      {/* "কীভাবে কাজ করে ও কতটা নির্ভরযোগ্য" Section with Mandatory Disclaimer */}
      <section
        aria-labelledby="reliability-heading"
        className="mb-10 p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-3"
      >
        <h2 id="reliability-heading" className="text-base font-bold text-white flex items-center gap-2">
          <span aria-hidden="true">ℹ️</span>
          <span>কীভাবে কাজ করে ও কতটা নির্ভরযোগ্য?</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
          হালচাল সম্পূর্ণ ওপেন ও ক্রাউড-সোর্সড প্ল্যাটফর্ম। এলাকাভিত্তিক তথ্যের নির্ভরযোগ্যতা নিশ্চিত
          করতে কমপক্ষে ৩ জন ভিন্ন নাগরিকের রিপোর্ট এবং নির্দিষ্ট ট্রাস্ট স্কোর একত্রিত হলে তবেই একটি
          স্ট্যাটাস সবুজ বা লাল হিসেবে চূড়ান্ত হয়।
        </p>
        <div className="p-3 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs text-amber-400 font-medium flex items-start gap-2">
          <span aria-hidden="true" className="shrink-0">
            ⚠️
          </span>
          <span>
            <strong>সতর্কতা:</strong> কমিউনিটি-রিপোর্টেড তথ্য, সরকারি পরিমাপ নয়। হালচালে প্রদর্শিত সমস্ত
            উপাত্ত নাগরিকদের তাৎক্ষণিক অভিজ্ঞতার প্রতিফলন, এটি কোনো অফিশিয়াল পরিমাপ বা বিদ্যুৎ-গ্যাস
            কর্তৃপক্ষের ঘোষণা নয়।
          </span>
        </div>
      </section>

      {/* Crawlable Internal Links to Neighbouring Areas & City Hub */}
      <section aria-labelledby="neighbor-areas-heading" className="mb-8 pt-6 border-t border-neutral-800/80">
        <h2 id="neighbor-areas-heading" className="text-base font-bold text-white mb-3">
          আশেপাশের প্রতিবেশী এলাকার বর্তমান অবস্থা
        </h2>
        <p className="text-xs text-neutral-400 mb-4">
          {area.nameBn} এলাকার সীমানা সংলগ্ন অন্যান্য এলাকার লাইভ স্ট্যাটাস দেখুন:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {neighborAreas.map((neighbor) => (
            <Link
              key={neighbor.slug}
              href={`/${neighbor.citySlug}/${neighbor.slug}`}
              className="p-3 bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs sm:text-sm font-medium text-neutral-200 hover:text-emerald-400 transition-colors flex items-center justify-between"
            >
              <span>{neighbor.nameBn}</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          ))}
          <Link
            href={`/${area.citySlug}`}
            className="p-3 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 rounded-xl text-xs sm:text-sm font-medium text-emerald-400 transition-colors flex items-center justify-between col-span-2 sm:col-span-1"
          >
            <span>{area.cityNameBn} শহরের সব এলাকা</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
