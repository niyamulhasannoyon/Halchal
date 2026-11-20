import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PhoneCall,
  Calendar,
  Clock,
  ShieldCheck,
  Building2,
  FileCheck2,
  AlertTriangle,
  ExternalLink,
  Flame,
  Zap,
  Droplets,
  Scale,
  CheckCircle2,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CalloutBox } from '@/components/CalloutBox';
import { GuideCTA } from '@/components/GuideCTA';
import { RelevantZonesCard } from '@/components/RelevantZonesCard';
import { buildMetadata } from '@/lib/seo';
import { buildArticleJsonLd } from '@/lib/json-ld';
import { getGuideBySlug } from '@/data/guides';
import { toBengaliDigits } from '@/lib/bengali-utils';

const guide = getGuideBySlug('official-utility-complaint-guide')!;

export const metadata: Metadata = buildMetadata({
  title: guide.metaTitle,
  description: guide.metaDescription,
  path: guide.path,
  type: 'article',
});

export default function OfficialUtilityComplaintGuidePage() {
  const articleJsonLd = buildArticleJsonLd(guide);

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] font-bengali transition-colors flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <SiteHeader activePath="/guides" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: 'নাগরিক গাইড', href: '/guides' },
            { name: 'অফিসিয়ালি সমস্যা জানানোর নিয়ম' },
          ]}
        />

        {/* Article Header */}
        <header className="space-y-4 pb-6 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{guide.categoryBn}</span>
            </span>
            <span className="text-[var(--text-sub)] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>সর্বশেষ পর্যালোচনা: ২০ নভেম্বর ২০২৬</span>
            </span>
            <span className="text-[var(--text-sub)] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>পড়ার সময়: {toBengaliDigits(guide.readTimeMinutes)} মিনিট</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight leading-snug">
            {guide.title}
          </h1>

          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            বিদ্যুৎ বিভ্রাট, ট্রান্সফরমার বিস্ফোরণ, পাইপলাইনের গ্যাসের তীব্র গন্ধ বা ওয়াসার লাইনে ময়লা পানির
            সমস্যা দেখা দিলে অনেকেই বুঝতে পারেন না কোথায় সঠিক উপায়ে অভিযোগ করতে হবে। এই গাইডে সরকারি
            কর্তৃপক্ষের শতভাগ যাচাইকৃত জরুরি হটলাইন নম্বর, কার্যকর অভিযোগ দাখিলের নিয়মাবলী এবং অভিযোগ
            ট্র্যাকিংয়ের পদ্ধতি বিস্তারিত তুলে ধরা হলো।
          </p>

          <div className="pt-2 flex items-center justify-between text-xs text-[var(--text-sub)] border-t border-[var(--surface-border)]/60">
            <div>লেখক: <strong>{guide.author.name}</strong> ({guide.author.role})</div>
            <div>পর্যালোচক: <strong>{guide.reviewer.name}</strong></div>
          </div>
        </header>

        {/* Halchal vs Official Hotline Callout */}
        <CalloutBox title="হালচাল এবং অফিশিয়াল অভিযোগের মধ্যে পার্থক্য" variant="info">
          হালচাল হলো আশপাশের নাগরিকদের মধ্যে রিয়েল-টাইম তথ্য বিনিময়ের উন্মুক্ত প্ল্যাটফর্ম। তবে আপনার
          সংযোগের লাইন মেরামত, ট্রান্সফরমার প্রতিস্থাপন বা টেকনিশিয়ান পাঠানোর আইনগত দায়িত্ব সংশ্লিষ্ট
          ইউটিলিটি কর্তৃপক্ষের। তাই দ্রুত কারিগরি সমাধানের জন্য নিচের অফিশিয়াল নম্বরে অভিযোগ জানানো জরুরি।
        </CalloutBox>

        {/* Article Body Content */}
        <article className="space-y-6 text-sm text-[var(--text-sub)] leading-relaxed">
          {/* Section 1: যাচাইকৃত অফিশিয়াল হটলাইন ডিরেক্টরি */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ১. বিদ্যুৎ, গ্যাস ও পানির যাচাইকৃত কেন্দ্রীয় হটলাইন ডিরেক্টরি
            </h2>
            <p>
              হালচাল সম্পাদকীয় দল ২০ নভেম্বর ২০২৬ তারিখে প্রতিটি সেবা প্রদানকারী প্রতিষ্ঠানের অফিশিয়াল
              পোর্টাল থেকে নিচের ফোন নম্বর ও হটলাইনগুলো সরাসরি যাচাই করেছে:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* DPDC */}
              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400">
                    <Zap className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--text-main)]">ডিপিডিসি (DPDC) — ঢাকা দক্ষিণ ও মধ্যাঞ্চল</h3>
                    <span className="text-[11px] text-[var(--text-sub)]">বিদ্যুৎ সরবরাহ ও ট্রান্সফরমার ত্রুটি</span>
                  </div>
                </div>
                <div className="pt-1 space-y-1 text-xs">
                  <p>
                    কেন্দ্রীয় কল সেন্টার হটলাইন: <strong>১৬১১৬</strong> (16116)
                  </p>
                  <p className="text-[11px] text-[var(--text-sub)]">
                    ওয়েবসাইট: <a href="https://dpdc.org.bd" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">dpdc.org.bd</a>
                  </p>
                </div>
              </div>

              {/* DESCO */}
              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400">
                    <Zap className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--text-main)]">ডেসকো (DESCO) — ঢাকা উত্তরাঞ্চল</h3>
                    <span className="text-[11px] text-[var(--text-sub)]">মিরপুর, উত্তরা, গুলশান, বাড্ডা ইত্যাদি</span>
                  </div>
                </div>
                <div className="pt-1 space-y-1 text-xs">
                  <p>
                    কেন্দ্রীয় হেল্পডেস্ক হটলাইন: <strong>১৬১২০</strong> (16120)
                  </p>
                  <p className="text-[11px] text-[var(--text-sub)]">
                    ওয়েবসাইট: <a href="https://desco.org.bd" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">desco.org.bd</a>
                  </p>
                </div>
              </div>

              {/* Titas Gas */}
              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Flame className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--text-main)]">তিতাস গ্যাস (TGTDCL)</h3>
                    <span className="text-[11px] text-[var(--text-sub)]">পাইপলাইন লিকেজ ও জরুরি নিয়ন্ত্রণ কক্ষ</span>
                  </div>
                </div>
                <div className="pt-1 space-y-1 text-xs">
                  <p>
                    জরুরি হটলাইন: <strong>১৬৪৯৬</strong> (16496)
                  </p>
                  <p className="text-[11px] text-[var(--text-sub)]">
                    কেন্দ্রীয় কন্ট্রোল রুম: <strong>০২-২২৩৩-৮৮৯৬০</strong>, <strong>০২-২২৩৩-৮৮৯৬১</strong>
                  </p>
                  <p className="text-[11px] text-[var(--text-sub)]">
                    ওয়েবসাইট: <a href="https://titasgas.org.bd" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">titasgas.org.bd</a>
                  </p>
                </div>
              </div>

              {/* Dhaka WASA */}
              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Droplets className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--text-main)]">ঢাকা ওয়াসা (DWASA)</h3>
                    <span className="text-[11px] text-[var(--text-sub)]">পানির ঘাটতি, ঘোলা পানি ও সুয়ারেজ</span>
                  </div>
                </div>
                <div className="pt-1 space-y-1 text-xs">
                  <p>
                    ওয়াসা লিংক হটলাইন: <strong>১৬১৬২</strong> (16162)
                  </p>
                  <p className="text-[11px] text-[var(--text-sub)]">
                    ওয়েবসাইট: <a href="https://dwasa.org.bd" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">dwasa.org.bd</a>
                  </p>
                </div>
              </div>

              {/* DNCRP */}
              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Scale className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--text-main)]">জাতীয় ভোক্তা অধিকার অধিদপ্তর (DNCRP)</h3>
                    <span className="text-[11px] text-[var(--text-sub)]">এলপিজি অতিরিক্ত মূল্য ও জালিয়াতি</span>
                  </div>
                </div>
                <div className="pt-1 space-y-1 text-xs">
                  <p>
                    ভোক্তা হটলাইন: <strong>১৬১২১</strong> (16121)
                  </p>
                  <p className="text-[11px] text-[var(--text-sub)]">
                    অনলাইন পোর্টাল: <a href="https://dncrp.portal.gov.bd" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">dncrp.portal.gov.bd</a>
                  </p>
                </div>
              </div>

              {/* Emergency 999 */}
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-bold text-xs text-red-400">জাতীয় জরুরি সেবা (৯৯৯)</h3>
                    <span className="text-[11px] text-red-300">অগ্নিকাণ্ড, সিলিন্ডার বিস্ফোরণ বা তারে আগুন</span>
                  </div>
                </div>
                <div className="pt-1 space-y-1 text-xs">
                  <p className="text-red-300">
                    টোল-ফ্রি কল: <strong>৯৯৯</strong> (যেকোনো অপারেটর থেকে বিনামূল্যে)
                  </p>
                  <p className="text-[11px] text-red-300/80">
                    ফায়ার সার্ভিস ও অ্যাম্বুলেন্স দ্রুততম সময়ে পাঠানো হয়।
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: কার্যকর অভিযোগ দাখিলের ৪টি ধাপ */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ২. দ্রুত প্রতিকার পেতে অভিযোগ দাখিলের ৪টি কার্যকর ধাপ
            </h2>
            <p>
              অনেক সময় কল সেন্টারে অভিযোগ করলেও সমাধান হতে দেরি হয়। এর মূল কারণ নাগরিকের প্রয়োজনীয় তথ্যের
              ঘাটতি। কল করার আগে নিচের প্রস্তুতি গ্রহণ করুন:
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ধাপ ১: গ্রাহক নম্বর (Customer ID) বা মিটার নম্বর প্রস্তুত রাখুন</span>
                </div>
                <p className="text-xs">
                  বিদ্যুৎ বিল বা গ্যাস বিলের কাগজের ওপর ৮ বা ১০ সংখ্যার গ্রাহক নম্বর লেখা থাকে। কল সেন্টারের প্রতিনিধিকে এই নম্বর জানালে তারা মুহূর্তেই আপনার ফিডার, সাব-স্টেশন এবং সংশ্লিষ্ট জোনের প্রকৌশলীকে চিহ্নিত করতে পারেন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ধাপ ২: সমস্যার ধরণ সুস্পষ্টভাবে বলুন</span>
                </div>
                <p className="text-xs">
                  শুধু &ldquo;কারেন্ট নেই&rdquo; না বলে নির্দিষ্ট করে বলুন: পুরো এলাকায় নেই নাকি শুধু আপনার বিল্ডিংয়ে; ফেজ ড্রপ হয়েছে নাকি ট্রান্সফরমার থেকে ধোঁয়া বেরিয়েছে। ওয়াসা পানির ক্ষেত্রে পানি কি সম্পূর্ণ বন্ধ নাকি ময়লা পানি আসছে তা উল্লেখ করুন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ধাপ ৩: অভিযোগ ট্র্যাকিং নম্বর (Ticket Number) লিখে নিন</span>
                </div>
                <p className="text-xs">
                  কল শেষ করার আগে প্রতিনিধির কাছ থেকে লিখিত অভিযোগের ট্র্যাকিং নম্বর বা টিকিট নম্বর চেয়ে নিন। পরবর্তী ফলো-আপ বা পুনরায় কল করার সময় এই নম্বরটি জানালে নতুন করে সমস্যা বুঝিয়ে বলতে হয় না।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ধাপ ৪: সমাধান না হলে সংশ্লিষ্ট নির্বাহী প্রকৌশলীর কাছে আপিল</span>
                </div>
                <p className="text-xs">
                  স্ট্যান্ডার্ড সার্ভিস লেভেল (SLA) অনুযায়ী নির্দিষ্ট সময়ের মধ্যে টেকনিশিয়ান দল উপস্থিত না হলে টিকিট নম্বরসহ সংশ্লিষ্ট বিদ্যুৎ ও ওয়াসা আঞ্চলিক নির্বাহী প্রকৌশলীর (XEN) দপ্তরে লিখিতভাবে অভিযোগটি ফরোয়ার্ড করুন।
                </p>
              </div>
            </div>
          </section>

          {/* Sources Section */}
          <section className="p-5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-3">
            <h3 className="font-bold text-[var(--text-main)] text-xs tracking-wide">
              তথ্যসূত্র ও প্রাতিষ্ঠানিক রেফারেন্স
            </h3>
            <ul className="space-y-2 text-xs list-none p-0 m-0">
              {guide.sources.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{s.name}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                    {s.note && <span className="text-[var(--text-sub)]"> — {s.note}</span>}
                    <span className="text-[11px] text-[var(--text-sub)]/80 block">
                      (যাচাইয়ের তারিখ: ২০ নভেম্বর ২০২৬)
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </article>

        {/* Internal Linking: Relevant Live Area Pages (3+ seed zones) */}
        <RelevantZonesCard
          zones={guide.relevantZones}
          title="আপনার এলাকায় লাইভ ইউটিলিটি স্ট্যাটাস দেখুন"
        />

        {/* Report CTA */}
        <GuideCTA
          categoryLabel="আপনার এলাকার সমস্যার কি কোনো সমাধান হয়েছে?"
          categoryAction="এলাকার লাইভ হাল জানান"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
