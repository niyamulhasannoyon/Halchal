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
    <header className={`sticky top-0 z-40 w-full py-2.5 px-4 backdrop-blur-md bg-[var(--canvas-bg)]/85 border-b border-[var(--surface-border)]/60 transition-colors ${className}`}>
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Area Title & Location Marker */}
        <button
          type="button"
          onClick={onAreaClick}
          className="flex items-center gap-2 text-left group rounded-xl px-2.5 py-1.5 -ml-2 hover:bg-[var(--surface-elevated)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label={`বর্তমান এলাকা: ${areaName}। পরিবর্তনের জন্য চাপুন।`}
        >
          {/* Location Pin Icon */}
          <span className="text-emerald-500 shrink-0 text-lg leading-none" aria-hidden="true">
            📍
          </span>
          <div className="flex flex-col">
            <span className="font-bengali font-bold text-base md:text-lg text-[var(--text-main)] group-hover:text-emerald-500 transition-colors leading-tight truncate max-w-[200px] sm:max-w-[260px]">
              {areaName}
            </span>
          </div>
        </button>

        {/* Live Indicator + Relative Time */}
        <div className="flex items-center gap-2 bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-full px-3 py-1 shrink-0 shadow-sm">
          {isLive && (
            <span className="relative flex h-2.5 w-2.5 shrink-0" title="লাইভ আপডেট সক্রিয়">
              <span className="animate-live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          )}
          <span className="font-bengali text-xs md:text-sm text-[var(--text-sub)] font-medium whitespace-nowrap">
            {relativeTime}
          </span>
        </div>
      </div>
    </header>
  );
}
