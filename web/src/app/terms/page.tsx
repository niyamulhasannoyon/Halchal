'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, AlertTriangle, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BottomNav } from '@/components/BottomNav';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] pb-28 font-bengali transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--surface-bg)]/90 backdrop-blur-md border-b border-[var(--surface-border)] px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="p-2 -ml-2 text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-elevated)] rounded-xl transition-colors"
              aria-label="সেটিংসে ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-[var(--text-main)]">ব্যবহারের শর্তাবলী (Terms of Service)</h1>
          </div>
          <ThemeToggle variant="compact" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Lawyer Review Mandatory Notice */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>আইনি পর্যালোচনা নোটিশ</span>
          </div>
          <p className="leading-relaxed">
            <strong>বিজ্ঞপ্তি:</strong> বাংলাদেশের প্রচলিত সাইবার সুরক্ষা আইন ও নাগরিক প্ল্যাটফর্ম বিধিমালা
            অনুযায়ী এই শর্তাবলী প্রণীত। আনুষ্ঠানিকভাবে উন্মুক্ত করার পূর্বে একজন নিবন্ধিত বাংলাদেশী
            আইনজীবীর মাধ্যমে এই শর্তাবলী বৈধতা যাচাই এবং হালনাগাদ করা আবশ্যক।
          </p>
        </div>

        {/* 1. Community Disclaimer */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-base font-bold text-text-primary">
              কমিউনিটি পরিমাপের নীতি ও দায়মুক্তি
            </h2>
          </div>
          <div className="p-3.5 rounded-xl bg-canvas border border-surface-border text-xs text-emerald-400 font-medium">
            &ldquo;নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়।&rdquo;
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            হালচালে প্রদর্শিত বিদ্যুৎ, গ্যাস বা পানির সংযোগের অবস্থা সম্পূর্ণভাবে আপনার আশেপাশের
            সাধারণ নাগরিকদের দেওয়া তাৎক্ষণিক রিপোর্টের ভিত্তিতে সমন্বিত হয়। এটি ডিপিডিসি, ডেসকো, তিতাস
            গ্যাস, ওয়াসা বা কোনো সরকারি কর্তৃপক্ষের প্রাতিষ্ঠানিক ডিজিটাল মিটারিং নয়। জরুরি প্রয়োজনে
            সংশ্লিষ্ট সেবা প্রদানকারী প্রতিষ্ঠানের নিয়ন্ত্রণ কক্ষে যোগাযোগ করার অনুরোধ করা যাচ্ছে।
          </p>
        </section>

        {/* 2. Absolute Ban on Person / Shop / Dealer Names */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-red-500">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-base font-bold text-text-primary">
              ব্যক্তি, দোকান বা ডিলারের নাম ব্যবহারে কঠোর নিষেধাজ্ঞা
            </h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            নাগরিকদের সুরক্ষা ও ব্যবসায়ীদের সুনাম সুরক্ষায় হালচালে কোনো ব্যক্তির নাম, দোকানদারের নাম,
            এলপিজি ডিলার বা নির্দিষ্ট ব্যবসা প্রতিষ্ঠানের পরিচয় প্রকাশ সম্পূর্ণভাবে নিষিদ্ধ।
          </p>
          <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside leading-relaxed">
            <li>এলপিজি সিলিন্ডারের দাম শুধুমাত্র এলাকাভিত্তিক গড় বা মধ্যমা (Median) আকারে প্রদর্শিত হয়।</li>
            <li>ন্যূনতম ৫টি স্বতন্ত্র রিপোর্ট ছাড়া কোনো এলাকার সিলিন্ডারের গড় মূল্যও প্রকাশ করা হয় না।</li>
            <li>যেকোনো ব্যক্তি বা বাণিজ্যিক প্রতিষ্ঠানের নাম উল্লেখকারী রিপোর্ট স্বয়ংক্রিয়ভাবে বাতিল করা হয়।</li>
          </ul>
        </section>

        {/* 3. Anti-Abuse and Fraud Prevention */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-blue-500">
            <FileText className="w-5 h-5" />
            <h2 className="text-base font-bold text-text-primary">ভুয়া রিপোর্ট ও অপব্যবহার প্রতিরোধ</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            প্ল্যাটফর্মের বিশ্বাসযোগ্যতা রক্ষায় যেকোনো ধরনের অপব্যবহার প্রতিহত করার ব্যবস্থা রয়েছে:
          </p>
          <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside leading-relaxed">
            <li>একই ডিভাইস থেকে একাধিক ভুয়া অ্যাকাউন্ট (Sybil Attack) তৈরি করে রিপোর্ট করা ব্লক করা হয়।</li>
            <li>আপনার নির্ধারিত এলাকা ছাড়া দূরবর্তী এলাকার বিষয়ে রিপোর্ট করার চেষ্টা স্বয়ংক্রিয়ভাবে প্রত্যাখ্যাত হয়।</li>
            <li>ভুয়া বা বিভ্রান্তিকর রিপোর্ট প্রদানকারী অ্যাকাউন্টের ট্রাস্ট স্কোর স্বয়ংক্রিয়ভাবে হ্রাস পায়।</li>
          </ul>
        </section>

        {/* 4. Reporting Abuse / Content Complaints */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-500">
            <Mail className="w-5 h-5" />
            <h2 className="text-base font-bold text-text-primary">রিপোর্ট করুন / সমস্যা জানান</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            যদি কোনো এলাকার ভুল বা উদ্দেশ্যপ্রণোদিত রিপোর্ট লক্ষ্য করেন, অথবা প্ল্যাটফর্মের কোনো তথ্য
            সম্পর্কে অভিযোগ থাকে, তবে অবিলম্বে আমাদের অপব্যবহার নিরসন (Takedown) টিমে যোগাযোগ করুন:
          </p>
          <div className="p-3 rounded-xl bg-canvas border border-surface-border text-xs font-mono text-emerald-400 space-y-1">
            <p>অপব্যবহার রিপোর্ট ও টেকডাউন: takedown@halchal.bd</p>
            <p>সাধারণ অনুসন্ধান ও অভিযোগ: contact@halchal.bd</p>
          </div>
          <p className="text-xs text-text-muted">
            অভিযোগ পাওয়ার ২৪ থেকে ৪৮ ঘণ্টার মধ্যে আমাদের ট্রাস্ট অ্যান্ড সেফটি টিম তা তদন্ত করে
            প্রয়োজনীয় ব্যবস্থা গ্রহণ করে।
          </p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
