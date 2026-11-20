import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Calendar, Clock, ArrowRight, ShieldCheck, Flame, Zap, Droplets, HelpCircle } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageJsonLd } from '@/lib/json-ld';
import { EVERGREEN_GUIDES } from '@/data/guides';
import { toBengaliDigits } from '@/lib/bengali-utils';

export const metadata: Metadata = buildMetadata({
  title: 'নাগরিক ইউটিলিটি গাইড ও সচেতনতা',
  description:
    'বিদ্যুৎ, গ্যাস, পানি ও এলপিজি সিলিন্ডার সংক্রান্ত প্রামাণ্য নাগরিক দিকনির্দেশনা। সরকারি দাম, জরুরি নিরাপত্তা টিপস এবং অফিশিয়াল অভিযোগের নিয়ম।',
  path: '/guides',
});

export default function GuidesIndexPage() {
  const jsonLd = buildWebPageJsonLd({
    title: 'নাগরিক ইউটিলিটি গাইড ও সচেতনতা',
    description:
      'বিদ্যুৎ, গ্যাস, পানি ও এলপিজি সিলিন্ডার সংক্রান্ত প্রামাণ্য নাগরিক দিকনির্দেশনা।',
    path: '/guides',
    type: 'WebPage',
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lpg':
        return <Flame className="w-5 h-5 text-orange-400" aria-hidden="true" />;
      case 'gas':
        return <Flame className="w-5 h-5 text-amber-400" aria-hidden="true" />;
      case 'electricity':
        return <Zap className="w-5 h-5 text-yellow-400" aria-hidden="true" />;
      case 'water':
        return <Droplets className="w-5 h-5 text-blue-400" aria-hidden="true" />;
      default:
        return <HelpCircle className="w-5 h-5 text-emerald-400" aria-hidden="true" />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] font-bengali transition-colors flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader activePath="/guides" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ name: 'নাগরিক গাইড' }]} />

        {/* Header Banner */}
        <header className="space-y-3 pb-6 border-b border-[var(--surface-border)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>প্রামাণ্য নাগরিক তথ্যভাণ্ডার</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            নাগরিক ইউটিলিটি গাইড ও সচেতনতা
          </h1>
          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            বাংলাদেশের বিদ্যুৎ, পাইপলাইন গ্যাস, ওয়াসা পানি এবং এলপিজি সিলিন্ডারের বাস্তব সমস্যার
            প্রামাণ্য সমাধান, সরকারি নিয়ম ও নিরাপত্তা সহায়িকা। প্রতিটি গাইড সরকারি প্রাতিষ্ঠানিক তথ্যের
            ভিত্তিতে নিয়মিত পর্যালোচিত।
          </p>
        </header>

        {/* Guides Grid */}
        <section className="space-y-4" aria-label="গাইড তালিকা">
          <div className="grid grid-cols-1 gap-4">
            {EVERGREEN_GUIDES.map((guide) => (
              <article
                key={guide.slug}
                className="group p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] hover:border-emerald-500/40 transition-all space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)]">
                      {getCategoryIcon(guide.category)}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      {guide.categoryBn}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-sub)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{toBengaliDigits(guide.readTimeMinutes)} মিনিট পাঠ</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>পর্যালোচনা: ২০ নভেম্বর ২০২৬</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                    <Link href={guide.path} className="focus:outline-none">
                      {guide.title}
                    </Link>
                  </h2>
                  <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                    {guide.summary}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[var(--surface-border)]/60 text-xs">
                  <div className="text-[11px] text-[var(--text-sub)] truncate max-w-[220px] sm:max-w-none">
                    সূত্র: {guide.sources.map((s) => s.name).join(', ')}
                  </div>
                  <Link
                    href={guide.path}
                    className="inline-flex items-center gap-1 text-emerald-400 font-bold hover:underline shrink-0"
                  >
                    <span>সম্পূর্ণ পড়ুন</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Community Trust Banner */}
        <section className="p-5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-[var(--text-main)]">আমাদের সম্পাদকীয় সততা নীতি</h3>
            <p className="text-[var(--text-sub)] leading-relaxed">
              হালচালের কোনো গাইডে মনগড়া পরিসংখ্যান, বিভ্রান্তিকর বাণিজিক প্রচার কিংবা বিপজ্জনক কোনো বিকল্প
              পদ্ধতি সুপারিশ করা হয় না। প্রতিটি হটলাইন ও লিংক প্রাতিষ্ঠানিকভাবে প্রতি ৯০ দিনে অন্তত একবার
              যাচাই করা হয়।
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
