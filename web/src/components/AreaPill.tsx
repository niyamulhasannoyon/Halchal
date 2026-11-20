'use client';

import React from 'react';
import { formatRelativeTimeBn } from '@/lib/bengali-utils';

interface AreaPillProps {
  areaName: string;
  updatedAt?: Date | string | number;
  isLive?: boolean;
  onAreaClick?: () => void;
  className?: string;
}

export function AreaPill({
  areaName,
  updatedAt = new Date(),
  isLive = true,
  onAreaClick,
  className = '',
}: AreaPillProps) {
  const relativeTime = formatRelativeTimeBn(updatedAt);

  return (
    <div
      className={`w-full flex items-center justify-between gap-2 p-3 sm:p-3.5 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] shadow-xs transition-colors ${className}`}
    >
      {/* Area Title & Location Marker */}
      <button
        type="button"
        onClick={onAreaClick}
        className="flex items-center gap-2.5 text-left group rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer min-w-0"
        aria-label={`${areaName} — এলাকা পরিবর্তন করতে চাপুন`}
      >
        <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
          📍
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bengali font-bold text-sm sm:text-base text-[var(--text-main)] group-hover:text-emerald-500 transition-colors leading-tight truncate">
              {areaName}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-bold group-hover:text-emerald-500 transition-colors" aria-hidden="true">
              ▼
            </span>
          </div>
          <span className="font-bengali text-[11px] text-[var(--text-sub)] block mt-0.5">
            এলাকা পরিবর্তন করতে চাপুন
          </span>
        </div>
      </button>

      {/* Live Indicator + Relative Time */}
      <div className="flex items-center gap-1.5 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-full px-2.5 py-1 shrink-0">
        {isLive && (
          <span className="relative flex h-2 w-2 shrink-0" title="লাইভ আপডেট সক্রিয়">
            <span className="animate-live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        <span className="font-bengali text-xs text-[var(--text-sub)] font-semibold whitespace-nowrap">
          {relativeTime}
        </span>
      </div>
    </div>
  );
}
