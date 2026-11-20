import React from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { buildMetadata, shouldIndexZone } from '@/lib/seo';
import { getAreaBySlug, resolveSlugRedirect, DHAKA_PILOT_AREAS } from '@/lib/areas';
import { createDefaultZoneStatus, ZoneStatusResponse } from '@/lib/zones';
import { getCachedZoneStatus } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { aggregateZoneStatuses, BENGALI_CATEGORY_DESCRIPTIONS } from '@/lib/aggregation';
import { UtilityCategory, UTILITY_CATEGORIES } from '@/lib/theme';
import { SEED_ZONE_METRICS } from '@/app/sitemap';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { StateBadge } from '@/components/StateBadge';
import { toBengaliDigits, formatRelativeTimeBn } from '@/lib/bengali-utils';

export const revalidate = 60; // 60s ISR revalidation

interface CategoryPageProps {
  params: Promise<{
    city: string;
    area: string;
    category: string;
  }>;
}

const VALID_CATEGORIES: UtilityCategory[] = ['electricity', 'gas', 'water', 'lpg'];

const CATEGORY_TITLES: Record<UtilityCategory, string> = {
  gas: 'গ্যাস সংকট ও বর্তমান চাপ',
  electricity: 'লোডশেডিং ও বিদ্যুৎ লাইভ খবর',
  water: 'ওয়াসা পানি সরবরাহ ও প্রেসার',
  lpg: 'এলপিজি সিলিন্ডারের দাম ও সরবরাহ',
};

const CATEGORY_ACTION_TIPS: Record<
  UtilityCategory,
  {
    title: string;
    tips: Array<{ heading: string; text: string }>;
  }
