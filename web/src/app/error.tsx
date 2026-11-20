'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log scrubbed error to Sentry
    if (typeof window !== 'undefined') {
      try {
        Sentry.captureException(error);
      } catch {
        // Fallback silently if Sentry is unconfigured
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] font-bengali flex flex-col items-center justify-center p-6 text-center transition-colors">
      <div className="max-w-md w-full space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--text-main)]">
            সাময়িক কারিগরি সমস্যা
          </h1>
          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            দুঃখিত, তথ্য লোড করতে সমস্যা হয়েছে। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.99]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>আবার চেষ্টা করুন</span>
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-bg)] hover:bg-[var(--surface-elevated)] text-[var(--text-main)] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>প্রধান পাতা</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
