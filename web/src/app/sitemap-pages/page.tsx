import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Map,
  Compass,
  BookOpen,
  MapPin,
  ShieldCheck,
  ArrowRight,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageJsonLd } from '@/lib/json-ld';
import { EVERGREEN_GUIDES } from '@/data/guides';
import { DHAKA_SEED_ZONES } from '@/lib/zones';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = buildMetadata({
  title: 'এইচটিএমএল সাইটম্যাপ — সকল পেজের সূচিপত্র',
  description:
    'হালচালের সমস্ত গুরুত্বপূর্ণ পেজ, এভারগ্রিন গাইড, ট্রাস্ট পলিসি এবং ঢাকা শহরের এলাকাভিত্তিক লাইভ স্ট্যাটাস পেজের পূর্ণাঙ্গ সূচিপত্র।',
  path: '/sitemap-pages',
});

export default function HtmlSitemapPage() {
  const jsonLd = buildWebPageJsonLd({
    title: 'এইচটিএমএল সাইটম্যাপ — সকল পেজের সূচিপত্র',
    description:
      'হালচালের সমস্ত গুরুত্বপূর্ণ পেজ, এভারগ্রিন গাইড, ট্রাস্ট পলিসি এবং ঢাকা শহরের এলাকাভিত্তিক লাইভ স্ট্যাটাস পেজের পূর্ণাঙ্গ সূচিপত্র।',
    path: '/sitemap-pages',
    type: 'WebPage',
  });

  const corePages = [
    {
      title: 'হোমপেজ — লাইভ ইউটিলিটি স্ট্যাটাস',
      href: '/',
      description: 'আপনার আশপাশের এলাকার বিদ্যুৎ, পাইপলাইন গ্যাস, পানি ও এলপিজির তাৎক্ষণিক অবস্থা।',
    },
    {
      title: 'লাইভ ম্যাপ (Interactive Map)',
      href: '/map',
      description: 'পুরো ঢাকা শহরের উবার এইচ৩ হেক্সাগন গ্রিডে রিয়েল-টাইম ইউটিলিটি মানচিত্র।',
    },
    {
      title: '৭ দিনের ইউটিলিটি ইতিহাস ও হিটম্যাপ',
      href: '/history',
      description: 'এলাকাভিত্তিক বিগত ৭ দিনের বিদ্যুৎ বিভ্রাট ও গ্যাস সংকটের নির্ভরযোগ্য পরিসংখ্যান।',
    },
  ];

  const trustPages = [
    {
      title: 'আমাদের সম্পর্কে (About Halchal)',
      href: '/about',
      description: 'হালচাল কারা পরিচালনা করে, আমাদের নাগরিক সেবা দর্শন এবং প্রযুক্তিগত উন্মুক্ততা।',
    },
    {
      title: 'কীভাবে কাজ করে (How It Works)',
      href: '/how-it-works',
      description: '৩-রিপোর্টার কনফার্মেশন অ্যালগরিদম, ট্রাস্ট ওয়েটিং এবং ৭২ ঘণ্টার ডেটা মোছার নিয়ম।',
    },
    {
      title: 'যোগাযোগ ও তথ্য সংশোধন নীতি (Contact & Takedown)',
      href: '/contact',
      description: 'ভুল তথ্য সংশোধন, টেকডাউন অনুরোধ এবং ২৪-৪৮ ঘণ্টার সাপোর্ট চ্যানেল।',
    },
    {
      title: 'গোপনীয়তা নীতি (Privacy Policy)',
      href: '/privacy',
      description: 'জিরো র জিপিএস স্টোরেজ ও সম্পূর্ণ পরিচয়হীন নাগরিক রিপোর্টিং নীতিমালা।',
    },
    {
      title: 'ব্যবহারের শর্তাবলি (Terms of Service)',
      href: '/terms',
      description: 'কমিউনিটি ডিসক্লেইমার, বাণিজ্যিক নাম নিষেধাজ্ঞা ও অপব্যবহার রোধ নীতিমালা।',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] font-bengali transition-colors flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader activePath="/sitemap-pages" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ name: 'এইচটিএমএল সাইটম্যাপ' }]} />

        {/* Page Title Header */}
        <header className="space-y-3 pb-6 border-b border-[var(--surface-border)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ন্যাভিগেশন ও সূচিপত্র</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            হালচাল সাইটম্যাপ — সকল পেজ ও গাইডের সূচিপত্র
          </h1>
          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            সার্চ ইঞ্জিন ক্রলার এবং সাধারণ নাগরিক—উভয়ের সুবিধার জন্য হালচালের সমস্ত মূল রুট,
            স্বচ্ছতা নীতিমালা, এভারগ্রিন গাইড এবং সক্রিয় এলাকার লিংক নিচে বিন্যস্ত করা হলো।
          </p>
        </header>

        {/* Section 1: মূল পেজসমূহ */}
        <section className="space-y-3" aria-label="মূল প্ল্যাটফর্ম পেজসমূহ">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <Map className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2>১. মূল প্ল্যাটফর্ম পেজসমূহ</h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {corePages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                    {page.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-sub)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </div>
                <p className="text-[var(--text-sub)] leading-relaxed">
                  {page.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 2: ট্রাস্ট ও স্বচ্ছতা পাতা */}
        <section className="space-y-3" aria-label="স্বচ্ছতা ও নীতিমালা পেজসমূহ">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2>২. স্বচ্ছতা, বিশ্বাসযোগ্যতা ও নীতিমালা</h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {trustPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                    {page.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-sub)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </div>
                <p className="text-[var(--text-sub)] leading-relaxed">
                  {page.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 3: এভারগ্রিন গাইডসমূহ */}
        <section className="space-y-3" aria-label="নাগরিক এভারগ্রিন গাইডসমূহ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
              <BookOpen className="w-5 h-5 shrink-0" aria-hidden="true" />
              <h2>৩. নাগরিক এভারগ্রিন গাইডসমূহ</h2>
            </div>
            <Link href="/guides" className="text-xs text-emerald-400 hover:underline">
              গাইড ইনডেক্স
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {EVERGREEN_GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={guide.path}
                className="group p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                    {guide.title}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    {guide.categoryBn}
                  </span>
                </div>
                <p className="text-[var(--text-sub)] leading-relaxed">
                  {guide.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 4: ঢাকা সিটির সক্রিয় লাইভ এলাকা */}
        <section className="space-y-3" aria-label="ঢাকা সিটির সক্রিয় লাইভ এলাকা">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <MapPin className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2>৪. ঢাকা সিটির লাইভ এরিয়া পেজসমূহ (H3 Res 8)</h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            নাগরিকদের রিয়েল-টাইম রিপোর্টের ভিত্তিতে এই এলাকাগুলোর বিদ্যুৎ, গ্যাস ও পানির অবস্থা নিয়মিত হালনাগাদ হয়:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {DHAKA_SEED_ZONES.map((zone) => (
              <Link
                key={zone.h3_index}
                href={`/z/${zone.h3_index}`}
                className="group p-3 rounded-xl bg-[var(--surface-bg)] border border-[var(--surface-border)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs"
              >
                <div className="font-bold text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                  {zone.area_name_bn}
                </div>
                <div className="text-[11px] text-[var(--text-sub)]">
                  {zone.ward} • {zone.city}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
