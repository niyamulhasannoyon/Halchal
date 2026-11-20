import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Users, Mail, Compass, CheckCircle2, HeartHandshake, Eye, Lock } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = buildMetadata({
  title: 'হালচাল সম্পর্কে ও আমাদের লক্ষ্য',
  description:
    'হালচাল কারা পরিচালনা করে, আমাদের নাগরিক সেবা মিশন, প্রযুক্তিগত স্বচ্ছতা এবং যোগাযোগ ব্যবস্থা। সাধারণ নাগরিকদের সরাসরি তথ্যে চালিত উন্মুক্ত প্ল্যাটফর্ম।',
  path: '/about',
});

export default function AboutPage() {
  const jsonLd = buildWebPageJsonLd({
    title: 'হালচাল সম্পর্কে ও আমাদের লক্ষ্য',
    description:
      'হালচাল কারা পরিচালনা করে, আমাদের নাগরিক সেবা মিশন, প্রযুক্তিগত স্বচ্ছতা এবং যোগাযোগ ব্যবস্থা।',
    path: '/about',
    type: 'AboutPage',
  });

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] font-bengali transition-colors flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader activePath="/about" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ name: 'আমাদের সম্পর্কে' }]} />

        {/* Page Title Header */}
        <header className="space-y-3 pb-6 border-b border-[var(--surface-border)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>নাগরিক প্রযুক্তি ও স্বচ্ছতা</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            হালচাল সম্পর্কে ও আমাদের লক্ষ্য
          </h1>
          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর সাধারণ নাগরিকদের কাছে উন্মুক্ত ও নিরপেক্ষভাবে পৌঁছে দেওয়ার একটি যৌথ উদ্যোগ।
          </p>
        </header>

        {/* 1. Who Runs Halchal (Owner Fields to Fill In) */}
        <section className="p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Users className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              হালচাল কারা পরিচালনা করে?
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            হালচাল একটি স্বাধীন নাগরিক প্রযুক্তি (Civic Tech) উদ্যোগ। এটি কোনো সরকারি সংস্থা, রাজনৈতিক দল কিংবা বিদ্যুৎ-গ্যাস-এলপিজি বাণিজ্যিক সিন্ডিকেটের অংশ নয়। প্রযুক্তিবিদ ও সচেতন নাগরিকদের একটি উন্মুক্ত কমিউনিটি এই প্ল্যাটফর্মটির স্থাপত্য ও কোডবেস পরিচালনা করেন।
          </p>

          {/* Owner Fill-in Notice Card */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
              <span>প্রকল্পের প্রতিষ্ঠাতা ও পরিচালনা দলের আনুষ্ঠানিক তথ্য:</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px] bg-[var(--surface-elevated)] p-3 rounded-xl border border-[var(--surface-border)]">
              <p>
                <span className="text-amber-400 font-bold">উদ্যোক্তা / দল:</span> [প্রতিষ্ঠাতা বা কোর ইঞ্জিনিয়ারিং দলের নাম — এখানে আপনার নাম বা প্রতিষ্ঠানের নাম লিখুন]
              </p>
              <p>
                <span className="text-amber-400 font-bold">প্রাতিষ্ঠানিক ইমেইল:</span> [টিমের ইমেইল — team@halchal.bd অথবা আপনার আনুষ্ঠানিক যোগাযোগ ইমেইল লিখুন]
              </p>
              <p>
                <span className="text-amber-400 font-bold">অবস্থান:</span> ঢাকা, বাংলাদেশ
              </p>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              * হালচালে কোনো কাল্পনিক বা মনগড়া ব্যক্তির পরিচয় তৈরি করা হয় না। মালিকানা পরিবর্তনের ক্ষেত্রে এই অংশটি সরাসরি হালনাগাদ করা হবে।
            </p>
          </div>
        </section>

        {/* 2. Our Mission */}
        <section className="p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <HeartHandshake className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              আমাদের মিশন ও নাগরিক উদ্দেশ্য
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            বাংলাদেশে বিদ্যুৎ বিভ্রাট (লোডশেডিং), লাইনে গ্যাসের চাপহীনতা কিংবা ওয়াসা সরবরাহকৃত পানির অভাব প্রতিদিনের বাস্তবতা। কিন্তু সাধারণ নাগরিক যখন বিপদে পড়েন, তখন আশপাশের কয়টি বাড়ি বা কোন ওয়ার্ডে একই সমস্যা চলছে তা জানার কোনো দ্রুত, স্বচ্ছ ও নির্ভরযোগ্য উপায় থাকে না।
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>হাইপারলোকাল নির্ভুলতা</span>
              </div>
              <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                উবার এইচ৩ (Uber H3 Res 8) গ্রিডের মাধ্যমে আনুমানিক ~০.৭৪ বর্গকিলোমিটার এলাকার মধ্যে তথ্য সীমাবদ্ধ রাখা হয়।
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>২জি ও ৩জি নেটওয়ার্ক সহনশীলতা</span>
              </div>
              <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                ব্ল্যাকআউট বা বিদ্যুৎহীন দুর্যোগের সময় ধীরগতির মোবাইল নেটওয়ার্কেও যেন ১ সেকেন্ডে পেজ লোড হয়।
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>জিরো ট্র্যাকিং ও বিজ্ঞাপনহীন</span>
              </div>
              <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                কোনো বাণিজ্যিক ব্যানার, বিজ্ঞাপনী কুকি বা নাগরিকের ব্যক্তিগত ডেটা বিক্রি হালচালে সম্পূর্ণ নিষিদ্ধ।
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>৩ নাগরিকের তথ্যে যাচাই</span>
              </div>
              <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                একজন ব্যক্তি একা কোনো এলাকার স্ট্যাটাস পাল্টাতে পারেন না; ন্যূনতম ৩টি স্বাধীন রিপোর্টের পরেই স্ট্যাটাস দৃশ্যমান হয়।
              </p>
            </div>
          </div>
        </section>

        {/* 3. Technology & Open Values */}
        <section className="p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Lock className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              উন্মুক্ত নীতি ও গোপনীয়তার প্রতিশ্রুতি
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            আমরা দৃঢ়ভাবে বিশ্বাস করি যে নাগরিকের গোপনীয়তা ক্ষুণ্ন না করেও একটি কার্যকর ও নির্ভরযোগ্য তথ্য ব্যবস্থা তৈরি করা সম্ভব:
          </p>
          <ul className="text-xs text-[var(--text-sub)] space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>জিরো র জিপিএস নীতি:</strong> হালচাল সার্ভারে কোনো ব্যবহারকারীর সুনির্দিষ্ট অক্ষাংশ/দ্রাঘিমাংশ বা বাড়ির নম্বর কখনোই জমা থাকে না।</li>
            <li><strong>৭২ ঘণ্টার অটো-ডিলিট:</strong> প্রতিটি কাঁচা রিপোর্ট ডাটাবেসে সর্বোচ্চ ৭২ ঘণ্টা থাকে। এরপরে স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।</li>
            <li><strong>দোকান বা বিক্রেতার নাম নিষিদ্ধ:</strong> কোনো ব্যক্তি বা ডিলারের সুনাম ক্ষুণ্ন বা অসম বাণিজ্যিক প্রতিযোগিতা ঠেকাতে কোনো বাণিজ্যিক নাম নেওয়া হয় না।</li>
          </ul>
        </section>

        {/* 4. Contact Route */}
        <section className="p-6 rounded-3xl bg-gradient-to-br from-[var(--surface-elevated)] to-[var(--surface-bg)] border border-[var(--surface-border)] space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <Mail className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 className="text-base font-bold text-[var(--text-main)]">
              আমাদের সাথে যোগাযোগের উপায়
            </h2>
          </div>
          <p className="text-xs text-[var(--text-sub)] leading-relaxed">
            আপনার কোনো মতামত, পরামর্শ, ভুল তথ্য সংশোধন বা কারিগরি সহায়তা প্রয়োজন হলে আমাদের সাথে যোগাযোগ করতে পারেন:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3.5 rounded-xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-1">
              <span className="font-bold text-[var(--text-main)]">সাধারণ যোগাযোগ:</span>
              <p className="font-mono text-emerald-400 text-[11px]">team@halchal.bd</p>
              <p className="text-[11px] text-[var(--text-sub)]">সাপ্তাহিক কর্মদিবসে ২৪ ঘণ্টার মধ্যে উত্তর প্রদান করা হয়।</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-1">
              <span className="font-bold text-[var(--text-main)]">টেকডাউন ও সংশোধন:</span>
              <p className="font-mono text-amber-400 text-[11px]">takedown@halchal.bd</p>
              <p className="text-[11px] text-[var(--text-sub)]">জরুরি আপত্তি বা উপাত্ত মুছে ফেলার অনুরোধ অগ্রাধিকার ভিত্তিতে যাচাই করা হয়।</p>
            </div>
          </div>
          <div className="pt-2 text-center sm:text-left">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:underline"
            >
              <span>বিস্তারিত টেকডাউন পলিসি ও অভিযোগ ফর্ম দেখুন →</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
