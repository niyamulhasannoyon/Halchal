'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { BIAS_DISCLAIMER_BN } from '@/lib/insights';

export function BiasDisclaimer({ className = '' }: { className?: string }) {
  return (
    <aside
      role="note"
      aria-label="তথ্যের সীমাবদ্ধতা ও সতর্কতা"
      className={`p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm leading-relaxed ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="font-bengali font-bold text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
            নির্দেশক তথ্যের সীমাবদ্ধতা (Reporting Bias)
          </p>
          <p className="font-bengali text-xs md:text-sm text-amber-900/90 dark:text-amber-200/90">
            {BIAS_DISCLAIMER_BN}
          </p>
        </div>
      </div>
    </aside>
  );
}
