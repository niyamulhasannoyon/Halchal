import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  Users,
  Clock,
  Lock,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight,
  EyeOff,
  Flame,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = buildMetadata({
  title: 'কীভাবে কাজ করে হালচাল — অ্যালগরিদম ও ডেটা নীতি',
  description:
    'হালচালের ৩-রিপোর্টার কনফার্মেশন অ্যালগরিদম, ট্রাস্ট স্কোরিং, ৭২ ঘণ্টার ডেটা অটো-ডিলিট এবং উবার এইচ৩ প্রাইভেসির পূর্ণাঙ্গ ও সৎ বিবরণ।',
  path: '/how-it-works',
});

export default function HowItWorksPage() {
  const jsonLd = buildWebPageJsonLd({
    title: 'কীভাবে কাজ করে হালচাল — অ্যালগরিদম ও ডেটা নীতি',
    description:
      'হালচালের ৩-রিপোর্টার কনফার্মেশন অ্যালগরিদম, ট্রাস্ট স্কোরিং, ৭২ ঘণ্টার ডেটা অটো-ডিলিট এবং উবার এইচ৩ প্রাইভেসির পূর্ণাঙ্গ ও সৎ বিবরণ।',
    path: '/how-it-works',
    type: 'WebPage',
  });

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] font-bengali transition-colors flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader activePath="/how-it-works" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ name: 'কীভাবে কাজ করে' }]} />

        {/* Header Banner */}
        <header className="space-y-3 pb-6 border-b border-[var(--surface-border)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>স্বচ্ছ প্রযুক্তি ও কনসেনসাস অ্যালগরিদম</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            কীভাবে কাজ করে হালচাল?
          </h1>
          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            একটি বোতামে ট্যাপ করার পর কীভাবে তা পুরো এলাকার নিশ্চিত স্ট্যাটাসে রূপান্তরিত হয়? কীভাবে
            আমরা ভুয়া রিপোর্ট প্রতিহত করি এবং আপনার ব্যক্তিগত গোপনীয়তা রক্ষা করি—তার অকপট বিবরণ।
          </p>
        </header>

        {/* Core Disclaimer Box */}
        <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border-2 border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>আমাদের মূল নীতি: সততা ও নিরপেক্ষতা</span>
          </div>
          <p className="text-xs text-[var(--text-main)] font-semibold leading-relaxed">
            &ldquo;নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়।&rdquo;
          </p>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            হালচাল কোনো সেন্সরযুক্ত সরকারি গ্রিড নয়। এটি সম্পূর্ণভাবে আপনার আশপাশের মানুষের স্বতঃস্ফূর্ত
            সহযোগিতার প্রতিফলন।
          </p>
        </div>

        {/* Step 1: 3-Reporter Consensus Rule */}
        <section className="p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-5">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Users className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ১. ৩-রিপোর্টার কনফার্মেশন অ্যালগরিদম (Consensus Threshold)
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            কোনো এলাকায় বিদ্যুৎ বন্ধ হয়ে গেল বা গ্যাস চলে গেল—একজন ব্যবহারকারী রিপোর্ট করলেই তা সাথে সাথে
            অন্য সবার জন্য &lsquo;নিশ্চিত লাল বা হলুদ&rsquo; হিসেবে প্রদর্শিত হয় না। অনিচ্ছাকৃত ভুল বা ইচ্ছাকৃত
            বিভ্রান্তি রোধ করতে হালচাল দুটি কঠোর গাণিতিক শর্ত প্রয়োগ করে:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                শর্ত ১: ন্যূনতম ৩ জন পৃথক নাগরিক
              </span>
              <div className="text-2xl font-black text-[var(--text-main)]">
                ৩+ ব্যক্তি
              </div>
              <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                একই এলাকার মধ্যে অন্তত ৩টি ভিন্ন ডিভাইস বা অ্যাকাউন্ট থেকে একই ধরনের ইউটিলিটি অবস্থা রিপোর্ট হতে হবে।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                শর্ত ২: ওয়েটেড ট্রাস্ট স্কোর
              </span>
              <div className="text-2xl font-black text-[var(--text-main)]">
                ৩.০+ স্কোর
              </div>
              <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                সকল নাগরিকের রিপোর্ট করা ট্রাস্ট ওয়েটের সমন্বিত মোট মান কমপক্ষে ৩.০ পয়েন্ট হতে হবে।
              </p>
            </div>
          </div>

          {/* Collusion Guard Callout */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>সিন্ডিকেট ও একক প্রভাব প্রতিরোধ (Collusion Guard)</span>
            </div>
            <p className="leading-relaxed">
              <strong>বিশেষ নিয়ম:</strong> কোনো একক ব্যবহারকারীর ট্রাস্ট স্কোর যত বেশিই হোক না কেন,
              তিনি একা কখনোই কোনো এলাকার স্ট্যাটাস পাল্টাতে পারবেন না। ন্যূনতম ৩ জন ভিন্ন নাগরিকের সম্মতি
              হওয়া বাধ্যতামূলক। এটি রাজনৈতিক বা বাণিজ্যিক অসৎ উদ্দেশ্যে কোনো বিভ্রান্তি ছড়ানো সম্পূর্ণ বন্ধ রাখে।
            </p>
          </div>
        </section>

        {/* Step 2: Plain Language Trust Weighting */}
        <section className="p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-5">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Layers className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ২. সহজ ভাষায় ট্রাস্ট ওয়েট বা নাগরিক নির্ভরযোগ্যতা
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            হালচালে যে কেউ এক ট্যাপে অ্যাকাউন্ট ছাড়াই রিপোর্ট করতে পারেন। তবে ভুয়া বট ও সাইবিল অ্যাটাক
            প্রতিরোধে ট্রাস্ট স্কোরিংয়ের সহজ অনুপাত বজায় রাখা হয়:
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300 font-medium">
                    ০.৫x ওয়েট
                  </span>
                  <h3 className="font-bold text-xs text-[var(--text-main)]">বেনামী নাগরিক (Anonymous)</h3>
                </div>
                <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                  অ্যাপ খোলার পর কোনো সাইন-ইন না করে সাধারণ ভিজিটর হিসেবে দেওয়া রিপোর্ট। এটি গ্রহণ করা হয়, তবে নিশ্চিত হতে একাধিক নাগরিকের রিপোর্ট লাগে।
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    ১.০x ওয়েট
                  </span>
                  <h3 className="font-bold text-xs text-[var(--text-main)]">গুগল যাচাইকৃত নাগরিক (Google OAuth)</h3>
                </div>
                <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                  একটি সক্রিয় গুগল অ্যাকাউন্টের মাধ্যমে সাইন-ইন করা নাগরিক। এর ফলে ভুয়া বট অ্যাকাউন্ট প্রতিহত করা সহজ হয়।
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    ১.৫x ওয়েট
                  </span>
                  <h3 className="font-bold text-xs text-[var(--text-main)]">মোবাইল নম্বর যাচাইকৃত নাগরিক (Phone OTP)</h3>
                </div>
                <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                  বাংলাদেশের সক্রিয় সিম কার্ড থেকে ওটিপি কোড যাচাইকৃত আবাসিক নাগরিক। এদের দেওয়া রিপোর্টের ওজন সর্বোচ্চ ধরা হয়।
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Limits of Data & What Unknown Means */}
        <section className="p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ৩. তথ্যের সীমাবদ্ধতা ও &lsquo;তথ্য নেই&rsquo; (Unknown) স্ট্যাটাস
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            একটি প্রযুক্তি প্ল্যাটফর্ম তখনই বিশ্বাসযোগ্য হয়, যখন সে তার সীমাবদ্ধতা নিয়ে খোলামেলা কথা বলে:
          </p>
          <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-3 text-xs leading-relaxed">
            <h3 className="font-bold text-[var(--text-main)] text-xs text-amber-400">
              সোনালী নিয়ম: &lsquo;তথ্য নেই&rsquo; (Unknown) কখনোই সবুজ (সব ঠিক) নয়
            </h3>
            <p className="text-[var(--text-sub)]">
              কোনো এলাকা থেকে সাম্প্রতিক কোনো নাগরিক রিপোর্ট না থাকলে আমরা কখনোই ধরে নিই না যে সেখানকার
              বিদ্যুৎ বা গ্যাস সচল আছে। রিপোর্টের অনুপস্থিতি সচলতার প্রমাণ নয়। এমন এলাকাকে ধূসর রঙে
              <strong>&lsquo;তথ্য নেই&rsquo;</strong> হিসেবে দেখানো হয়।
            </p>
            <p className="text-[var(--text-sub)]">
              একইভাবে, কোনো এলাকায় ১ বা ২ জন রিপোর্ট করেছেন কিন্তু ৩ জনের শর্ত পূরণ হয়নি, তখন তা ড্যাশ বর্ডারে
              <strong>&lsquo;অনিশ্চিত&rsquo; (Unverified)</strong> থাকে।
            </p>
          </div>
        </section>

        {/* Step 4: Privacy by Design & 72-Hour TTL */}
        <section className="p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Lock className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ৪. কঠোর গোপনীয়তা নীতি: উবার এইচ৩ ও ৭২ ঘণ্টার ডেটা মোছা
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            নাগরিকরা যেন নিরাপদে ও কোনো নজরদারির ভয় ছাড়াই রিপোর্ট করতে পারেন, সেজন্য হালচাল আর্কিটেকচারাল
            গোপনীয়তা নিশ্চিত করে:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
              <EyeOff className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <h3 className="font-bold text-[var(--text-main)]">জিরো জিপিএস স্টোরেজ</h3>
              <p className="text-[var(--text-sub)] leading-relaxed text-[11px]">
                আপনার অক্ষাংশ/দ্রাঘিমাংশ বা বাসার ঠিকানা সার্ভারে জমা হয় না। মেমরিতে প্রসেস হয়ে শুধু ~০.৭৪ বর্গকিমি হেক্স কোড রাখা হয়।
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
              <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <h3 className="font-bold text-[var(--text-main)]">৭২ ঘণ্টায় স্থায়ী বিনাশ</h3>
              <p className="text-[var(--text-sub)] leading-relaxed text-[11px]">
                প্রতিটি স্বতন্ত্র কাঁচা রিপোর্ট ৭২ ঘণ্টা পর স্বয়ংক্রিয় ব্যাকগ্রাউন্ড রোবট দিয়ে চিরতরে ডিলিট করা হয়।
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
              <Flame className="w-4 h-4 text-orange-400" aria-hidden="true" />
              <h3 className="font-bold text-[var(--text-main)]">দোকানের নাম গোপন</h3>
              <p className="text-[var(--text-sub)] leading-relaxed text-[11px]">
                এলপিজি সিলিন্ডারের ক্ষেত্রে কোনো ডিলার বা দোকানের নাম নেওয়া হয় না। ৫টি রিপোর্টের ভিত্তিতে শুধু এলাকার গড় প্রকাশ পায়।
              </p>
            </div>
          </div>
        </section>

        {/* Action Link to Live Status & Guides */}
        <section className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-[var(--surface-bg)] to-[var(--surface-elevated)] border border-emerald-500/30 text-center space-y-4">
          <h2 className="text-base font-bold text-[var(--text-main)]">
            এখনই আপনার এলাকার হাল দেখুন বা রিপোর্ট করুন
          </h2>
          <p className="text-xs text-[var(--text-sub)] max-w-md mx-auto leading-relaxed">
            আপনার ১টি ট্যাপ এলাকার বিদ্যুৎ, গ্যাস বা পানির নির্ভরযোগ্য চিত্র তুলে ধরতে পারে।
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              <span>লাইভ স্ট্যাটাস দেখুন</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--text-main)] text-xs font-medium hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
            >
              <span>নাগরিক গাইডসমূহ পড়ুন</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
