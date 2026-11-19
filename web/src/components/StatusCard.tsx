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

  // Category Icon SVGs
  const renderCategoryIcon = (cat: UtilityCategory) => {
    switch (cat) {
      case 'electricity':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-500">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      case 'gas':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-orange-500">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        );
      case 'water':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-500">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        );
      case 'lpg':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-500">
            <rect x="6" y="7" width="12" height="14" rx="3" />
            <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
            <line x1="6" y1="13" x2="18" y2="13" />
          </svg>
        );
    }
  };

  return (
    <div
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={`${categoryMeta.nameBn} স্ট্যাটাস`}
      className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] hover:border-[var(--surface-border-strong)] transition-all duration-200 min-h-[136px] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer select-none active:scale-[0.98] ${className}`}
    >
      {/* Top Row: Category Icon + Title on Left, StateBadge on Right */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] shrink-0 group-hover:scale-105 transition-transform">
            {renderCategoryIcon(category)}
          </span>
          <div className="flex flex-col">
            <h3 className="font-bengali font-bold text-lg md:text-xl text-[var(--text-main)] leading-tight">
              {categoryMeta.nameBn}
            </h3>
          </div>
        </div>

        {/* State Badge (Upper Right) */}
        <StateBadge state={state} size="sm" />
      </div>

      {/* Bottom Row: Reporter Count Bar & Threshold Progress */}
      <div className="mt-3 pt-2.5 border-t border-[var(--surface-border)]/60 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-bengali text-[var(--text-sub)]">
          <span className="truncate">{reporterText}</span>
          {/* Micro consensus dots indicator (min 3 reporters rule ADR-0004) */}
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
