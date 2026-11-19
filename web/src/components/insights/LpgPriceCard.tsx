'use client';

import React from 'react';
import { Flame, ShieldCheck, Tag, Info } from 'lucide-react';
import { formatBengaliCurrency, toBengaliDigits } from '@/lib/bengali-utils';
import { LpgPriceInsight } from '@/lib/insights';

interface LpgPriceCardProps {
  lpgPrice: LpgPriceInsight | null;
  areaNameBn: string;
}

export function LpgPriceCard({ lpgPrice, areaNameBn }: LpgPriceCardProps) {
  // Format official effective date into Bengali date
  const formatEffectiveDateBn = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return '১ নভেম্বর ২০২৬';
      const monthsBn = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      return `${toBengaliDigits(d.getDate())} ${monthsBn[d.getMonth()]} ${toBengaliDigits(d.getFullYear())}`;
    } catch {
      return '১ নভেম্বর ২০২৬';
    }
  };

  const hasReports = lpgPrice !== null && lpgPrice.report_count >= 5;
  const officialPrice = lpgPrice?.official_price ?? 1455.00;
  const officialDate = lpgPrice?.official_effective_from ? formatEffectiveDateBn(lpgPrice.official_effective_from) : '১ নভেম্বর ২০২৬';

  const diff = hasReports ? (lpgPrice.area_median - officialPrice) : 0;
  const isHigher = diff > 0;
  const isLower = diff < 0;

  return (
    <article
      aria-label={`${areaNameBn} এলাকার ১২ কেজি এলপিজি সিলিন্ডারের বাজারদর`}
      className="p-5 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] shadow-sm space-y-4"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-orange-500/15 text-orange-500">
            <Flame className="w-5 h-5 fill-orange-500" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bengali font-bold text-base text-[var(--text-main)]">
              ১২ কেজি এলপিজি সিলিন্ডার দর
            </h2>
            <p className="font-bengali text-xs text-[var(--text-sub)]">
              এলাকার বাজারদর বনাম সরকারি নির্ধারিত মূল্য
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bengali bg-slate-500/15 text-[var(--text-sub)] border border-[var(--surface-border)]">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>দোকানের নাম গোপন</span>
        </span>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Area Median Price */}
        <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--text-sub)] text-xs font-bengali">
            <Tag className="w-3.5 h-3.5" aria-hidden="true" />
            <span>এলাকার গড় বাজারদর</span>
          </div>
          {hasReports ? (
            <div>
              <span className="font-bengali font-extrabold text-2xl text-[var(--text-main)] block">
                ৳ {formatBengaliCurrency(Math.round(lpgPrice.area_median))}
              </span>
              <span className="font-bengali text-xs text-[var(--text-sub)]">
                {toBengaliDigits(lpgPrice.report_count)} টি রিপোর্টের ভিত্তিতে
              </span>
            </div>
          ) : (
            <div className="pt-1">
              <span className="font-bengali font-bold text-base text-[var(--text-sub)] block">
                গোপন রাখা হয়েছে
              </span>
              <span className="font-bengali text-xs text-[var(--text-sub)] leading-tight block">
                (কমপক্ষে ৫টি রিপোর্ট প্রয়োজন)
              </span>
            </div>
          )}
        </div>

        {/* Official BERC Benchmark Price */}
        <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bengali font-bold">
            <span>🏛️ বিইআরসি সরকারি দর</span>
          </div>
          <div>
            <span className="font-bengali font-extrabold text-2xl text-emerald-600 dark:text-emerald-400 block">
              ৳ {formatBengaliCurrency(Math.round(officialPrice))}
            </span>
            <span className="font-bengali text-[11px] text-[var(--text-sub)] block leading-tight">
              {officialDate} থেকে কার্যকর
            </span>
          </div>
        </div>
      </div>

      {/* Comparison Badge / Explanatory Note */}
      {hasReports ? (
        <div className="p-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-between">
          <span className="font-bengali text-xs text-[var(--text-sub)]">
            সরকারি দরের তুলনায় পার্থক্য:
          </span>
          <span
            className={`font-bengali font-bold text-xs px-2.5 py-1 rounded-full ${
              isHigher
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                : isLower
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-500/15 text-[var(--text-sub)] border border-[var(--surface-border)]'
            }`}
          >
            {isHigher && `+৳ ${formatBengaliCurrency(Math.round(Math.abs(diff)))} বেশি`}
            {isLower && `-৳ ${formatBengaliCurrency(Math.round(Math.abs(diff)))} কম`}
            {!isHigher && !isLower && 'সরকারি দরের সমান'}
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-slate-500/10 border border-[var(--surface-border)] flex items-start gap-2 text-xs font-bengali text-[var(--text-sub)]">
          <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" aria-hidden="true" />
          <span>
            ব্যবসায়ী বা নির্দিষ্ট দোকানের পরিচয় গোপন রাখতে এলাকায় কমপক্ষে ৫টি যাচাইকৃত নাগরিক রিপোর্ট জমা না হলে গড় দর প্রকাশ করা হয় না।
          </span>
        </div>
      )}
    </article>
  );
}
