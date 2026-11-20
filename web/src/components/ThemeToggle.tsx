'use client';

import React, { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
  variant?: 'segmented' | 'compact';
}

export function ThemeToggle({
  className = '',
  showLabels = false,
  variant = 'segmented',
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('halchal-theme') as ThemeMode | null;
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        setTheme(stored);
        applyTheme(stored);
      } else {
        setTheme('system');
        applyTheme('system');
      }
    } catch {
      applyTheme('system');
    }
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSelect = (mode: ThemeMode) => {
    setTheme(mode);
    try {
      localStorage.setItem('halchal-theme', mode);
    } catch {}
    applyTheme(mode);
  };

  if (!mounted) {
    if (variant === 'compact') {
      return (
        <div className={`w-9 h-9 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] animate-pulse shrink-0 ${className}`} />
      );
    }
    return (
      <div className={`h-9 w-28 rounded-full bg-[var(--surface-elevated)] animate-pulse shrink-0 ${className}`} />
    );
  }

  // Compact 1-button toggle for mobile headers
  if (variant === 'compact') {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    const toggleNext = () => {
      const nextTheme: ThemeMode = isDark ? 'light' : 'dark';
      handleSelect(nextTheme);
    };

    return (
      <button
        type="button"
        onClick={toggleNext}
        aria-label={isDark ? 'লাইট মোডে পরিবর্তন করুন' : 'ডার্ক মোডে পরিবর্তন করুন'}
        title={isDark ? 'লাইট থিম চালু করুন' : 'ডার্ক ওলেড থিম চালু করুন'}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] flex items-center justify-center text-sm sm:text-base transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 select-none ${className}`}
      >
        <span aria-hidden="true">{isDark ? '🌙' : '☀️'}</span>
      </button>
    );
  }

  // Full segmented control (used in Settings page)
  return (
    <div
      role="group"
      aria-label="থিম নির্বাচন করুন"
      className={`inline-flex items-center p-1 rounded-full bg-[var(--surface-elevated)] border border-[var(--surface-border)] shadow-inner shrink-0 ${className}`}
    >
      {/* Dark OLED Button */}
      <button
        type="button"
        onClick={() => handleSelect('dark')}
        aria-pressed={theme === 'dark'}
        title="ডার্ক ওলেড থিম (ব্ল্যাকআউটে ব্যাটারি সাশ্রয়ী)"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bengali font-semibold transition-all duration-150 cursor-pointer min-h-[36px] ${
          theme === 'dark'
            ? 'bg-slate-900 text-white shadow-sm ring-1 ring-emerald-500/50'
            : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
        }`}
      >
        <span className="text-sm" aria-hidden="true">🌙</span>
        {showLabels && <span>ডার্ক</span>}
      </button>

      {/* Light High-Contrast Button */}
      <button
        type="button"
        onClick={() => handleSelect('light')}
        aria-pressed={theme === 'light'}
        title="হাই-কন্ট্রাস্ট লাইট থিম (ঢাকার প্রখর রোদে পরিষ্কার)"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bengali font-semibold transition-all duration-150 cursor-pointer min-h-[36px] ${
          theme === 'light'
            ? 'bg-white text-slate-950 shadow-sm ring-1 ring-emerald-500/50'
            : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
        }`}
      >
        <span className="text-sm" aria-hidden="true">☀️</span>
        {showLabels && <span>লাইট</span>}
      </button>

      {/* System Preference Button */}
      <button
        type="button"
        onClick={() => handleSelect('system')}
        aria-pressed={theme === 'system'}
        title="সিস্টেম সেটিংস অনুসরণ করুন"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bengali font-semibold transition-all duration-150 cursor-pointer min-h-[36px] ${
          theme === 'system'
            ? 'bg-[var(--surface-bg)] text-emerald-500 shadow-sm ring-1 ring-emerald-500/50'
            : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
        }`}
      >
        <span className="text-sm" aria-hidden="true">⚙️</span>
        {showLabels && <span>সিস্টেম</span>}
      </button>
    </div>
  );
}
