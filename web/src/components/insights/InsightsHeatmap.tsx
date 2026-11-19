'use client';

import React, { useState } from 'react';
import { UtilityCategory, ZoneDisplayState } from '@/lib/theme';
import { CategoryInsight, HeatmapDay, HourlyBlock, formatHourBn } from '@/lib/insights';
import { toBengaliDigits } from '@/lib/bengali-utils';
import { Zap, Flame, Droplet, Info } from 'lucide-react';

interface InsightsHeatmapProps {
  categories: Record<UtilityCategory, CategoryInsight>;
  dataConfidence: 'ok' | 'insufficient';
  areaNameBn: string;
}

const CATEGORY_TABS: { id: UtilityCategory; label: string; icon: typeof Zap }[] = [
  { id: 'electricity', label: 'বিদ্যুৎ', icon: Zap },
  { id: 'gas', label: 'গ্যাস', icon: Flame },
  { id: 'water', label: 'পানি', icon: Droplet },
];

const BLOCK_HEADERS = [
  { label: 'রাত ১২-৪', short: '১২-৪' },
  { label: 'ভোর ৪-৮', short: '৪-৮' },
  { label: 'সকাল ৮-১২', short: '৮-১২' },
  { label: 'দুপুর ১২-৪', short: '১২-৪' },
  { label: 'বিকাল ৪-৮', short: '৪-৮' },
  { label: 'রাত ৮-১২', short: '৮-১২' },
];

