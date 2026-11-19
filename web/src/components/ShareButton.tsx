'use client';

import React, { useState } from 'react';

interface ShareButtonProps {
  h3Index: string;
  areaName: string;
  className?: string;
}

export function ShareButton({
  h3Index,
  areaName,
  className = '',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // 10-minute floor time bucket to defeat aggressive social media OG caching
    const timeBucket = Math.floor(Date.now() / 600000);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://halchal.bd';
    const shareUrl = `${origin}/z/${h3Index}?t=${timeBucket}`;
    const shareTitle = `${areaName} এলাকার লাইভ হালচাল`;
    const shareText = `${areaName} এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর দেখুন হালচালে:`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: unknown) {
        // User aborted share sheet or unsupported format -> fallback to copy
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Legacy prompt fallback
      prompt('শেয়ার লিংকটি কপি করুন:', shareUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-border)]/50 active:bg-[var(--surface-border)] text-[var(--text-main)] font-bengali font-bold text-sm md:text-base border border-[var(--surface-border)] shadow-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 select-none ${className}`}
      aria-label={`${areaName} এলাকার লাইভ কার্ড শেয়ার করুন`}
    >
      <span className="text-base" aria-hidden="true">
        {copied ? '✓' : '↗️'}
      </span>
      <span>{copied ? 'লিংক কপি হয়েছে!' : 'শেয়ার'}</span>
    </button>
  );
}