> = {
  gas: {
    title: 'গ্যাস সংকটকালীন প্রয়োজনীয় পরামর্শ ও নিরাপত্তা',
    tips: [
      {
        heading: 'বিকল্প রান্নার প্রস্তুতি',
        text: 'গ্যাসের চাপ কম বা বন্ধ থাকলে ইনডাকশন চুলা, ইলেকট্রিক রাইস কুকার বা জরুরি পোর্টেবল এলপিজি চুলা প্রস্তুত রাখুন।',
      },
      {
        heading: 'বার্নার খোলা রাখবেন না',
        text: 'গ্যাস না থাকলে চুলার চাবি কোনো অবস্থাতেই খোলা রেখে যাবেন না। হঠাৎ চাপ ফিরলে গ্যাস জমে অগ্নিকাণ্ডের ঝুঁকি থাকে।',
      },
      {
        heading: 'ম্যাচ জ্বালানোর আগে সতর্কতা',
        text: 'চুলার গ্যাস লিক হয়েছে কিনা নিশ্চিত হতে গন্ধ পরীক্ষা করুন। গন্ধ পেলে ঘরের সব জানালা খুলে বাতাস চলাচল করতে দিন।',
      },
    ],
  },
  electricity: {
    title: 'লোডশেডিং ও বিদ্যুৎ বিভ্রাটে সুরক্ষা টিপস',
    tips: [
      {
        heading: 'ডিভাইস ও পাওয়ার ব্যাংক ব্যাকআপ',
        text: 'বিদ্যুৎ থাকাকালীন মোবাইল ফোন, রিচার্জেবল ফ্যান এবং এমারজেন্সি লাইট পুরোপুরি চার্জ করে রাখুন।',
      },
      {
        heading: 'ভোল্টেজ স্পাইক প্রতিরোধ',
        text: 'লোডশেডিংয়ের সময় ফ্রিজ, এসি এবং টিভি সুইচ বন্ধ রাখুন। বিদ্যুৎ ফিরে আসার ১-২ মিনিট পর সংযোগ দিন।',
      },
      {
        heading: 'আইপিএস ও ব্যাটারির যত্ন',
        text: 'আইপিএস ব্যাটারির ডিস্টিল্ড ওয়াটার লেভেল নিয়মিত পরীক্ষা করুন এবং অতিরিক্ত লোড দেওয়া থেকে বিরত থাকুন।',
      },
    ],
  },
  water: {
    title: 'পানি সংকট ও বিশুদ্ধকরণ নির্দেশিকা',
    tips: [
      {
        heading: 'পানি ফুটিয়ে ব্যবহার',
        text: 'ওয়াসা পানিতে ময়লা বা গন্ধের অভিযোগ থাকলে ব্যবহারের আগে কমপক্ষে ১০ মিনিট ভালোভাবে ফুটিয়ে নিন।',
      },
      {
        heading: 'সংরক্ষণ ও পাম্প পরিচালনা',
        text: 'পানি আসার নির্ধারিত সময়ে পাম্প চালিয়ে ছাদের ট্যাঙ্কে পানি সংরক্ষণ করুন এবং পানির অপচয় রোধ করুন।',
      },
      {
        heading: 'জরুরি খাবার পানি',
        text: 'রান্না ও পানের জন্য সবসময় কিছু নিরাপদ পানি আলাদা জারে ঢেকে সংরক্ষণ করে রাখুন।',
      },
    ],
  },
  lpg: {
    title: 'এলপিজি সিলিন্ডার ক্রয় ও ব্যবহারের নিরাপত্তা',
    tips: [
      {
        heading: 'সরকারি নির্ধারিত দর যাচাই',
        text: 'বিইআরসি নির্ধারিত ১২ কেজি সিলিন্ডারের নিয়মিত রেট জানুন এবং অতিরিক্ত দাম চাওয়া হলে রিপোর্ট করুন।',
      },
      {
        heading: 'ওজন ও সিল পরীক্ষা',
        text: 'নতুন সিলিন্ডার নেওয়ার সময় সিল অক্ষত আছে কিনা এবং সিলিন্ডারের গ্রস ওজন স্কেলে মেপে নিন।',
      },
      {
        heading: 'সাবান-পানির লিক টেস্ট',
        text: 'রেগুলেটর লাগানোর পর সাবানের ফেনা দিয়ে পাইপের সংযোগ পরীক্ষা করুন। কোনো অবস্থাতেই আগুন দিয়ে লিক পরীক্ষা করবেন না।',
      },
    ],
  },
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { city, area: areaSlug, category } = await params;
  const cleanCity = (city || '').toLowerCase();
  const cleanArea = (areaSlug || '').toLowerCase();
  const cleanCategory = (category || '').toLowerCase() as UtilityCategory;

  const area = getAreaBySlug(cleanCity, cleanArea);
  if (!area || !VALID_CATEGORIES.includes(cleanCategory)) {
    return buildMetadata({
      title: 'পাতা পাওয়া যায়নি',
      description: 'অনুরোধকৃত ইউটিলিটি বিভাগটি পাওয়া যায়নি।',
      path: `/${cleanCity}/${cleanArea}/${category}`,
      noindex: true,
    });
  }

  const catMeta = UTILITY_CATEGORIES[cleanCategory];
  const catTitlePhrase = CATEGORY_TITLES[cleanCategory];
  const title = `${area.nameBn}: ${catTitlePhrase} | হালচাল`;
  const description = `${area.nameBn} এলাকার ${catMeta.nameBn} সংক্রান্ত লাইভ আপডেট, সংকট নিরসনের জরুরি পরামর্শ ও নাগরিক রিপোর্ট।`;

  // Check if zone is indexable
  const metrics = SEED_ZONE_METRICS[area.primaryH3];
  const isIndexable = shouldIndexZone(metrics);

  // If thin or not indexable, canonical to the parent area page
  const canonicalPath = isIndexable
    ? `/${area.citySlug}/${area.slug}/${cleanCategory}`
    : `/${area.citySlug}/${area.slug}`;

  return buildMetadata({
    title,
    description,
    path: `/${area.citySlug}/${area.slug}/${cleanCategory}`,
    canonicalPath,
    ogImage: `/api/og?h3=${area.primaryH3}`,
    noindex: !isIndexable,
  });
}

