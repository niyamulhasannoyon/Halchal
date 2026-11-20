'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { generateShareTextBn } from '@/lib/bengali-utils';
import { trackEvent } from '@/lib/analytics';

export interface ShareButtonProps {
  h3Index: string;
  areaName: string;
  categories?: {
    electricity?: { state: string };
    gas?: { state: string };
    water?: { state: string };
    lpg?: { state: string };
  };
  customShareText?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export function ShareButton({
  h3Index,
  areaName,
  categories,
  customShareText,
  className = '',
  variant = 'compact',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // 10-minute floor time bucket to defeat aggressive social media OG caching
    const timeBucket = Math.floor(Date.now() / 600000);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://halchal.bd';
    const shareUrl = `${origin}/z/${h3Index}?t=${timeBucket}`;
    const shareTitle = `${areaName} এলাকার লাইভ হালচাল`;
    const shareText = customShareText || generateShareTextBn(areaName, categories);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        trackEvent('share_clicked', { channel: 'native_share' });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: Copy share URL (including time bucket) to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      trackEvent('share_clicked', { channel: 'clipboard' });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      trackEvent('share_clicked', { channel: 'clipboard' });
      prompt('শেয়ার লিংকটি কপি করুন:', shareUrl);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={`${areaName} এলাকার লাইভ কার্ড শেয়ার করুন`}
        title={copied ? 'লিংক কপি হয়েছে!' : 'শেয়ার করুন'}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-elevated)] flex items-center justify-center transition-colors shrink-0 shadow-xs cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${className}`}
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-border)]/50 active:bg-[var(--surface-border)] text-[var(--text-main)] font-bengali font-bold text-sm md:text-base border border-[var(--surface-border)] shadow-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 select-none ${className}`}
      aria-label={`${areaName} এলাকার লাইভ কার্ড শেয়ার করুন`}
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
      <span>{copied ? 'লিংক কপি হয়েছে!' : 'শেয়ার'}</span>
    </button>
  );
}
