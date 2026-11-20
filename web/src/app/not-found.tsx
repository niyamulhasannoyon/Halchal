import type { Metadata } from 'next';
import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'পাতাটি পাওয়া যায়নি',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] font-bengali flex flex-col justify-between pb-28 transition-colors">
      <header className="p-4 border-b border-[var(--surface-border)] bg-[var(--surface-bg)]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors py-1 px-2 rounded-xl hover:bg-[var(--surface-elevated)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>প্রধান পাতা</span>
        </Link>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          ৪০৪
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--text-sub)] shadow-inner">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--text-main)]">
            পাতাটি পাওয়া যায়নি
          </h1>
          <p className="text-sm text-[var(--text-sub)] leading-relaxed">
            আপনি যে পাতাটি খুঁজছেন তা স্থানান্তরিত করা হয়েছে অথবা এর ঠিকানা ভুল হতে পারে।
          </p>
        </div>

        <div className="w-full pt-2">
          <Link
            href="/"
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]"
          >
            <Home className="w-4 h-4" />
            <span>হোমে ফিরে যান</span>
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
