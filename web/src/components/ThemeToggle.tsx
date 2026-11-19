'use client';

import React, { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
}

export function ThemeToggle({
  className = '',
  showLabels = false,
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
    return (
      <div className={`h-9 w-28 rounded-full bg-[var(--surface-elevated)] animate-pulse ${className}`} />
    );
  }

  return (
    <div
      role="group"
      aria-label="থিম নির্বাচন করুন"
      className={`inline-flex items-center p-1 rounded-full bg-[var(--surface-elevated)] border border-[var(--surface-border)] shadow-inner ${className}`}
    >
      {/* Dark OLED Button */}
      <button
        type="button"
        onClick={() => handleSelect('dark')}
        aria-pressed={theme === 'dark'}
        title="ডার্ক ওলেড থিম (ব্ল্যাকআউটে ব্যাটারি সাশ্রয়ী)"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bengali font-semibold transition-all duration-150 cursor-pointer ${
          theme === 'dark'
            ? 'bg-slate-900 text-white shadow-sm ring-1 ring-emerald-500/50'
            : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
        }`}
      >
        <span className="text-sm">🌙</span>
        {showLabels && <span>ডার্ক</span>}
      </button>

      {/* Light High-Contrast Button */}
      <button
        type="button"
        onClick={() => handleSelect('light')}
        aria-pressed={theme === 'light'}
        title="হাই-কন্ট্রাস্ট লাইট থিম (ঢাকার প্রখর রোদে পরিষ্কার)"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bengali font-semibold transition-all duration-150 cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-slate-950 shadow-sm ring-1 ring-emerald-500/50'
            : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
        }`}
      >
        <span className="text-sm">☀️</span>
        {showLabels && <span>লাইট</span>}
      </button>

      {/* System Preference Button */}
      <button
        type="button"
        onClick={() => handleSelect('system')}
        aria-pressed={theme === 'system'}
        title="সিস্টেম সেটিংস অনুসরণ করুন"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bengali font-semibold transition-all duration-150 cursor-pointer ${
          theme === 'system'
            ? 'bg-[var(--surface-bg)] text-emerald-500 shadow-sm ring-1 ring-emerald-500/50'
            : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
        }`}
      >
        <span className="text-sm">⚙️</span>
        {showLabels && <span>সিস্টেম</span>}
      </button>
    </div>
  );
}
