'use client';

import React from 'react';
import { Zap, Clock, AlertCircle } from 'lucide-react';
import { toBengaliDigits } from '@/lib/bengali-utils';
import { CategoryInsight } from '@/lib/insights';

interface OutageSummaryCardProps {
  electricityInsight: CategoryInsight | undefined;
  dataConfidence: 'ok' | 'insufficient';
  areaNameBn: string;
}

export function OutageSummaryCard({
  electricityInsight,
  dataConfidence,
  areaNameBn,
}: OutageSummaryCardProps) {
  const eventCount = electricityInsight?.outage_event_count ?? 0;
  const totalMinutes = electricityInsight?.total_outage_minutes ?? 0;
  const totalHours = Math.max(1, Math.round(totalMinutes / 60));

  const hasOutages = eventCount > 0;

  return (
    <article
      aria-label={`${areaNameBn} এলাকার বিদ্যুৎ সরবরাহ সারাংশ`}
      className="p-5 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] shadow-sm space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
            <Zap className="w-5 h-5 fill-amber-500" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bengali font-bold text-base text-[var(--text-main)]">
              বিদ্যুৎ বিভ্রাট সারাংশ
            </h2>
            <p className="font-bengali text-xs text-[var(--text-sub)]">
              গত ৭ দিনের নিশ্চিত রিপোর্ট অনুযায়ী
            </p>
          </div>
        </div>

        {dataConfidence === 'insufficient' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bengali bg-slate-500/15 text-[var(--text-sub)] border border-[var(--surface-border)]">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>সীমিত তথ্য</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bengali bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span>✓ তথ্য যাচাইকৃত</span>
          </span>
        )}
      </div>

      {/* Hero Sentence (Direct User Requirement) */}
      <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)]">
        {dataConfidence === 'insufficient' ? (
          <p className="font-bengali font-bold text-base text-[var(--text-sub)]">
            এখনো পর্যাপ্ত তথ্য নেই (কমপক্ষে ৩ দিনের রিপোর্ট লাগবে)।
          </p>
        ) : hasOutages ? (
          <p className="font-bengali font-bold text-lg md:text-xl text-[var(--text-main)] tracking-tight">
            এই সপ্তাহে <span className="text-red-500">{toBengaliDigits(eventCount)}</span> বার কারেন্ট গেছে • মোট <span className="text-red-500">{toBengaliDigits(totalHours)}</span> ঘণ্টা
          </p>
        ) : (
          <p className="font-bengali font-bold text-lg text-emerald-600 dark:text-emerald-400">
            এই সপ্তাহে কোনো বিদ্যুৎ বিভ্রাট রিপোর্ট করা হয়নি
          </p>
        )}
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-500 shrink-0">
            <Zap className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <span className="font-bengali text-xs text-[var(--text-sub)] block">
              বিভ্রাটের সংখ্যা
            </span>
            <span className="font-bengali font-bold text-lg text-[var(--text-main)]">
              {dataConfidence === 'ok' ? `${toBengaliDigits(eventCount)} বার` : '—'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Clock className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <span className="font-bengali text-xs text-[var(--text-sub)] block">
              মোট সংযোগহীন সময়
            </span>
            <span className="font-bengali font-bold text-lg text-[var(--text-main)]">
              {dataConfidence === 'ok' && hasOutages
                ? `${toBengaliDigits(totalHours)} ঘণ্টা`
                : dataConfidence === 'ok'
                ? '০ মিনিট'
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
