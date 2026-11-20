import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DHAKA_PILOT_AREAS } from '@/lib/areas';
import { toBengaliDigits } from '@/lib/bengali-utils';

export const revalidate = 60; // 60s ISR revalidation

export const metadata: Metadata = buildMetadata({
  title: 'এলপিজি সিলিন্ডারের আজকের দাম ও বিইআরসি রেট',
  description:
    'আজকের ১২ কেজি এলপিজি সিলিন্ডারের বিইআরসি নির্ধারিত সরকারি দর এবং ঢাকার বিভিন্ন এলাকার বাজারদরের লাইভ তুলনামূলক চিত্র ও সতর্কতা।',
  path: '/lpg-price',
});

export default function LpgPricePage() {
  const bercOfficialPrice = 1455; // BERC 12kg regulated price
  const bercPriceBn = toBengaliDigits(bercOfficialPrice);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-6 md:py-10 max-w-4xl mx-auto pb-28">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: 'হোম', href: '/' },
          { name: 'এলপিজি সিলিন্ডারের দাম', href: '/lpg-price' },
        ]}
        className="mb-4"
      />

      <header className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-medium mb-3">
          <span>জাতীয় ইউটিলিটি গাইড</span>
          <span>&bull;</span>
          <span>বিইআরসি রেফারেন্স</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          এলপিজি সিলিন্ডারের আজকের দাম ও বিইআরসি রেট
        </h1>
        <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
          বাংলাদেশ এনার্জি রেগুলেটরি কমিশন (বিইআরসি) কর্তৃক নির্ধারিত ১২ কেজি বেসরকারি এলপিজি
          সিলিন্ডারের অফিশিয়াল রেট, স্থানীয় খুচরা বাজারের পরিস্থিতি এবং ক্রেতা সুরক্ষা নির্দেশিকা।
        </p>
      </header>

      {/* Official Benchmark Price Card */}
      <section className="mb-8 p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-neutral-400">বিইআরসি নির্ধারিত ভোক্তা মূল্য (১২ কেজি)</span>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-1">
              ৳ {bercPriceBn} <span className="text-sm text-neutral-400 font-normal">/ সিলিন্ডার</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              সূত্র: বাংলাদেশ এনার্জি রেগুলেটরি কমিশন (বিইআরসি) আদেশ
            </p>
          </div>
          <Link
            href="/"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors text-center"
          >
            আপনার এলাকার দাম জানান
          </Link>
        </div>
      </section>

      {/* Consumer Rights & Safety Guidelines */}
      <section aria-labelledby="consumer-rights-heading" className="mb-10 space-y-4">
        <h2 id="consumer-rights-heading" className="text-xl font-bold text-white">
          এলপিজি সিলিন্ডার ক্রয়ের সময় ক্রেতাদের করণীয়
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-300 text-xs sm:text-sm space-y-2">
            <h3 className="font-semibold text-white text-sm">১. সিলিন্ডারের ওজন যাচাই করুন</h3>
            <p className="text-neutral-400 leading-relaxed">
              সিলিন্ডারের গায়ে খালি সিলিন্ডারের ওজন (Tare Weight) লেখা থাকে। ১২ কেজি গ্যাসের সাথে ওই ওজন যোগ করে দাঁড়িপাল্লায় মেপে নিশ্চিত হন।
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-300 text-xs sm:text-sm space-y-2">
            <h3 className="font-semibold text-white text-sm">২. প্লাস্টিক সিল ও ক্যাপ অক্ষত আছে কি?</h3>
            <p className="text-neutral-400 leading-relaxed">
              সিলিন্ডারের ভালভে কোম্পানির হলোগ্রামযুক্ত সিল অক্ষত থাকা বাধ্যতামূলক। ছেঁড়া বা আলগা সিল থাকলে গ্রহণ করবেন না।
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-300 text-xs sm:text-sm space-y-2">
            <h3 className="font-semibold text-white text-sm">৩. অতিরিক্ত দাম চাইলে করণীয়</h3>
            <p className="text-neutral-400 leading-relaxed">
              খুচরা বিক্রেতারা নির্ধারিত দরের চেয়ে বেশি চাইলে ক্যাশ মেমো সংগ্রহ করুন এবং জাতীয় ভোক্তা অধিকার সংরক্ষণ অধিদপ্তরে (১৬১২১) অভিযোগ জানাতে পারেন।
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-300 text-xs sm:text-sm space-y-2">
            <h3 className="font-semibold text-white text-sm">৪. সাবান-পানির নিরাপদ লিক টেস্ট</h3>
            <p className="text-neutral-400 leading-relaxed">
              সিলিন্ডার সংযোগের পর রেগুলেটর ও পাইপের মাথায় সাবান পানির ফেনা লাগিয়ে বুদবুদ ওঠে কিনা দেখুন। আগুন দিয়ে পরীক্ষা করা দণ্ডনীয় ও বিপজ্জনক।
            </p>
          </div>
        </div>
      </section>

      {/* Area Directory for LPG Check */}
      <section aria-labelledby="area-lpg-heading" className="mb-10">
        <h2 id="area-lpg-heading" className="text-lg font-bold text-white mb-3">
          ঢাকার এলাকাভিত্তিক এলপিজি ও গ্যাস পরিস্থিতি
        </h2>
        <p className="text-xs text-neutral-400 mb-4">
          আপনার এলাকার বর্তমান গ্যাস প্রেসার এবং এলপিজি সরবরাহ দেখতে সংশ্লিষ্ট এলাকায় ক্লিক করুন:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DHAKA_PILOT_AREAS.map((a) => (
            <Link
              key={a.slug}
              href={`/dhaka/${a.slug}/lpg`}
              className="p-3 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 hover:text-emerald-400 transition-colors flex items-center justify-between"
            >
              <span>{a.nameBn}</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/70 text-xs text-neutral-400 space-y-1">
        <p className="font-medium text-neutral-300">কমিউনিটি-রিপোর্টেড তথ্য ও গোপনীয়তা সুরক্ষা</p>
        <p>
          হালচালে কোনো নির্দিষ্ট দোকান বা ডিলারের নাম প্রকাশ করা হয় না। শুধুমাত্র এলাকাভিত্তিক নাগরিক মূল্যের গড় তথ্য ও সচেতনতামূলক নির্দেশিকা পরিবেশন করা হয়।
        </p>
      </section>
    </main>
  );
}
