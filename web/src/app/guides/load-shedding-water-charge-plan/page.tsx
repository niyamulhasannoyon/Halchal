import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Zap,
  Calendar,
  Clock,
  Droplets,
  BatteryCharging,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Lightbulb,
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

const guide = getGuideBySlug('load-shedding-water-charge-plan')!;

export const metadata: Metadata = buildMetadata({
  title: guide.metaTitle,
  description: guide.metaDescription,
  path: guide.path,
  type: 'article',
});

export default function LoadSheddingWaterChargePlanPage() {
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
            { name: 'লোডশেডিংয়ে পানি ও ফোন চার্জের প্ল্যান' },
          ]}
        />

        {/* Article Header */}
        <header className="space-y-4 pb-6 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
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
            শহরাঞ্চলে বিদ্যুৎ চলে গেলে সবচেয়ে বড় সংকট তৈরি হয় পানির ক্ষেত্রে। কারণ অ্যাপার্টমেন্টের ভূগর্ভস্থ
            রিজার্ভার থেকে ছাদের ট্যাংকে পানি তোলার পানির পাম্প বা মটোর সম্পূর্ণভাবে বিদ্যুতের ওপর নির্ভরশীল।
            এর সাথে যোগ হয় মোবাইল ফোনের ব্যাটারি নিঃশেষ হওয়ার উদ্বেগ। এই গাইডে জেনে নিন লোডশেডিংয়ের সময়
            পানি ও মোবাইল চার্জ ব্যবস্থাপনার একটি বাস্তবসম্মত ও সাশ্রয়ী ব্লু-প্রিন্ট।
          </p>

          <div className="pt-2 flex items-center justify-between text-xs text-[var(--text-sub)] border-t border-[var(--surface-border)]/60">
            <div>লেখক: <strong>{guide.author.name}</strong> ({guide.author.role})</div>
            <div>পর্যালোচক: <strong>{guide.reviewer.name}</strong></div>
          </div>
        </header>

        {/* Core Strategy Callout */}
        <CalloutBox title="মূল প্রস্তুতি নীতি: বিদ্যুৎ থাকার সময়েই ব্যাকআপ সম্পূর্ণ করুন" variant="success">
          লোডশেডিং শুরু হওয়ার পর পানি জমানোর চেষ্টা ফলপ্রসূ হয় না। বিদ্যুৎ আসার সাথে সাথেই অগ্রাধিকার
          ভিত্তিতে ছাদের পানির ট্যাংক ও পাওয়ার ব্যাংক শতভাগ পূর্ণ করে রাখাই হলো ব্ল্যাকআউটে নিশ্চিন্ত থাকার চাবিকাঠি।
        </CalloutBox>

        {/* Article Body Content */}
        <article className="space-y-6 text-sm text-[var(--text-sub)] leading-relaxed">
          {/* Section 1: পানি ব্যবস্থাপনা */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Droplets className="w-5 h-5 shrink-0" aria-hidden="true" />
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                ১. লোডশেডিংয়ে পানির ট্যাংক ও রিজার্ভ ব্যবস্থাপনা
              </h2>
            </div>
            <p>
              একটি সাধারণ চার সদস্যের পরিবারে প্রাত্যহিক রান্নাবান্না, খাওয়া, ওজু ও শৌচাগারের জন্য দৈনিক
              প্রায় ৫০০ থেকে ৬০০ লিটার পানির প্রয়োজন হয়। বিদ্যুৎ দীর্ঘক্ষণ না থাকলে ছাদের গ্র্যাভিটি ট্যাংক
              খালি হয়ে গেলে চরম ভোগান্তি নেমে আসে:
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ক. সুনির্দিষ্ট সময়ে মটোর চালানোর অভ্যাস গড়ে তুলুন</span>
                </div>
                <p className="text-xs">
                  বিদ্যুৎ বিভাগের সম্ভাব্য লোডশেডিং পিক আওয়ার শুরুর আগেই (যেমন ভোর ৬টা এবং দুপুর ২টা) মটোর ছেড়ে ছাদের ট্যাংক সম্পূর্ণ ভরে নিন। পানির ট্যাংকিতে অটো-কাট লেভেল সুইচ ব্যবহার করলে ওভারফ্লো ছাড়াই পূর্ণ পানি নিশ্চিত থাকে।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>খ. জরুরি পানীয় জল আলাদা সংরক্ষণ</span>
                </div>
                <p className="text-xs">
                  ফিল্টার বা ফুটানো পানি অন্তত ২০ লিটারের দুটি ফুড-গ্রেড জারে সবসময় মজুত রাখুন। লোডশেডিংয়ের সময় সাধারণ ট্যাপের পানি যখন ফুরিয়ে আসে, তখন যেন রান্নাবান্না ও পানের পানির সংকট না ঘটে।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>গ. গ্র্যাভিটি ফ্লো ও বালতি মজুত</span>
                </div>
                <p className="text-xs">
                  বাথরুমে সবসময় অন্তত দুটি বড় বালতি ও মগে পরিষ্কার পানি ঢেকে রাখুন। পাইপে পানির চাপ কমে গেলেও বালতিতে মজুত থাকা পানি দিয়ে অন্তত ২৪ ঘণ্টা জরুরি শৌচ কাজ চালানো সম্ভব।
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: ফোন ও পাওয়ার ব্যাংক চার্জের প্ল্যান */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <BatteryCharging className="w-5 h-5 shrink-0" aria-hidden="true" />
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                ২. মোবাইল ফোনের ব্যাটারি ও ইন্টারনেট কানেক্টিভিটি ধরে রাখার কৌশল
              </h2>
            </div>
            <p>
              জরুরি দুর্যোগ ও ব্ল্যাকআউটের সময় আত্মীয়স্বজনের সাথে যোগাযোগ ও এলাকার ইউটিলিটি খবর পাওয়া জীবনরক্ষাকারী
              হতে পারে। ফোনের চার্জ অপচয় রোধ করতে নিচের কৌশলগুলো মেনে চলুন:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>আল্ট্রা ব্যাটারি সেভার অন করুন</span>
                </div>
                <p className="text-xs">
                  বিদ্যুৎ চলে যাওয়ার সাথে সাথেই ফোনের ব্যাটারি সেভার অপশন চালু করুন। ব্যাকগ্রাউন্ড রিফ্রেশ, অটো-সিঙ্ক ও ব্লুটুথ বন্ধ রাখলে সাধারণ স্মার্টফোনের ব্যাটারি লাইফ প্রায় দ্বিগুণ সময় পর্যন্ত টিকে থাকে।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <Zap className="w-4 h-4 text-yellow-400 shrink-0" aria-hidden="true" />
                  <span>পাওয়ার ব্যাংক সংরক্ষণ নিয়ম</span>
                </div>
                <p className="text-xs">
                  পাওয়ার ব্যাংককে কখনোই সম্পূর্ণ শূন্য হতে দেবেন না। বিদ্যুৎ সচল থাকা অবস্থাতেই ১০,০০০ বা ২০,০০০ এমএএইচ পাওয়ার ব্যাংক ৮০%-১০০% চার্জ করে রাখুন এবং ফোনের চার্জ ২০% এ নামার পর চার্জে দিন।
                </p>
              </div>
            </div>

            {/* Halchal 2G/3G Resilience Note */}
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-xs space-y-1.5">
              <h3 className="font-bold text-[var(--text-main)] text-emerald-400">
                হালচালের ২জি ও ৩জি নেটওয়ার্ক সহনশীলতা
              </h3>
              <p>
                লোডশেডিংয়ের সময় মোবাইল টাওয়ারগুলোর জেনারেটর ক্ষমতা কমে যাওয়ায় ৪জি/৫জি নেটওয়ার্ক দুর্বল হয়ে
                পড়তে পারে। হালচাল প্ল্যাটফর্মটি বিশেষভাবে তৈরি হয়েছে যেন ধীরগতির ২জি বা ৩জি নেটওয়ার্কেও
                মাত্র কয়েক কিলোবাইট ডেটা খরচে আপনার এলাকার বিদ্যুৎ, গ্যাস ও পানির লাইভ খবর রেন্ডার করতে পারে।
              </p>
            </div>
          </section>

          {/* Section 3: আলো ও বাতাসের নিরাপদ বিকল্প */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <Lightbulb className="w-5 h-5 shrink-0" aria-hidden="true" />
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                ৩. নিরাপদ আলো ও বাতাসের ব্যবস্থা
              </h2>
            </div>
            <p>
              মোমবাতি ব্যবহারের অসতর্কতায় বাংলাদেশে প্রতি বছর বহু অগ্নিকাণ্ড ঘটে। নিরাপদ আলোর জন্য নিচের উপায়গুলো অনুসরণ করুন:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li><strong>রিচার্জেবল এলইডি ইমার্জেন্সি লাইট:</strong> মোমবাতির পরিবর্তে ভালো মানের অটো-অন রিচার্জেবল লাইট ব্যবহার করুন।</li>
              <li><strong>ইউএসবি ডিসি টেবিল ফ্যান:</strong> পাওয়ার ব্যাংক দিয়ে চালনাযোগ্য ৫ ভোল্টের রিচার্জেবল ছোট ফ্যান বিদ্যুৎহীন গরমে বয়োবৃদ্ধ ও শিশুদের স্বস্তি দিতে কার্যকর ভূমিকা রাখে।</li>
              <li><strong>আইপিএস ব্যাটারি পরিচর্যা:</strong> যাদের বাসায় আইপিএস রয়েছে, তারা লোডশেডিংয়ের সময় অতিরিক্ত ভারী যন্ত্রপাতি (যেমন হিটার বা আয়রন) চালানো থেকে বিরত থাকুন এবং মাসে একবার ব্যাটারির ডিস্টিল্ড ওয়াটার লেভেল পরীক্ষা করুন।</li>
            </ul>
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
          title="আপনার এলাকায় বিদ্যুতের লাইভ অবস্থা ও লোডশেডিং দেখুন"
        />

        {/* Report CTA */}
        <GuideCTA
          categoryLabel="আপনার এলাকায় কি এখন বিদ্যুৎ আছে?"
          categoryAction="বিদ্যুতের লাইভ অবস্থা জানান"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
