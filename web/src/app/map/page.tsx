import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DHAKA_SEED_ZONES } from '@/lib/zones';
import { buildMetadata } from '@/lib/seo';
import { siteConfig } from '@/config/site';
import { BreadcrumbJsonLd, WebPageJsonLd } from '@/components/seo/JsonLd';
import { MapClientView } from './MapClientView';

export const metadata: Metadata = buildMetadata({
  title: 'লাইভ ম্যাপ — এলাকাভিত্তিক ইউটিলিটি',
  description:
    'ঢাকার বিভিন্ন এলাকার বিদ্যুৎ, গ্যাস ও পানির লাইভ ম্যাপ। Uber H3 হেক্সাগন গ্রিডে নাগরিক রিপোর্টের রিয়েল-টাইম অবস্থা ও উপাত্ত দেখুন।',
  path: '/map',
});

export default function MapPage() {
  const mapBreadcrumbs = [
    { name: 'হোম', url: siteConfig.url },
    { name: 'লাইভ ম্যাপ', url: `${siteConfig.url}/map` },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A0F] text-[#F8FAFC]">
      <BreadcrumbJsonLd
        items={mapBreadcrumbs}
        canonicalUrl={`${siteConfig.url}/map`}
      />
      <WebPageJsonLd
        title="লাইভ ম্যাপ — এলাকাভিত্তিক ইউটিলিটি হালচাল"
        description="ঢাকার বিভিন্ন এলাকার বিদ্যুৎ, গ্যাস ও পানির লাইভ ম্যাপ। Uber H3 হেক্সাগন গ্রিডে নাগরিক রিপোর্টের রিয়েল-টাইম অবস্থা ও উপাত্ত দেখুন।"
        pathOrUrl="/map"
        dateModified={new Date('2026-11-20T00:00:00.000Z')}
      />
      {/* Crawlable Header with single H1 */}
      <header className="px-4 py-3 bg-[#0B0F17] border-b border-white/10 z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-bengali text-lg sm:text-xl font-bold text-white">
              লাইভ ম্যাপ — এলাকাভিত্তিক ইউটিলিটি হালচাল
            </h1>
            <p className="font-bengali text-xs text-[#94A3B8]">
              Uber H3 Resolution 8 (~০.৭৪ বর্গকিলোমিটার) হেক্সাগন গ্রিডে ঢাকার বিদ্যুৎ, গ্যাস ও পানি পরিস্থিতি
            </p>
          </div>

          {/* Quick seed area links for crawlers and humans */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {DHAKA_SEED_ZONES.slice(0, 5).map((zone) => (
              <Link
                key={zone.h3_index}
                href={`/z/${zone.h3_index}`}
                className="font-bengali text-[11px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/10 shrink-0 transition-colors"
              >
                {zone.area_name_bn}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Interactive Map Client View */}
      <MapClientView />
    </div>
  );
}