export function InsightsHeatmap({
  categories,
  dataConfidence,
  areaNameBn,
}: InsightsHeatmapProps) {
  const [activeCategory, setActiveCategory] = useState<UtilityCategory>('gas');
  const [selectedCell, setSelectedCell] = useState<{
    day: HeatmapDay;
    block: HourlyBlock;
  } | null>(null);

  const activeInsight = categories[activeCategory];
  const heatmapDays = activeInsight?.heatmap ?? [];

  // Helper to render cell styling and accessible pattern
  const getCellStyling = (state: ZoneDisplayState) => {
    switch (state) {
      case 'out':
        return {
          bg: 'bg-red-500/25 dark:bg-red-950/60',
          border: 'border-red-500/80 dark:border-red-500/70 border-solid',
          text: 'text-red-700 dark:text-red-300',
          pattern: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.25) 0px, rgba(239, 68, 68, 0.25) 3px, transparent 3px, transparent 6px)',
          icon: '✕',
          labelBn: 'বিচ্ছিন্ন / নেই',
        };
      case 'low':
        return {
          bg: 'bg-amber-500/20 dark:bg-amber-950/50',
          border: 'border-amber-500/80 dark:border-amber-500/70 border-dashed',
          text: 'text-amber-800 dark:text-amber-300',
          pattern: 'repeating-linear-gradient(-45deg, rgba(245, 158, 11, 0.2) 0px, rgba(245, 158, 11, 0.2) 3px, transparent 3px, transparent 6px)',
          icon: '◐',
          labelBn: 'স্বল্প চাপ / সমস্যা',
        };
      case 'ok':
        return {
          bg: 'bg-emerald-500/20 dark:bg-emerald-950/50',
          border: 'border-emerald-500/60 dark:border-emerald-500/50 border-solid',
          text: 'text-emerald-700 dark:text-emerald-300',
          pattern: 'none',
          icon: '✓',
          labelBn: 'স্বাভাবিক সরবরাহ',
        };
      case 'unverified':
      case 'unknown':
      default:
        return {
          bg: 'bg-slate-500/10 dark:bg-slate-800/40',
          border: 'border-slate-400/40 dark:border-slate-600/40 border-dotted',
          text: 'text-[var(--text-sub)]',
          pattern: 'none',
          icon: '○',
          labelBn: 'তথ্য নেই',
        };
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] shadow-sm space-y-5">
      {/* Component Title & Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bengali font-bold text-lg text-[var(--text-main)]">
            ৭ দিনের তাপমান চিত্র (Heatmap)
          </h2>
          <p className="font-bengali text-xs text-[var(--text-sub)]">
            ৭ দিন × ৬টি ৪-ঘণ্টা স্লটের সমন্বিত ইতিহাস
          </p>
        </div>

        {/* Category Pill Switcher */}
        <div
          role="tablist"
          aria-label="ইউটিলিটি ক্যাটাগরি বাছাই করুন"
          className="inline-flex p-1 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] self-start sm:self-auto"
        >
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.id);
                  setSelectedCell(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bengali text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)]/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deterministic Template Insight Callout */}
      <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="font-bengali font-semibold text-sm text-[var(--text-main)] leading-relaxed">
          {activeInsight?.insight_bn ?? 'ইউটিলিটি তথ্য লোড হচ্ছে...'}
        </p>
      </div>

      {/* Pure CSS Grid Heatmap (7 rows x 6 columns) */}
      <div className="overflow-x-auto pb-1">
        <div
          role="grid"
          aria-label={`${areaNameBn} এলাকার ${activeCategory} ইউটিলিটির ৭ দিনের তাপমান গ্রিড`}
          className="min-w-[340px] space-y-1.5"
        >
          {/* Header Row: 6 Columns representing 4-hour blocks */}
          <div className="grid grid-cols-[68px_repeat(6,1fr)] gap-1.5 text-center items-center pb-1">
            <span className="font-bengali text-[11px] font-bold text-[var(--text-sub)] text-left pl-1">
              দিন / সময়
            </span>
            {BLOCK_HEADERS.map((col, idx) => (
              <span
                key={idx}
                className="font-bengali text-[10px] md:text-xs font-bold text-[var(--text-sub)] truncate px-0.5"
                title={col.label}
              >
                {col.label}
              </span>
            ))}
          </div>

          {/* 7 Rows for the last 7 days */}
          {heatmapDays.map((dayRow, dayIdx) => (
            <div
              key={dayIdx}
              role="row"
              className="grid grid-cols-[68px_repeat(6,1fr)] gap-1.5 items-center"
            >
              {/* Day Label (e.g. "শুক্র", "শনি") */}
              <div className="flex flex-col text-left pl-1 leading-tight">
                <span className="font-bengali font-bold text-xs text-[var(--text-main)]">
                  {dayRow.day_name_bn.replace('বার', '')}
                </span>
                <span className="font-bengali text-[10px] text-[var(--text-sub)]">
                  {toBengaliDigits(dayRow.date.slice(5))}
                </span>
              </div>

              {/* 6 Block Cells (4-hour intervals) */}
              {dayRow.blocks.map((block, blockIdx) => {
                const styling = getCellStyling(block.state);
                const isSelected =
                  selectedCell?.day.date === dayRow.date &&
                  selectedCell?.block.block_index === block.block_index;

                const ariaCellLabel = `${dayRow.day_name_bn}, ${block.hours_label_bn}: অবস্থা ${styling.labelBn}`;

                return (
                  <button
                    key={blockIdx}
                    role="gridcell"
                    type="button"
                    aria-label={ariaCellLabel}
                    onClick={() => setSelectedCell({ day: dayRow, block })}
                    style={{
                      backgroundImage: styling.pattern !== 'none' ? styling.pattern : undefined,
                    }}
                    className={`h-10 md:h-11 rounded-xl flex items-center justify-center font-bengali font-bold text-xs transition-transform active:scale-95 cursor-pointer relative border ${styling.bg} ${styling.border} ${styling.text} ${
                      isSelected
                        ? 'ring-2 ring-emerald-500 scale-105 z-10 shadow-md'
                        : 'hover:opacity-90 hover:scale-102'
                    }`}
                  >
                    <span className="text-xs select-none" aria-hidden="true">
                      {styling.icon}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Tooltip / Tap Detail Card */}
      {selectedCell ? (
        <div
          role="region"
          aria-live="polite"
          className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-emerald-500/40 shadow-sm animate-in fade-in slide-in-from-top-1 space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="font-bengali font-bold text-sm text-[var(--text-main)]">
              {selectedCell.day.day_name_bn} ({toBengaliDigits(selectedCell.day.date)})
            </span>
            <span className="font-bengali text-xs px-2 py-0.5 rounded-md bg-[var(--surface-border)] font-bold text-[var(--text-sub)]">
              {selectedCell.block.hours_label_bn}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-bengali pt-1">
            <div>
              <span className="text-[var(--text-sub)] block">নিশ্চিত অবস্থা:</span>
              <span className="font-bold text-[var(--text-main)]">
                {getCellStyling(selectedCell.block.state).labelBn}
              </span>
            </div>

            {selectedCell.block.minutes_out > 0 && (
              <div>
                <span className="text-[var(--text-sub)] block">বিচ্ছিন্ন ছিল:</span>
                <span className="font-bold text-red-500">
                  {toBengaliDigits(selectedCell.block.minutes_out)} মিনিট
                </span>
              </div>
            )}

            {selectedCell.block.minutes_low > 0 && (
              <div>
                <span className="text-[var(--text-sub)] block">স্বল্প চাপ ছিল:</span>
                <span className="font-bold text-amber-500">
                  {toBengaliDigits(selectedCell.block.minutes_low)} মিনিট
                </span>
              </div>
            )}

            {selectedCell.block.minutes_out === 0 && selectedCell.block.minutes_low === 0 && (
              <div>
                <span className="text-[var(--text-sub)] block">পরিসেবা মান:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  কোনো সমস্যা রিপোর্ট হয়নি
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="font-bengali text-xs text-center text-[var(--text-sub)] py-0.5">
          👉 যেকোনো ঘরে ট্যাপ করে নির্দিষ্ট ৪ ঘণ্টার বিস্তারিত বিবরণ দেখুন
        </p>
      )}

      {/* Accessible Heatmap Legend */}
      <div className="pt-2 border-t border-[var(--surface-border)] flex flex-wrap items-center justify-center gap-3 text-xs font-bengali text-[var(--text-sub)]">
        <span className="font-bold text-[var(--text-main)]">চিহ্ন ও অর্থ:</span>

        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-500/20 border border-emerald-500/60 inline-flex items-center justify-center text-[10px] text-emerald-500 font-bold">
            ✓
          </span>
          <span>স্বাভাবিক</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span
            style={{
              backgroundImage:
                'repeating-linear-gradient(-45deg, rgba(245, 158, 11, 0.4) 0px, rgba(245, 158, 11, 0.4) 2px, transparent 2px, transparent 4px)',
            }}
            className="w-3.5 h-3.5 rounded-md bg-amber-500/20 border border-dashed border-amber-500/80 inline-flex items-center justify-center text-[10px] text-amber-500 font-bold"
          >
            ◐
          </span>
          <span>স্বল্প চাপ / সমস্যা</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.4) 0px, rgba(239, 68, 68, 0.4) 2px, transparent 2px, transparent 4px)',
            }}
            className="w-3.5 h-3.5 rounded-md bg-red-500/25 border border-red-500/80 inline-flex items-center justify-center text-[10px] text-red-500 font-bold"
          >
            ✕
          </span>
          <span>সংযোগ বিচ্ছিন্ন / নেই</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-500/15 border border-dotted border-slate-500/50 inline-flex items-center justify-center text-[10px] text-slate-400 font-bold">
            ○
          </span>
          <span>তথ্য নেই</span>
        </span>
      </div>
    </div>
  );
}
