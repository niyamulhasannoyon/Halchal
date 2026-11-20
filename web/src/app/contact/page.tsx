import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, ShieldAlert, Clock, AlertTriangle, FileText, CheckCircle2, PhoneCall } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = buildMetadata({
  title: 'যোগাযোগ ও তথ্য সংশোধন নীতি',
  description:
    'হালচালের সাথে যোগাযোগের মাধ্যম, ভুল তথ্য সংশোধন ও টেকডাউন অনুরোধের নিয়মাবলী। দ্রুত ও স্বচ্ছ নাগরিক সাপোর্ট সেবা।',
  path: '/contact',
});

export default function ContactPage() {
  const jsonLd = buildWebPageJsonLd({
    title: 'যোগাযোগ ও তথ্য সংশোধন নীতি',
    description:
      'হালচালের সাথে যোগাযোগের মাধ্যম, ভুল তথ্য সংশোধন ও টেকডাউন অনুরোধের নিয়মাবলী।',
    path: '/contact',
    type: 'ContactPage',
  });

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] font-bengali transition-colors flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader activePath="/contact" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ name: 'যোগাযোগ ও টেকডাউন' }]} />

        {/* Header Banner */}
        <header className="space-y-3 pb-6 border-b border-[var(--surface-border)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <Mail className="w-3.5 h-3.5" aria-hidden="true" />
            <span>নাগরিক সহায়তা ও সংশোধন নীতি</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            যোগাযোগ ও তথ্য সংশোধন নীতি
          </h1>
          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            কোনো ভুল তথ্য, অপব্যবহার বা গোপনীয়তা সংক্রান্ত বিষয়ে আমাদের দ্রুততম সময়ে জানান।
            আমরা প্রতিটি নাগরিকের বক্তব্যকে গুরুত্বের সাথে বিবেচনা করি।
          </p>
        </header>

        {/* Dedicated Takedown & Correction Route */}
        <section className="p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400">
            <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              টেকডাউন ও ভুল তথ্য সংশোধনের সুনির্দিষ্ট নিয়ম
            </h2>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            হালচালে প্রদর্শিত কোনো তথ্য যদি আপনার এলাকার বাস্তব পরিস্থিতির বিপরীত হয় বা কোনো কারণে
            ভুল বোঝাবুঝি সৃষ্টি করে, তবে আমাদের ডেটা অডিট ডেস্ক অবিলম্বে তা পরীক্ষা করে সংশোধন করবে।
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-2">
              <span className="font-bold text-xs text-[var(--text-main)] flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>টেকডাউন ইমেইল:</span>
              </span>
              <p className="font-mono text-amber-400 text-xs font-bold select-all">
                takedown@halchal.bd
              </p>
              <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
                ভুল তথ্য মুছে ফেলা, অপব্যবহার রোধ কিংবা নিরাপত্তা রিপোর্টের জন্য।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-2">
              <span className="font-bold text-xs text-[var(--text-main)] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>নিষ্পত্তির সর্বোচ্চ সময়সীমা:</span>
              </span>
              <p className="text-xs font-bold text-emerald-400">
                ২৪ থেকে ৪৮ ঘণ্টা
              </p>
              <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
                কর্মদিবসে প্রতিটি লিখিত আবেদন পুঙ্খানুপুঙ্খভাবে যাচাই করে উত্তর দেওয়া হয়।
              </p>
            </div>
          </div>
        </section>

        {/* Steps to Submit a Takedown / Correction */}
        <section className="p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              আবেদন করার নিয়মাবলী
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            দ্রুত ব্যবস্থা গ্রহণের সুবিধার্থে আপনার ইমেইলে নিচের তথ্যগুলো উল্লেখ করার অনুরোধ করা যাচ্ছে:
          </p>

          <ol className="text-xs text-[var(--text-sub)] space-y-2.5 list-decimal list-inside leading-relaxed">
            <li>
              <strong>সুনির্দিষ্ট পাতার লিংক বা এলাকা:</strong> কোন এলাকার স্ট্যাটাস বা কোন গাইডের তথ্য সংশোধন করতে হবে (যেমন: <code>halchal.bd/z/883cf...</code>)।
            </li>
            <li>
              <strong>অসঙ্গতির বিবরণ:</strong> কী তথ্য ভুল হিসেবে পরিলক্ষিত হয়েছে এবং আপনার মতে সঠিক তথ্য কোনটি।
            </li>
            <li>
              <strong>তথ্যপ্রমাণ (প্রযোজ্য ক্ষেত্রে):</strong> কোনো প্রাতিষ্ঠানিক প্রজ্ঞাপন, সরকারি নোটিশ বা নিয়ন্ত্রণ কক্ষের বার্তা থাকলে তার স্ক্রিনশট বা রেফারেন্স।
            </li>
          </ol>

          {/* Ban on merchant names clarification */}
          <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-xs text-[var(--text-sub)] space-y-1.5 leading-relaxed">
            <h3 className="font-bold text-[var(--text-main)] text-xs text-emerald-400">
              ব্যক্তি বা দোকান সংক্রান্ত অভিযোগের দরকার নেই
            </h3>
            <p>
              হালচাল কখনোই কোনো দোকানদার, এলপিজি ডিলার বা গ্যাস সরবরাহকারী ব্যক্তির নাম প্রদর্শন বা সংরক্ষণ করে না। তাই নির্দিষ্ট কোনো দোকানের বিরুদ্ধে অভিযোগ হালচালের এখতিয়ারভুক্ত নয়; সেক্ষেত্রে সরাসরি জাতীয় ভোক্তা অধিকার সংরক্ষণ অধিদপ্তরে (<strong>১৬১২১</strong>) অভিযোগ করুন।
            </p>
          </div>
        </section>

        {/* General Contacts */}
        <section className="p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <PhoneCall className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              অন্যান্য প্রাতিষ্ঠানিক যোগাযোগ
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
              <h3 className="font-bold text-[var(--text-main)]">সাধারণ অনুসন্ধান ও ফিডব্যাক:</h3>
              <p className="font-mono text-emerald-400 text-xs select-all">team@halchal.bd</p>
              <p className="text-[11px] text-[var(--text-sub)]">প্ল্যাটফর্ম উন্নয়ন ও সাধারণ যেকোনো পরামর্শের জন্য।</p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
              <h3 className="font-bold text-[var(--text-main)]">গোপনীয়তা ও ডেটা সুরক্ষা:</h3>
              <p className="font-mono text-emerald-400 text-xs select-all">privacy@halchal.bd</p>
              <p className="text-[11px] text-[var(--text-sub)]">ব্যক্তিগত তথ্য মোছার আবেদন বা ডেটা প্রটেকশন কর্মকর্তার সাথে যোগাযোগ।</p>
            </div>
          </div>
        </section>

        {/* Self-Service Deletion CTA */}
        <section className="p-5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-xs text-[var(--text-main)]">
              এক ক্লিকে সকল তথ্য মুছে ফেলতে চান?
            </h3>
            <p className="text-xs text-[var(--text-sub)]">
              ইমেইল ছাড়াই আপনি যেকোনো সময় সেটিংস পেজ থেকে আপনার অ্যাকাউন্ট ও অতীত রিপোর্ট ডিলিট করতে পারেন।
            </p>
          </div>
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors shrink-0"
          >
            <span>সেটিংস থেকে ডেটা মুছুন →</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
