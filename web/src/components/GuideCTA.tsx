import React from 'react';
import Link from 'next/link';
import { Send, ArrowRight, Shield } from 'lucide-react';

interface GuideCTAProps {
  categoryLabel?: string;
  categoryAction?: string;
  className?: string;
}

export function GuideCTA({
  categoryLabel = 'আপনার এলাকার অবস্থা কেমন?',
  categoryAction = 'এখনই হাল জানান',
  className = '',
}: GuideCTAProps) {
  return (
    <div
      className={`p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-[var(--surface-bg)] to-emerald-500/5 border border-emerald-500/30 text-center space-y-4 font-bengali ${className}`}
    >
      <div className="inline-flex p-3 rounded-2xl bg-emerald-500/15 text-emerald-400">
        <Send className="w-6 h-6" aria-hidden="true" />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-base font-bold text-[var(--text-main)]">
          {categoryLabel}
        </h3>
        <p className="text-xs text-[var(--text-sub)] leading-relaxed">
          আপনার ১টি ট্যাপ আশপাশের প্রতিবেশীদের সঠিক সিদ্ধান্ত নিতে সাহায্য করে। হালচালে কোনো ব্যক্তিগত
          পরিচয় বা বাসার সুনির্দিষ্ট জিপিএস অবস্থান নেওয়া হয় না।
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
        >
          <span>{categoryAction}</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <Link
          href="/map"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--text-main)] text-xs font-medium hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
        >
          <span>লাইভ ম্যাপে পুরো শহর দেখুন</span>
        </Link>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-sub)] pt-1">
        <Shield className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
        <span>১০০% বেনামী • কোনো লগইন আবশ্যক নয় • ৩ জনের তথ্যে যাচাই</span>
      </div>
    </div>
  );
}
