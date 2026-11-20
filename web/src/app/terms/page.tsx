import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, AlertTriangle, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BottomNav } from '@/components/BottomNav';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = buildMetadata({
  title: 'ব্যবহারের শর্তাবলি',
  description:
    'হালচাল ব্যবহারের নিয়মাবলী, নাগরিক দায়িত্ব, অপব্যবহার রোধ নীতিমালা এবং পরিষেবা ব্যবহারের শর্তাবলির পূর্ণ বিবরণ।',
  path: '/terms',
});

export default function TermsPage() {
  const jsonLd = buildWebPageJsonLd({
    title: 'ব্যবহারের শর্তাবলি',
    description:
      'হালচাল ব্যবহারের নিয়মাবলী, নাগরিক দায়িত্ব, অপব্যবহার রোধ নীতিমালা এবং পরিষেবা ব্যবহারের শর্তাবলির পূর্ণ বিবরণ।',
    path: '/terms',
  });

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] pb-20 font-bengali transition-colors flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader activePath="/terms" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 flex-1 w-full">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ name: 'ব্যবহারের শর্তাবলি' }]} />

        {/* Lawyer Review Mandatory Notice */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>আইনি পর্যালোচনা নোটিশ</span>
          </div>
          <p className="leading-relaxed">
            <strong>বিজ্ঞপ্তি:</strong> বাংলাদেশের প্রচলিত সাইবার সুরক্ষা আইন ও নাগরিক প্ল্যাটফর্ম বিধিমালা
            অনুযায়ী এই শর্তাবলী প্রণীত। আনুষ্ঠানিকভাবে উন্মুক্ত করার পূর্বে একজন নিবন্ধিত বাংলাদেশী
            আইনজীবীর মাধ্যমে এই শর্তাবলী বৈধতা যাচাই এবং হালনাগাদ করা আবশ্যক।
          </p>
        </div>

        {/* Header Title */}
        <header className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
            ব্যবহারের শর্তাবলী (Terms of Service)
          </h1>
          <p className="text-xs text-[var(--text-sub)]">
            সর্বশেষ হালনাগাদ: ২০ নভেম্বর ২০২৬ • খসড়া সংস্করণ (আইনি পর্যালোচনার জন্য প্রস্তুত)
          </p>
        </header>

        {/* 1. Community Disclaimer */}
        <section className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-500">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--text-main)]">
              কমিউনিটি পরিমাপের নীতি ও দায়মুক্তি
            </h2>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--canvas-bg)] border border-[var(--surface-border)] text-xs text-emerald-400 font-medium">
            &ldquo;নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়।&rdquo;
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            হালচালে প্রদর্শিত বিদ্যুৎ, গ্যাস বা পানির সংযোগের অবস্থা সম্পূর্ণভাবে আপনার আশেপাশের
            সাধারণ নাগরিকদের দেওয়া তাৎক্ষণিক রিপোর্টের ভিত্তিতে সমন্বিত হয়। এটি ডিপিডিসি, ডেসকো, তিতাস
            গ্যাস, ওয়াসা বা কোনো সরকারি কর্তৃপক্ষের প্রাতিষ্ঠানিক ডিজিটাল মিটারিং নয়। জরুরি প্রয়োজনে
            সংশ্লিষ্ট সেবা প্রদানকারী প্রতিষ্ঠানের নিয়ন্ত্রণ কক্ষে যোগাযোগ করার অনুরোধ করা যাচ্ছে।
          </p>
        </section>

        {/* 2. Absolute Ban on Person / Shop / Dealer Names */}
        <section className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-red-500">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--text-main)]">
              ব্যক্তি, দোকান বা ডিলারের নাম ব্যবহারে কঠোর নিষেধাজ্ঞা
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            নাগরিকদের সুরক্ষা ও ব্যবসায়ীদের সুনাম সুরক্ষায় হালচালে কোনো ব্যক্তির নাম, দোকানদারের নাম,
            এলপিজি ডিলার বা নির্দিষ্ট ব্যবসা প্রতিষ্ঠানের পরিচয় প্রকাশ সম্পূর্ণভাবে নিষিদ্ধ।
          </p>
          <ul className="text-xs text-[var(--text-sub)] space-y-1.5 list-disc list-inside leading-relaxed">
            <li>এলপিজি সিলিন্ডারের দাম শুধুমাত্র এলাকাভিত্তিক গড় বা মধ্যমা (Median) আকারে প্রদর্শিত হয়।</li>
            <li>ন্যূনতম ৫টি স্বতন্ত্র রিপোর্ট ছাড়া কোনো এলাকার সিলিন্ডারের গড় মূল্যও প্রকাশ করা হয় না।</li>
            <li>যেকোনো ব্যক্তি বা বাণিজ্যিক প্রতিষ্ঠানের নাম উল্লেখকারী রিপোর্ট স্বয়ংক্রিয়ভাবে বাতিল করা হয়।</li>
          </ul>
        </section>

        {/* 3. Anti-Abuse and Fraud Prevention */}
        <section className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-blue-500">
            <FileText className="w-5 h-5" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--text-main)]">ভুয়া রিপোর্ট ও অপব্যবহার প্রতিরোধ</h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            প্ল্যাটফর্মের বিশ্বাসযোগ্যতা রক্ষায় যেকোনো ধরনের অপব্যবহার প্রতিহত করার ব্যবস্থা রয়েছে:
          </p>
          <ul className="text-xs text-[var(--text-sub)] space-y-1.5 list-disc list-inside leading-relaxed">
            <li>একই ডিভাইস থেকে একাধিক ভুয়া অ্যাকাউন্ট (Sybil Attack) তৈরি করে রিপোর্ট করা ব্লক করা হয়।</li>
            <li>আপনার নির্ধারিত এলাকা ছাড়া দূরবর্তী এলাকার বিষয়ে রিপোর্ট করার চেষ্টা স্বয়ংক্রিয়ভাবে প্রত্যাখ্যাত হয়।</li>
            <li>ভুয়া বা বিভ্রান্তিকর রিপোর্ট প্রদানকারী অ্যাকাউন্টের ট্রাস্ট স্কোর স্বয়ংক্রিয়ভাবে হ্রাস পায়।</li>
          </ul>
        </section>

        {/* Contact and Legal Review */}
        <section className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-2 text-xs text-[var(--text-sub)]">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Mail className="w-4 h-4" aria-hidden="true" />
            <span>আইনি যোগাযোগ ও নোটিশ</span>
          </div>
          <p className="leading-relaxed">
            ব্যবহারের শর্তাবলী বা পরিষেবা সংক্রান্ত কোনো আইনি নোটিশ প্রেরণের জন্য:
          </p>
          <p className="font-mono text-emerald-400">ইমেইল: takedown@halchal.bd</p>
          <div className="pt-2">
            <Link href="/contact" className="text-emerald-400 hover:underline">
              যোগাযোগ ও টেকডাউন নীতিমালার বিবরণ →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
