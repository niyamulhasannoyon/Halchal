'use client';

import React from 'react';
import { UtilityCategory, ZoneDisplayState, UTILITY_CATEGORIES } from '@/lib/theme';
import { StateBadge } from './StateBadge';
import { formatReporterCountBn } from '@/lib/bengali-utils';

interface StatusCardProps {
  category: UtilityCategory;
  state: ZoneDisplayState;
  reporterCount: number;
  isVerified?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatusCard({
  category,
  state,
  reporterCount,
  isVerified = state === 'ok' || state === 'low' || state === 'out',
  onClick,
  className = '',
}: StatusCardProps) {
  const categoryMeta = UTILITY_CATEGORIES[category];
  const reporterText = formatReporterCountBn(reporterCount, isVerified);

  // Category Icon SVGs with specific theme tints
  const renderCategoryIcon = (cat: UtilityCategory) => {
    switch (cat) {
      case 'electricity':
        return (
          <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
        );
      case 'gas':
        return (
          <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 shrink-0 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
          </span>
        );
      case 'water':
        return (
          <span className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shrink-0 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </span>
        );
      case 'lpg':
        return (
          <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="6" y="7" width="12" height="14" rx="3" />
              <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
              <line x1="6" y1="13" x2="18" y2="13" />
            </svg>
          </span>
        );
    }
  };

  return (
    <div
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={`${categoryMeta.nameBn} — স্ট্যাটাস ও আপডেট রিপোর্ট`}
      className={`group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 min-h-[148px] shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer select-none active:scale-[0.98] ${className}`}
    >
      {/* Top Section: Category Header & Action Hint */}
      <div>
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {renderCategoryIcon(category)}
            <h2 className="font-bengali font-bold text-base sm:text-lg text-[var(--text-main)] leading-tight truncate">
              {categoryMeta.nameBn}
            </h2>
          </div>
          <span className="text-[var(--text-tertiary)] group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all text-xs font-semibold shrink-0" aria-hidden="true">
            ➔
          </span>
        </div>

        {/* State Badge */}
        <div className="mt-1">
          <StateBadge state={state} size="sm" />
        </div>
      </div>

      {/* Bottom Row: Reporter Count & Consensus Dots */}
      <div className="mt-3 pt-2.5 border-t border-[var(--surface-border)]/60 flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs font-bengali text-[var(--text-sub)]">
          <span className="truncate">{reporterText}</span>
          <div className="flex items-center gap-1 shrink-0 ml-1" title={`যাচাই থ্রেশহোল্ড: ${Math.min(reporterCount, 3)}/৩`}>
            {[1, 2, 3].map((step) => {
              const filled = isVerified || reporterCount >= step;
              return (
                <span
                  key={step}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    filled
                      ? 'bg-emerald-500'
                      : 'bg-[var(--surface-border)]'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
