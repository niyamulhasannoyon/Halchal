'use client';

import React, { useState, useEffect } from 'react';
import { canShowInstallPrompt, triggerInstallPrompt, dismissInstallPrompt } from '@/lib/pwa';

export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check initial state
    if (canShowInstallPrompt()) {
      setVisible(true);
    }

    // Listen for report completion event
    const handleEligible = () => {
      if (canShowInstallPrompt()) {
        setVisible(true);
      }
    };

    window.addEventListener('halchal:eligible_for_pwa_install', handleEligible);
    return () => {
      window.removeEventListener('halchal:eligible_for_pwa_install', handleEligible);
    };
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    const outcome = await triggerInstallPrompt();
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="অ্যাপ ইনস্টলেশন পরামর্শ"
      className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto p-4 rounded-2xl bg-[var(--surface-bg)] border border-emerald-500/40 shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0">📱</span>
        <div>
          <h3 className="font-bengali font-bold text-sm md:text-base text-[var(--text-main)] leading-tight">
            হালচাল ইনস্টল করুন
          </h3>
          <p className="font-bengali text-xs text-[var(--text-sub)] mt-0.5">
            হোম স্ক্রিন থেকে অফলাইনেও লাইভ খবর পান
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bengali font-bold text-xs md:text-sm cursor-pointer shadow-sm transition-colors"
        >
          ইনস্টল
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-xl text-[var(--text-sub)] hover:text-[var(--text-main)] text-sm cursor-pointer transition-colors"
          aria-label="বাতিল করুন"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
