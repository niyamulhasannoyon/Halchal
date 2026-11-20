import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Flame,
  Calendar,
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Wind,
  Sparkles,
  Zap,
  ExternalLink,
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

const guide = getGuideBySlug('low-gas-pressure-safety')!;

export const metadata: Metadata = buildMetadata({
  title: guide.metaTitle,
  description: guide.metaDescription,
  path: guide.path,
  type: 'article',
});

export default function LowGasPressureSafetyPage() {
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
            { name: 'গ্যাসের চাপ কম থাকলে রান্নার নিরাপত্তা' },
          ]}
        />

        {/* Article Header */}
        <header className="space-y-4 pb-6 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
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
            ঢাকা শহরসহ দেশের বিভিন্ন আবাসিক এলাকায় শীতকালে বা পিক আওয়ারে পাইপলাইনে গ্যাসের চাপ আশঙ্কাজনকভাবে
            কমে যায়। এ সময় রান্না করতে গিয়ে অনেকেই মারাত্মক ঝুঁকিপূর্ণ পদ্ধতি অবলম্বন করেন, যা জীবননাশের কারণ
            হতে পারে। তিতাস গ্যাস এবং ফায়ার সার্ভিসের নির্দেশিকা অনুযায়ী জেনে নিন নিরাপত্তা বজায় রেখে রান্নার সঠিক উপায়।
          </p>

          <div className="pt-2 flex items-center justify-between text-xs text-[var(--text-sub)] border-t border-[var(--surface-border)]/60">
            <div>লেখক: <strong>{guide.author.name}</strong> ({guide.author.role})</div>
            <div>পর্যালোচক: <strong>{guide.reviewer.name}</strong></div>
          </div>
        </header>

        {/* Strict Safety Alert: No Suction Pumps */}
        <CalloutBox
          title="কঠোর প্রাতিষ্ঠানিক সতর্কতা: সাকশন পাম্প বা কম্প্রেসর সম্পূর্ণ নিষিদ্ধ ও বিপজ্জনক"
          variant="danger"
        >
          পাইপলাইনের গ্যাস টেনে নেওয়ার জন্য ইলেকট্রিক সাকশন পাম্প বা বুস্টার কম্প্রেসর ব্যবহার করা
          <strong> বেআইনি এবং মারাত্মক অপরাধ</strong>। এর ফলে লাইনের ভেতর শূন্যতা (ভ্যাকুয়াম) তৈরি হয়ে
          পাইপলাইন ফেটে যাওয়া, পাইপে বাতাস ঢুকে গ্যাস মিশ্রিত হয়ে বিকট বিস্ফোরণ এবং পুরো ভবনে অগ্নিকাণ্ডের
          ঝুঁকি তৈরি হয়। এছাড়া কার্বন মনোক্সাইড বিষক্রিয়ায় পরিবারের সদস্যদের প্রাণহানি ঘটতে পারে।
        </CalloutBox>

        {/* Article Body Content */}
        <article className="space-y-6 text-sm text-[var(--text-sub)] leading-relaxed">
          {/* Section 1: কেন চাপ কমে? */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ১. পাইপলাইনে গ্যাসের চাপ কেন কমে যায়?
            </h2>
            <p>
              আবাসিক এলাকায় সাধারণত সকাল ৭টা থেকে বেলা ১২টা এবং বিকেল ৫টা থেকে রাত ৯টা পর্যন্ত রান্নার
              পিক আওয়ার থাকে। এ সময় একই লাইনে বহু পরিবারের একযোগে চুলা জ্বালানোর কারণে গ্যাস লাইনের চাপ
              (Pressure) স্ট্যান্ডার্ড পিএসআই (PSI) থেকে নিচে নেমে যায়। শীতের দিনে লাইনে কনডেনসেট জমে
              গ্যাস প্রবাহ বিঘ্নিত হলে সমস্যা আরও তীব্র হয়।
            </p>
            <p>
              চাপ কম থাকার অর্থ এই নয় যে লাইনে গ্যাস নেই; বরং ধীরগতিতে আসা গ্যাস অনেক সময় অসতর্কতায়
              চুলা নিভে যাওয়ার পর পুরো ঘরে ছড়িয়ে পড়ার ফাঁদ তৈরি করে।
            </p>
          </section>

          {/* Section 2: রান্নাঘরের ৫টি সোনালী নিরাপত্তা নিয়ম */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ২. কম চাপে রান্নার সময় ৫টি আবশ্যক নিরাপত্তা নিয়ম
            </h2>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <Wind className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ক. দিয়াশলাই জ্বালানোর আগে জানালা-দরজা খুলুন</span>
                </div>
                <p className="text-xs">
                  রান্নাঘরে ঢুকেই কখনো সরাসরি দিয়াশলাই জ্বালাবেন না বা বৈদ্যুতিক সুইচ অন করবেন না। আগে রান্নাঘরের সব জানালা-দরজা খুলে দিন এবং কমপক্ষে ২ থেকে ৩ মিনিট বাতাস চলাচলের সুযোগ দিন। জমে থাকা গ্যাস থাকলে তা দ্রুত বের হয়ে যাবে।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <Flame className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>খ. আগে দিয়াশলাই জ্বালান, তারপর চুলার নব ঘোরান</span>
                </div>
                <p className="text-xs">
                  সাধারণত অনেকেই চুলার নব খুলে দিয়ে তারপর ম্যাচ কাঠি খোঁজেন। কম চাপের সময় এই অভ্যাস অত্যন্ত বিপজ্জনক। আগে ম্যাচের কাঠি বা গ্যাস লাইটার জ্বালিয়ে বার্নারের কাছে ধরুন, তারপর ধীরেসুস্থে চুলার নব অন করুন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>গ. নিভু নিভু চুলা রেখে রান্নাঘর ছেড়ে যাবেন না</span>
                </div>
                <p className="text-xs">
                  গ্যাসের চাপ খুব কম থাকলে আগুনের শিখা অত্যন্ত ছোট থাকে। এ সময় বাতাস বা মৃদু ফ্যানের বাতাসেও চুলা নিভে যেতে পারে। চুলা নিভে গেলে গ্যাস বের হওয়া অব্যাহত থাকে এবং বন্ধ ঘরে জমে বিস্ফোরক মিশ্রণ তৈরি করে। তাই চুলা চালু থাকা অবস্থায় সবসময় কাছে উপস্থিত থাকুন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ঘ. লিকেজ পরীক্ষায় কেবল সাবান-পানির ফেনা ব্যবহার করুন</span>
                </div>
                <p className="text-xs">
                  গ্যাসের গন্ধ পেলে বা পাইপের জোড়া পরীক্ষা করতে কখনো আগুন বা দিয়াশলাই ব্যবহার করবেন না। একটি পাত্রে সাবান বা ডিটারজেন্ট মিশিয়ে ফেনা তৈরি করে পাইপের সংযোগস্থলে লাগান। যদি বুদবুদ ওঠে, তবে নিশ্চিতভাবেই গ্যাস লিক করছে। তাৎক্ষণিকভাবে মূল রাইজার ভাল্ব বন্ধ করে দিন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ঙ. বার্নার নিয়মিত পরিষ্কার রাখুন</span>
                </div>
                <p className="text-xs">
                  বার্নারের ছিদ্রগুলোতে ময়লা, তেল বা ঝোল জমে থাকলে কম চাপে গ্যাস আরও কম বের হয়। প্রতি সপ্তাহে একবার তারের ব্রাশ দিয়ে বার্নারের ছিদ্রগুলো পরিষ্কার করলে গ্যাসের শিখা সুষম ও নীল বর্ণে জ্বলে।
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: নিরাপদ বিকল্প রান্নার উপায় */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ৩. গ্যাসের বিকল্প: বিদ্যুৎ ও প্রামাণ্য সিলিন্ডারের নিরাপদ ব্যবহার
            </h2>
            <p>
              যখন গ্যাসের চাপ একেবারেই থাকে না, তখন ঘণ্টার পর ঘণ্টা চুলার ওপর অপেক্ষা না করে নিরাপদ বিকল্প
              পদ্ধতি ব্যবহার করাই বিচক্ষণ নাগরিকের কাজ:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <Zap className="w-4 h-4 text-yellow-400 shrink-0" aria-hidden="true" />
                  <span>ইন্ডাকশন ও ইনফ্রারেড চুলা</span>
                </div>
                <p className="text-xs">
                  বিদ্যুৎ সচল থাকলে ইন্ডাকশন কুকার বা ইলেকট্রিক রাইস কুকার ব্যবহার করা পাইপলাইনের বিপজ্জনক বিকল্পের চেয়ে শতভাগ নিরাপদ ও সাশ্রয়ী। এতে মাত্র ১৫-২০ মিনিটেই রান্নার কাজ শেষ হয়।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <Flame className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                  <span>সার্টিফায়েড বোতলজাত এলপিজি</span>
                </div>
                <p className="text-xs">
                  জরুরি রান্নার ব্যাকআপ হিসেবে অনুমোদিত ব্র্যান্ডের ১২ কেজি এলপিজি সিলিন্ডার এবং বিএসটিআই অনুমোদিত রেগুলেটর ও পাইপ ব্যবহার করুন। সিলিন্ডার সবসময় সোজা ও বাতাস চলাচলযুক্ত স্থানে রাখুন।
                </p>
              </div>
            </div>
          </section>

          {/* Emergency Hotline Info */}
          <CalloutBox title="জরুরি পরিস্থিতিতে যোগাযোগ করুন" variant="info">
            যদি তীব্র গ্যাসের গন্ধ পান বা পাইপলাইনে বিকট শব্দ শোনেন, তবে অবিলম্বে তিতাস গ্যাস ইমার্জেন্সি
            কন্ট্রোল রুম <strong>১৬৪৯৬</strong> (16496) অথবা জাতীয় জরুরি সেবা <strong>৯৯৯</strong>-এ কল করুন।
          </CalloutBox>

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
          title="আপনার এলাকায় গ্যাসের লাইভ চাপ ও স্ট্যাটাস দেখুন"
        />

        {/* Report CTA */}
        <GuideCTA
          categoryLabel="আপনার এলাকায় এখন গ্যাসের চাপ কেমন?"
          categoryAction="গ্যাসের লাইভ অবস্থা জানান"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
