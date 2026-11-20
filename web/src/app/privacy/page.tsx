import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Trash2, EyeOff, Clock, AlertCircle } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BottomNav } from '@/components/BottomNav';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = buildMetadata({
  title: 'গোপনীয়তা নীতি',
  description:
    'হালচালের কঠোর গোপনীয়তা নীতি: জিরো র জিপিএস স্টোরেজ, সম্পূর্ণ নাগরিক পরিচয়হীনতা এবং স্বচ্ছ ডেটা নীতিমালার বিস্তারিত বিবরণ।',
  path: '/privacy',
});

export default function PrivacyPolicyPage() {
  const jsonLd = buildWebPageJsonLd({
    title: 'গোপনীয়তা নীতি',
    description:
      'হালচালের কঠোর গোপনীয়তা নীতি: জিরো র জিপিএস স্টোরেজ, সম্পূর্ণ নাগরিক পরিচয়হীনতা এবং স্বচ্ছ ডেটা নীতিমালার বিস্তারিত বিবরণ।',
    path: '/privacy',
  });

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] pb-20 font-bengali transition-colors flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader activePath="/privacy" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 flex-1 w-full">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ name: 'গোপনীয়তা নীতি' }]} />

        {/* Lawyer Review Mandatory Notice */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>আইনি সতর্কবার্তা ও পর্যালোচনার বাধ্যবাধকতা</span>
          </div>
          <p className="leading-relaxed">
            <strong>বিশেষ দ্রষ্টব্য:</strong> বাংলাদেশে ডেটা সুরক্ষা ও সাইবার আইন (যেমন প্রস্তাবিত
            ব্যক্তিগত উপাত্ত সুরক্ষা আইন / Cyber Security Act) নিয়মিত হালনাগাদ হচ্ছে। উন্মুক্ত
            পাইলট বা পাবলিক লঞ্চের পূর্বে এই খসড়া নীতিমালাটি বাংলাদেশ সুপ্রিম কোর্টের একজন যোগ্য
            সাইবার আইনজীবী (Advocate / Legal Counsel) দ্বারা পূর্ণ পর্যালোচনা এবং চূড়ান্ত অনুমোদন করানো
            বাধ্যতামূলক।
          </p>
        </div>

        {/* Header Title */}
        <header className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
            গোপনীয়তা নীতি (Privacy Policy)
          </h1>
          <p className="text-xs text-[var(--text-sub)]">
            সর্বশেষ হালনাগাদ: ২০ নভেম্বর ২০২৬ • খসড়া সংস্করণ (আইনি পর্যালোচনার জন্য প্রস্তুত)
          </p>
        </header>

        {/* Introduction */}
        <section className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3 text-emerald-500">
            <Shield className="w-6 h-6" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">আমাদের মূল দর্শন: গোপনীয়তাই প্রথম</h2>
          </div>
          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            হালচাল (Halchal) তৈরি হয়েছে সাধারণ নাগরিকদের বিদ্যুৎ, গ্যাস, পানি ও এলপিজির সঠিক খবর
            জানানোর উদ্দেশ্যে। আমরা বিশ্বাস করি আপনার ব্যক্তিগত তথ্য কোনো সার্ভারে জমিয়ে না রেখেই একটি
            নির্ভরযোগ্য কমিউনিটি সেবা পরিচালনা করা সম্ভব।
          </p>
        </section>

        {/* What We Collect vs What We NEVER Collect */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Collected */}
          <div className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-[var(--text-main)]">আমরা যা সংগ্রহ করি</h3>
            </div>
            <ul className="text-xs text-[var(--text-sub)] space-y-2.5 leading-relaxed list-disc list-inside">
              <li>
                <strong>এলাকার হেক্সাগন কোড (H3 Cell):</strong> আনুমানিক ~০.৭৪ বর্গকিলোমিটার আয়তনের
                একটি ভৌগোলিক কোড (রেজোলিউশন ৮)।
              </li>
              <li>
                <strong>অজ্ঞাত পরিচয় আইডি (Anonymous ID):</strong> অ্যাপ খোলার সাথে সাথে তৈরি হওয়া একটি
                এলোমেলো র‍্যান্ডম শনাক্তকারী নম্বর।
              </li>
              <li>
                <strong>পুশ নোটিফিকেশন টোকেন:</strong> আপনি যদি নিজে থেকে নোটিফিকেশন পেতে চান, শুধুমাত্র
                তখনই ব্রাউজার বা ডিভাইসের পুশ টোকেন সংরক্ষিত হয়।
              </li>
            </ul>
          </div>

          {/* NOT Collected */}
          <div className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-bold text-base">
              <EyeOff className="w-4 h-4 text-red-500" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[var(--text-main)]">আমরা যা কখনোই সংরক্ষণ করি না</h3>
            </div>
            <ul className="text-xs text-[var(--text-sub)] space-y-2.5 leading-relaxed list-disc list-inside">
              <li>
                <strong>সুনির্দিষ্ট জিপিএস কোঅর্ডিনেট:</strong> আপনার অক্ষাংশ/দ্রাঘিমাংশ (Latitude/Longitude)
                কিংবা বাসার নির্ভুল অবস্থান আমাদের কোনো ডাটাবেস বা লগে সংরক্ষণ করা হয় না।
              </li>
              <li>
                <strong>ব্যক্তিগত পরিচয়:</strong> আপনার নাম, জাতীয় পরিচয়পত্র, বাসার ঠিকানা কিংবা সামাজিক
                যোগাযোগমাধ্যমের প্রোফাইল প্রয়োজন নেই।
              </li>
              <li>
                <strong>দোকান বা ডিলারের নাম:</strong> এলপিজি বা সেবাদাতাদের কোনো ব্যক্তি বা প্রতিষ্ঠানের
                নাম Halchal-এ নেওয়া হয় না।
              </li>
            </ul>
          </div>
        </section>

        {/* 72-Hour Ephemeral Retention */}
        <section className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-500">
            <Clock className="w-5 h-5" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--text-main)]">৭২ ঘণ্টার কাঁচা ডেটা মুছে ফেলার নিয়ম</h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            একটি এলাকা নিয়ে আপনার দেওয়া কাঁচা রিপোর্টটি আমাদের ডাটাবেসে <strong>সর্বোচ্চ ৭২ ঘণ্টা</strong>
            থাকে। স্বয়ংক্রিয় ব্যাকগ্রাউন্ড ক্লিনআপ সিস্টেমের মাধ্যমে ৭২ ঘণ্টা পর তা সম্পূর্ণ চিরতরে
            ডিলিট হয়ে যায়। কেবল এলাকার সামগ্রিক ঐতিহাসিক পরিসংখ্যান (যেমন: সপ্তাহে কত ঘণ্টা বিদ্যুৎ ছিল
            না) অজ্ঞাত ও সমষ্টিগত আকারে সংরক্ষিত থাকে।
          </p>
        </section>

        {/* Right to Erasure / Delete Account & Data */}
        <section className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-red-500">
            <Trash2 className="w-5 h-5" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--text-main)]">অ্যাকাউন্ট ও সকল তথ্য মুছে ফেলার অধিকার</h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            আপনার তথ্যের ওপর পূর্ণ নিয়ন্ত্রণ আপনার নিজের। যেকোনো সময় এক ক্লিকে হালচাল থেকে আপনার
            অ্যাকাউন্ট, প্রোফাইল, পুশ সাবস্ক্রিপশন এবং পূর্বে করা সব রিপোর্ট স্থায়ীভাবে মুছে ফেলতে
            পারেন।
          </p>
          <div className="pt-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>সেটিংস থেকে তথ্য মুছে ফেলুন</span>
            </Link>
          </div>
        </section>

        {/* Contact and Takedown */}
        <section className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-2 text-xs text-[var(--text-sub)]">
          <h3 className="font-bold text-[var(--text-main)] text-sm">যোগাযোগ ও টেকডাউন অনুরোধ</h3>
          <p className="leading-relaxed">
            কোনো তথ্যের অপব্যবহার বা ভুল তথ্যের প্রতিকারের জন্য অবিলম্বে আমাদের
            ডেটা প্রটেকশন অফিসার ও সাপোর্ট টিমের সাথে যোগাযোগ করুন:
          </p>
          <div className="font-mono text-emerald-400 space-y-1">
            <p>ইমেইল: privacy@halchal.bd</p>
            <p>টেকডাউন ও অপব্যবহার: takedown@halchal.bd</p>
          </div>
          <div className="pt-2">
            <Link href="/contact" className="text-emerald-400 hover:underline">
              বিস্তারিত যোগাযোগ ও টেকডাউন নীতিমালা দেখুন →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
