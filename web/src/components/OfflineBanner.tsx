'use client';

import React from 'react';
import { formatRelativeTimeBn } from '@/lib/bengali-utils';

interface OfflineBannerProps {
  isOffline: boolean;
  isStale?: boolean;
  updatedAt?: string | Date;
  className?: string;
}

export function OfflineBanner({
  isOffline,
  isStale = false,
  updatedAt,
  className = '',
}: OfflineBannerProps) {
  if (!isOffline && !isStale) return null;

  const timeText = updatedAt ? formatRelativeTimeBn(updatedAt) : 'কিছুক্ষণ আগে';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-2 px-4 bg-amber-500/15 border-b border-amber-500/30 text-amber-500 font-bengali text-xs md:text-sm font-medium flex items-center justify-center gap-2 text-center transition-colors ${className}`}
    >
      <span className="shrink-0 text-base">⚠️</span>
      <span>
        {isOffline
          ? `অফলাইন মোড — ডেটা পুরোনো, শেষ আপডেট ${timeText}`
          : `ক্যাশে সংরক্ষিত তথ্য — শেষ আপডেট ${timeText}`}
      </span>
    </div>
  );
}
