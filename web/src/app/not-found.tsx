import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col justify-between pb-24">
      <header className="p-4 border-b border-surface-border bg-surface/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors py-1 px-2 rounded-lg hover:bg-surface"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>প্রধান পাতা</span>
        </Link>
        <span className="text-xs font-semibold px-2 py-1 rounded bg-zinc-800 text-zinc-300">
          ৪০৪
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 shadow-inner">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-text-primary">
            পাতাটি পাওয়া যায়নি
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            আপনি যে পাতাটি খুঁজছেন তা স্থানান্তরিত করা হয়েছে অথবা এর ঠিকানা ভুল হতে পারে।
          </p>
        </div>

        <div className="w-full pt-2">
          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs"
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