export async function generateStaticParams() {
  const params: Array<{ city: string; area: string; category: string }> = [];
  for (const a of DHAKA_PILOT_AREAS) {
    for (const cat of VALID_CATEGORIES) {
      params.push({
        city: a.citySlug,
        area: a.slug,
        category: cat,
      });
    }
  }
  return params;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { city, area: areaSlug, category } = await params;
  const cleanCity = (city || '').toLowerCase();
  const cleanArea = (areaSlug || '').toLowerCase();
  const cleanCategory = (category || '').toLowerCase() as UtilityCategory;

  // 301 Permanent Redirect check for legacy aliases
  const redirectTarget = resolveSlugRedirect(cleanCity, cleanArea);
  if (redirectTarget) {
    permanentRedirect(`/${cleanCity}/${redirectTarget}/${cleanCategory}`);
  }

  const area = getAreaBySlug(cleanCity, cleanArea);
  if (!area || !VALID_CATEGORIES.includes(cleanCategory)) {
    notFound();
  }

  const catMeta = UTILITY_CATEGORIES[cleanCategory];
  const actionTips = CATEGORY_ACTION_TIPS[cleanCategory];

  // Fetch live cell statuses
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

  const aggregatedStatus = aggregateZoneStatuses(cellStatuses, {
    areaNameBn: area.nameBn,
    ward: area.ward,
    city: area.cityNameBn,
  });

  const categoryStatus = aggregatedStatus.categories[cleanCategory];
  const currentState = categoryStatus?.state || 'unknown';
  const reporterCountBn = toBengaliDigits(categoryStatus?.distinct_reporters || 0);
  const statusDesc = BENGALI_CATEGORY_DESCRIPTIONS[cleanCategory][currentState];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-5 md:py-8 max-w-4xl mx-auto pb-28">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: 'হোম', href: '/' },
          { name: area.cityNameBn, href: `/${area.citySlug}` },
          { name: area.nameBn, href: `/${area.citySlug}/${area.slug}` },
          { name: catMeta.nameBn, href: `/${area.citySlug}/${area.slug}/${cleanCategory}` },
        ]}
        className="mb-4"
      />

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
          <span>{area.nameBn}</span>
          <span>&bull;</span>
          <span>{catMeta.nameBn} স্পেশাল রিপোর্ট</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          {area.nameBn}: {catMeta.nameBn} পরিস্থিতি ও লাইভ আপডেট
        </h1>
        <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
          {area.nameBn} এলাকার বর্তমান {catMeta.nameBn} সরবরাহ অবস্থা, নাগরিকদের লাইভ রিপোর্ট এবং সংকটকালীন জরুরি করণীয় নির্দেশিকা।
        </p>
      </header>

      {/* Live Category Status Hero Card */}
      <section className="mb-8 p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs text-neutral-400">বর্তমান লাইভ অবস্থা</span>
            <h2 className="text-xl font-bold text-white mt-0.5">{statusDesc}</h2>
          </div>
          <StateBadge state={currentState} category={cleanCategory} size="lg" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-800/80 text-xs text-neutral-300">
          <div>
            <span className="text-neutral-400 block">নাগরিক অংশগ্রহণ:</span>
            <span className="font-semibold text-white">{reporterCountBn} জন নাগরিক রিপোর্ট করেছেন</span>
          </div>
          <div>
            <span className="text-neutral-400 block">হালনাগাদের সময়:</span>
            <span className="font-semibold text-white">{formatRelativeTimeBn(categoryStatus?.updated_at || aggregatedStatus.updated_at)}</span>
          </div>
        </div>
      </section>

      {/* Actionable Tips & Emergency Guidelines */}
      <section aria-labelledby="tips-heading" className="mb-10 space-y-4">
        <h2 id="tips-heading" className="text-lg font-bold text-white">
          {actionTips.title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {actionTips.tips.map((tip, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 text-neutral-200"
            >
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">
                {idx + 1}. {tip.heading}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mandatory Community Disclaimer */}
      <section className="mb-10 p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/70 text-xs text-neutral-400 space-y-1">
        <p className="font-medium text-neutral-300">কমিউনিটি-রিপোর্টেড তথ্য, সরকারি পরিমাপ নয়</p>
        <p>
          হালচালের এই পাতায় প্রদর্শিত সকল উপাত্ত স্থানীয় নাগরিকদের স্বতঃস্ফূর্ত ইনপুটের ভিত্তিতে তৈরি। এটি সংশ্লিষ্ট সরকারি কর্তৃপক্ষ বা সেবা প্রদানকারী সংস্থার অফিশিয়াল বিবৃতি নয়।
        </p>
      </section>

      {/* Navigation Links to Parent Area Page and Other Categories */}
      <section className="pt-6 border-t border-neutral-800/80">
        <h2 className="text-sm font-semibold text-neutral-300 mb-3">
          {area.nameBn} এলাকার অন্যান্য ইউটিলিটি বিভাগ
        </h2>
        <div className="flex flex-wrap gap-2">
          {VALID_CATEGORIES.filter((c) => c !== cleanCategory).map((otherCat) => (
            <Link
              key={otherCat}
              href={`/${area.citySlug}/${area.slug}/${otherCat}`}
              className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-200 hover:text-emerald-400 transition-colors"
            >
              {UTILITY_CATEGORIES[otherCat].nameBn} দেখুন &rarr;
            </Link>
          ))}
          <Link
            href={`/${area.citySlug}/${area.slug}`}
            className="px-3 py-2 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/40 rounded-lg text-xs font-medium text-emerald-400 transition-colors"
          >
            {area.nameBn} মূল পাতায় ফিরুন &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
}
