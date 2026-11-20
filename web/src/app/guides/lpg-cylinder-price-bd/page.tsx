import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Flame,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  PhoneCall,
  ExternalLink,
  Receipt,
  Scale,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CalloutBox } from '@/components/CalloutBox';
import { GuideCTA } from '@/components/GuideCTA';
import { RelevantZonesCard } from '@/components/RelevantZonesCard';
import { OfficialLpgPriceWidget } from '@/components/OfficialLpgPriceWidget';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageJsonLd, buildArticleJsonLd } from '@/lib/json-ld';
import { getLatestOfficialLpgPrice } from '@/lib/official-price';
import { getGuideBySlug } from '@/data/guides';
import { toBengaliDigits } from '@/lib/bengali-utils';

const guide = getGuideBySlug('lpg-cylinder-price-bd')!;

export const metadata: Metadata = buildMetadata({
  title: guide.metaTitle,
  description: guide.metaDescription,
  path: guide.path,
  type: 'article',
});

export const revalidate = 300; // 5 min ISR

export default async function LpgPriceGuidePage() {
  const priceData = await getLatestOfficialLpgPrice();
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
            { name: 'এলপিজি সরকারি দাম ও করণীয়' },
          ]}
        />

        {/* Article Header */}
        <header className="space-y-4 pb-6 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold flex items-center gap-1.5">
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
            বাংলাদেশে প্রতি মাসে বাংলাদেশ এনার্জি রেগুলেটরি কমিশন (বিইআরসি) তরলীকৃত পেট্রোলিয়াম গ্যাসের
            (এলপিজি) ভোক্তা পর্যায়ের সর্বোচ্চ খুচরা মূল্য নির্ধারণ করে। তবুও খুচরা বাজারে অনেক সময় অতিরিক্ত
            মূল্য দাবির অভিযোগ ওঠে। এই গাইডে জানুন সরকারি নির্ধারিত দর, ডিলার বেশি দাম চাইলে আইনি প্রতিকারের
            ধাপ এবং সিলিন্ডারের সঠিক ওজন ও নিরাপত্তা পরীক্ষার উপায়।
          </p>

          <div className="pt-2 flex items-center justify-between text-xs text-[var(--text-sub)] border-t border-[var(--surface-border)]/60">
            <div>লেখক: <strong>{guide.author.name}</strong> ({guide.author.role})</div>
            <div>পর্যালোচক: <strong>{guide.reviewer.name}</strong></div>
          </div>
        </header>

        {/* Dynamic Official Price Display Component (Never hard-coded in prose) */}
        <section aria-label="সরকারি নির্ধারিত মূল্য">
          <OfficialLpgPriceWidget priceData={priceData} />
        </section>

        {/* Article Body Content */}
        <article className="space-y-6 text-sm text-[var(--text-sub)] leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ১. সরকারি দাম কীভাবে নির্ধারিত হয়?
            </h2>
            <p>
              বাংলাদেশ এনার্জি রেগুলেটরি কমিশন আইন, ২০০৩-এর আওতায় আন্তর্জাতিক বাজারের সৌদি আরামকো চুক্তিমূল্য
              (Contract Price বা CP) এবং মার্কিন ডলারের বিনিময় হার বিবেচনা করে প্রতি মাসের শুরুতে বেসরকারি এলপিজির
              ভোক্তা মূল্য ঘোষণা করা হয়। এই ঘোষিত মূল্যের মধ্যে রয়েছে:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>আমদানি ও পরিশোধন ব্যয় (Saudi CP + ফ্রেট)।</li>
              <li>বটলিং চার্জ ও প্ল্যান্টের পরিচালন খরচ।</li>
              <li>বিতরণকারী ডিলারের নির্ধারিত কমিশন।</li>
              <li>খুচরা বিক্রেতার কমিশন ও প্রযোজ্য ভ্যাট/ট্যাক্স।</li>
            </ul>
            <p>
              অতএব, বিইআরসি যে দর নির্ধারণ করে তা চূড়ান্ত খুচরা মূল্য (Maximum Retail Price)। কোনো ডিলার বা
              দোকানদারের এর চেয়ে এক টাকাও বেশি নেওয়ার কোনো আইনগত অধিকার নেই।
            </p>
          </section>

          {/* Section 2: বেশি দাম চাইলে কী করবেন */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ২. বিক্রেতা অতিরিক্ত দাম দাবি করলে আপনার করণীয়
            </h2>
            <p>
              যদি আপনার এলাকার কোনো খুচরা বিক্রেতা বা সিলিন্ডার সাপ্লায়ার সরকারি মূল্যের চেয়ে বেশি টাকা দাবি করেন,
              তবে সচেতন নাগরিক হিসেবে নিচের ধাপগুলো যথাযথভাবে অনুসরণ করুন:
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[var(--text-main)] text-xs">
                  <Receipt className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ধাপ ১: পাকা রসিদ বা ক্যাশমেমো সংগ্রহ করুন</span>
                </div>
                <p className="text-xs">
                  সিলিন্ডার কেনার সময় বিক্রেতার কাছ থেকে সিলিন্ডারের ব্র্যান্ড, সিলিন্ডারের নম্বর এবং পরিশোধিত টাকার পরিমাণ উল্লেখসহ লিখিত ক্যাশমেমো চেয়ে নিন। বিক্রেতা ক্যাশমেমো দিতে অস্বীকৃতি জানালেও ভোক্তা অধিকার আইনে তা অপরাধ।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[var(--text-main)] text-xs">
                  <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ধাপ ২: জাতীয় ভোক্তা অধিকার সংরক্ষণ অধিদপ্তরে (DNCRP) কল করুন</span>
                </div>
                <p className="text-xs">
                  ভোক্তা অধিকারের সরকারি হটলাইন নম্বর <strong>১৬১২১</strong> (16121)-এ সরাসরি ফোন করে দোকান বা প্রতিষ্ঠানের ঠিকানা এবং অতিরিক্ত মূল্যের অভিযোগ রেকর্ড করান। এই কল সেন্টারে সার্বক্ষণিক অভিযোগ নেওয়া হয়।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[var(--text-main)] text-xs">
                  <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>ধাপ ৩: লিখিত অনলাইন অভিযোগ ও ২৫% পুরস্কার</span>
                </div>
                <p className="text-xs">
                  ভোক্তা অধিকার সংরক্ষণ আইন, ২০০৯ এর আওতায় আপনি লেনদেনের ৩০ দিনের মধ্যে ক্যাশমেমোর ছবি সংযুক্ত করে <strong>dncrp.portal.gov.bd</strong> পোর্টালে বা ইমেইলে লিখিত অভিযোগ দায়ের করতে পারেন। অভিযোগ প্রমাণিত হয়ে জরিমানার অর্থ আদায় হলে জরিমানাকৃত অর্থের <strong>২৫ শতাংশ</strong> আইনত অভিযোগকারী নাগরিককে তাৎক্ষণিকভাবে প্রদান করা হয়।
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: ওজন ও নিরাপত্তা পরীক্ষা */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ৩. ১২ কেজি সিলিন্ডার কেনার সময় ওজন ও নিরাপত্তা পরীক্ষা
            </h2>
            <p>
              অতিরিক্ত মূল্যের পাশাপাশি অনেক অসাধু চক্র সিলিন্ডার থেকে গ্যাস চুরি করে কম ওজনে সরবরাহ করে থাকে।
              সিলিন্ডার গ্রহণের সময় নিচের বিষয়গুলো নিশ্চিত হোন:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <Scale className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                  <span>খালি সিলিন্ডারের ওজন (Tare Weight)</span>
                </div>
                <p className="text-xs">
                  সিলিন্ডারের কলার বা হাতলে খোদাই করা তার ওজন দেখুন (সাধারণত ১২.৫ কেজি থেকে ১৫.৫ কেজি)। এতে ১২ কেজি গ্যাস যোগ করলে মোট ওজন হবে ২৪.৫ থেকে ২৭.৫ কেজি। বিক্রেতার ওজনের পাল্লায় মেপে নিশ্চিত হোন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-main)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>অক্ষত সিকিউরিটি সিল ও মেয়াদের তারিখ</span>
                </div>
                <p className="text-xs">
                  সিলিন্ডারের মুখে কোম্পানির প্লাস্টিক সিল ও ক্যাপ সম্পূর্ণ অক্ষত আছে কিনা যাচাই করুন। সিলিন্ডারের পেছনের রিংয়ে খোদাই করা টেস্টের তারিখ (যেমন A-26 বা B-27) দেখে মেয়াদোত্তীর্ণ সিলিন্ডার নেওয়া পরিহার করুন।
                </p>
              </div>
            </div>
          </section>

          {/* Safety Callout */}
          <CalloutBox title="সতর্কতা: দোকানে দামাদামির সময় অপ্রীতিকর পরিস্থিতি এড়ান" variant="warning">
            ব্যক্তিগতভাবে বিক্রেতার সাথে উত্তপ্ত বাক্যবিনিময় না করে আইনানুগভাবে ক্যাশমেমো বা রসিদ সংগ্রহ করুন।
            আইন নিজের হাতে তুলে না নিয়ে ভোক্তা অধিদপ্তরের ১৬১২১ হটলাইনে তথ্য দিন।
          </CalloutBox>

          {/* Section 4: Halchal's Median Price Tracking */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              ৪. হালচালে কীভাবে এলাকার এলপিজি বাজারদর দেখবেন?
            </h2>
            <p>
              হালচাল সাধারণ নাগরিকদের রিপোর্টের ভিত্তিতে প্রতিটি এলাকায় ১২ কেজি এলপিজি কত টাকায় বিক্রি হচ্ছে
              তার মধ্যমা বা গড় (Median) মূল্য প্রদর্শন করে। আমাদের কঠোর নিয়মাবলী:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>কোনো নির্দিষ্ট দোকান বা ব্যবসায়ীর নাম কোথাও দেখানো বা সংরক্ষণ করা হয় না।</li>
              <li>একটি নির্দিষ্ট এলাকায় ন্যূনতম <strong>৫টি স্বতন্ত্র নাগরিক রিপোর্ট</strong> জমা না হওয়া পর্যন্ত কোনো বাজারদর প্রকাশ করা হয় না।</li>
              <li>এর মাধ্যমে নাগরিকরা বুঝতে পারেন তাদের এলাকায় সরকারি দামের সাথে বাজারদরের ব্যবধান কতখানি।</li>
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
          title="আপনার এলাকায় এলপিজির লাইভ দর ও গ্যাসের অবস্থা দেখুন"
        />

        {/* Report CTA */}
        <GuideCTA
          categoryLabel="আপনার এলাকায় ১২ কেজি এলপিজি কত টাকায় কিনলেন?"
          categoryAction="এলাকার সিলিন্ডারের দর জানান"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
