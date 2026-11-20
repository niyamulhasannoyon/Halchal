'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Trash2, EyeOff, Clock, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BottomNav } from '@/components/BottomNav';

export default function PrivacyPolicyPage() {
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
            <h1 className="text-lg font-bold text-[var(--text-main)]">গোপনীয়তা নীতি (Privacy Policy)</h1>
          </div>
          <ThemeToggle variant="compact" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Lawyer Review Mandatory Notice */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
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

        {/* Introduction */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3 text-emerald-500">
            <Shield className="w-6 h-6" />
            <h2 className="text-lg font-bold text-text-primary">আমাদের মূল দর্শন: গোপনীয়তাই প্রথম</h2>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            হালচাল (Halchal) তৈরি হয়েছে সাধারণ নাগরিকদের বিদ্যুৎ, গ্যাস, পানি ও এলপিজির সঠিক খবর
            জানানোর উদ্দেশ্যে। আমরা বিশ্বাস করি আপনার ব্যক্তিগত তথ্য কোনো সার্ভারে জমিয়ে না রেখেই একটি
            নির্ভরযোগ্য কমিউনিটি সেবা পরিচালনা করা সম্ভব।
          </p>
        </section>

        {/* What We Collect vs What We NEVER Collect */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Collected */}
          <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3>আমরা যা সংগ্রহ করি</h3>
            </div>
            <ul className="text-xs text-text-secondary space-y-2.5 leading-relaxed list-disc list-inside">
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
          <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-bold text-base">
              <EyeOff className="w-4 h-4 text-red-500" />
              <h3>আমরা যা কখনোই সংরক্ষণ করি না</h3>
            </div>
            <ul className="text-xs text-text-secondary space-y-2.5 leading-relaxed list-disc list-inside">
              <li>
                <strong>সুনির্দিষ্ট জিপিএস কোঅর্ডিনেট:</strong> আপনার অক্ষাংশ/দ্রাঘিমাংশ (Latitude/Longitude)
                কিংবা বাসার নির্ভুল অবস্থান আমাদের কোনো ডাটাবেস বা লগে সংরক্ষণ করা হয় না।
              </li>
              <li>
                <strong>ব্যক্তিগত পরিচয়:</strong> আপনার নাম, জাতীয় পরিচয়পত্র, বাসার ঠিকানা কিংবা ফেসবুক
                আইডি প্রয়োজন নেই।
              </li>
              <li>
                <strong>দোকান বা ডিলারের নাম:</strong> এলপিজি বা সেবাদাতাদের কোনো ব্যক্তি বা প্রতিষ্ঠানের
                নাম Halchal-এ নেওয়া হয় না।
              </li>
            </ul>
          </div>
        </section>

        {/* 72-Hour Ephemeral Retention */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-500">
            <Clock className="w-5 h-5" />
            <h2 className="text-base font-bold text-text-primary">৭২ ঘণ্টার কাঁচা ডেটা মুছে ফেলার নিয়ম</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            একটি এলাকা নিয়ে আপনার দেওয়া কাঁচা রিপোর্টটি আমাদের ডাটাবেসে <strong>সর্বোচ্চ ৭২ ঘণ্টা</strong>
            থাকে। স্বয়ংক্রিয় ব্যাকগ্রাউন্ড ক্লিনআপ সিস্টেমের মাধ্যমে ৭২ ঘণ্টা পর তা সম্পূর্ণ চিরতরে
            ডিলিট হয়ে যায়। কেবল এলাকার সামগ্রিক ঐতিহাসিক পরিসংখ্যান (যেমন: সপ্তাহে কত ঘণ্টা বিদ্যুৎ ছিল
            না) অজ্ঞাত ও সমষ্টিগত আকারে সংরক্ষিত থাকে।
          </p>
        </section>

        {/* Right to Erasure / Delete Account & Data */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-red-500">
            <Trash2 className="w-5 h-5" />
            <h2 className="text-base font-bold text-text-primary">অ্যাকাউন্ট ও সকল তথ্য মুছে ফেলার অধিকার</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            আপনার তথ্যের ওপর পূর্ণ নিয়ন্ত্রণ আপনার নিজের। যেকোনো সময় এক ক্লিকে হালচাল থেকে আপনার
            অ্যাকাউন্ট, প্রোফাইল, পুশ সাবস্ক্রিপশন এবং পূর্বে করা সব রিপোর্ট স্থায়ীভাবে মুছে ফেলতে
            পারেন।
          </p>
          <div className="pt-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>সেটিংস থেকে তথ্য মুছে ফেলুন</span>
            </Link>
          </div>
        </section>

        {/* Contact and Takedown */}
        <section className="p-4 rounded-2xl bg-surface border border-surface-border space-y-2 text-xs text-text-muted">
          <h3 className="font-bold text-text-primary text-sm">যোগাযোগ ও টেকডাউন অনুরোধ</h3>
          <p className="leading-relaxed">
            কোনো তথ্যের অপব্যবহার, অবমাননাকর মন্তব্য বা ভুল তথ্যের প্রতিকারের জন্য অবিলম্বে আমাদের
            ডেটা প্রটেকশন অফিসার ও সাপোর্ট টিমের সাথে যোগাযোগ করুন:
          </p>
          <div className="font-mono text-emerald-400 space-y-1">
            <p>ইমেইল: privacy@halchal.bd</p>
            <p>টেকডাউন ও অপব্যবহার: takedown@halchal.bd</p>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
