'use client';

import React, { useState, useEffect } from 'react';
import { UtilityCategory, UserReportState } from '@/lib/theme';
import { getOrCreateDeviceId } from '@/lib/device';
import { enqueueReport, SubmitReportPayload } from '@/lib/offline-queue';
import { markSuccessfulReportSubmitted } from '@/lib/pwa';
import { toBengaliDigits, toAsciiDigits } from '@/lib/bengali-utils';
import { getBrowserAuthToken } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface OneTapReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  areaName?: string;
  defaultLat?: number;
  defaultLng?: number;
  currentH3?: string;
  initialCategory?: UtilityCategory | null;
  onOptimisticReport: (
    category: UtilityCategory,
    state: UserReportState,
    price?: number | null
  ) => void;
  onOptimisticRollback?: () => void;
  onReportSuccess?: (message: string) => void;
}

const CATEGORY_TABS: Array<{ id: UtilityCategory; label: string; icon: string; possessive: string }> = [
  { id: 'electricity', label: 'বিদ্যুৎ', icon: '⚡', possessive: 'বিদ্যুতের' },
  { id: 'gas', label: 'গ্যাস', icon: '🔥', possessive: 'গ্যাসের' },
  { id: 'water', label: 'পানি', icon: '💧', possessive: 'পানির' },
  { id: 'lpg', label: 'এলপিজি', icon: '🛢️', possessive: 'এলপিজির' },
];

const LPG_PRICE_CHIPS = [1400, 1500, 1600, 1800, 2000, 2500, 3000];

export function OneTapReportSheet({
  isOpen,
  onClose,
  areaName,
  defaultLat,
  defaultLng,
  initialCategory,
  onOptimisticReport,
  onOptimisticRollback,
  onReportSuccess,
}: OneTapReportSheetProps) {
  const { trustInfo, isAnonymous, openAuthModal } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<UtilityCategory>('electricity');
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cached GPS coordinates
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number }>({
    lat: defaultLat ?? 23.746177,
    lng: defaultLng ?? 90.373828,
    accuracy: 35,
  });

  // Sync category & coordinates whenever modal opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedPrice(null);
      setCustomPriceInput('');
      setErrorMessage(null);
      setIsSubmitting(false);
      return;
    }

    if (initialCategory) {
      setSelectedCategory(initialCategory);
    } else {
      setSelectedCategory('electricity');
    }

    setCoords({ lat: defaultLat ?? 23.746177, lng: defaultLng ?? 90.373828, accuracy: 35 });

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.min(pos.coords.accuracy, 150),
          });
        },
        (err) => {
          console.warn('Geolocation acquisition warning, using zone coordinates:', err.message);
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 }
      );
    }
  }, [isOpen, initialCategory, defaultLat, defaultLng]);

  if (!isOpen) return null;

  const currentTab = CATEGORY_TABS.find((c) => c.id === selectedCategory) || CATEGORY_TABS[0];

  const handleSubmitState = async (state: UserReportState) => {
    if (!selectedCategory || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    let price: number | null = null;
    if (selectedCategory === 'lpg') {
      if (customPriceInput.trim()) {
        const asciiDigits = toAsciiDigits(customPriceInput).replace(/\D/g, '');
        const parsed = parseInt(asciiDigits, 10);
        if (!Number.isNaN(parsed) && parsed >= 500 && parsed <= 6000) {
          price = parsed;
        }
      } else if (selectedPrice) {
        price = selectedPrice;
      }
    }

    const payload: SubmitReportPayload = {
      category: selectedCategory,
      state,
      price_bdt: price,
      lat: coords.lat,
      lng: coords.lng,
      accuracy_m: coords.accuracy,
      client_ts: new Date().toISOString(),
      device_id: getOrCreateDeviceId(),
      attestation: {
        provider: 'mock',
        token: 'mock-valid-attestation',
        valid: true,
      },
    };

    // 1. Optimistic UI update immediately
    onOptimisticReport(selectedCategory, state, price);

    // 2. Check offline mode
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueueReport(payload);
      markSuccessfulReportSubmitted();
      setIsSubmitting(false);
      onReportSuccess?.('অফলাইনে সেভ হয়েছে, নেট এলেই জমা হবে');
      onClose();
      return;
    }

    // 3. Post to submit-report API route
    try {
      const token = await getBrowserAuthToken();
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        markSuccessfulReportSubmitted();
        setIsSubmitting(false);
        onReportSuccess?.('আপনার রিপোর্ট সফলভাবে গ্রহণ করা হয়েছে!');
        onClose();
      } else {
        // Rollback optimistic UI update upon server rejection
        onOptimisticRollback?.();
        setIsSubmitting(false);
        const errMsg =
          data.error ||
          (res.status === 429
            ? '১৫ মিনিটে একবারই রিপোর্ট করা যাবে'
            : 'রিপোর্ট জমা দিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        setErrorMessage(errMsg);
      }
    } catch {
      // Network failure -> fallback to IndexedDB offline queue
      await enqueueReport(payload);
      markSuccessfulReportSubmitted();
      setIsSubmitting(false);
      onReportSuccess?.('অফলাইনে সেভ হয়েছে, নেট এলেই জমা হবে');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-sheet-title"
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] shadow-2xl flex flex-col p-5 sm:p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        {/* Mobile Pull Indicator */}
        <div className="w-10 h-1.5 rounded-full bg-[var(--surface-border)] mx-auto mb-3 sm:hidden" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--surface-border)] mb-4">
          <div className="min-w-0">
            <h2
              id="report-sheet-title"
              className="font-bengali font-bold text-lg sm:text-xl text-[var(--text-main)] flex items-center gap-2 truncate"
            >
              <span>📢</span>
              <span>{currentTab.possessive} লাইভ অবস্থা জানান</span>
            </h2>
            <p className="font-bengali text-xs text-[var(--text-sub)] mt-0.5 truncate">
              📍 {areaName} এলাকা
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-elevated)] flex items-center justify-center transition-colors cursor-pointer text-base shrink-0 ml-2"
            aria-label="বন্ধ করুন"
          >
            ✕
          </button>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-bengali text-xs sm:text-sm flex items-start gap-2 animate-in fade-in"
          >
            <span className="text-sm shrink-0">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tactical 4-Category Switcher Tabs */}
        <div className="mb-4">
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)]">
            {CATEGORY_TABS.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl font-bengali font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer select-none ${
                    isActive
                      ? 'bg-[var(--surface-bg)] text-emerald-500 shadow-sm border border-[var(--surface-border)]'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-bg)]/50'
                  }`}
                >
                  <span className="text-base leading-none">{cat.icon}</span>
                  <span className="leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LPG Price Input & Custom Price (Only for LPG) */}
        {selectedCategory === 'lpg' && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-3">
            <div>
              <span className="font-bengali text-xs text-[var(--text-main)] font-bold block">
                ১২ কেজি সিলিন্ডারের দাম কত দিয়ে কিনেছেন? (ঐচ্ছিক)
              </span>
              <span className="font-bengali text-[11px] text-[var(--text-sub)] block">
                নিচের দামে ট্যাপ করুন অথবা নিজে টাইপ করুন
              </span>
            </div>

            {/* Quick Price Chips: 1400, 1500, 1600, 1800, 2000, 2500, 3000 */}
            <div className="flex flex-wrap gap-2">
              {LPG_PRICE_CHIPS.map((price) => {
                const isSelected = selectedPrice === price && !customPriceInput.trim();
                return (
                  <button
                    key={price}
                    type="button"
                    onClick={() => {
                      setSelectedPrice(price);
                      setCustomPriceInput('');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bengali text-xs sm:text-sm font-bold transition-all cursor-pointer border select-none ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-105'
                        : 'bg-[var(--surface-bg)] text-[var(--text-main)] border-[var(--surface-border)] hover:border-emerald-500'
                    }`}
                  >
                    ৳ {toBengaliDigits(price)}
                  </button>
                );
              })}
            </div>

            {/* Custom Price Input: বা নিজে দাম দেয়ার অপশন */}
            <div className="pt-1.5 border-t border-[var(--surface-border)]/60">
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-emerald-500 font-bengali select-none">
                  ৳
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customPriceInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomPriceInput(val);
                    if (val) {
                      setSelectedPrice(null);
                    }
                  }}
                  placeholder="অন্যান্য দাম নিজে লিখুন (যেমন: ১৮৫০, ২২০০, ২৭০০...)"
                  className="w-full pl-8 pr-10 py-2 rounded-xl bg-[var(--surface-bg)] border border-[var(--surface-border)] font-bengali text-xs sm:text-sm text-[var(--text-main)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                {customPriceInput && (
                  <button
                    type="button"
                    onClick={() => setCustomPriceInput('')}
                    className="absolute right-2.5 p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-main)] text-xs cursor-pointer"
                    aria-label="মুছে ফেলুন"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Price validation feedback */}
              {customPriceInput.trim() && (
                <div className="text-[11px] font-bengali mt-1.5 flex items-center justify-between px-1">
                  {(() => {
                    const asciiDigits = toAsciiDigits(customPriceInput).replace(/\D/g, '');
                    const parsed = parseInt(asciiDigits, 10);
                    if (Number.isNaN(parsed) || parsed < 500 || parsed > 6000) {
                      return (
                        <span className="text-amber-500 font-medium">
                          ⚠️ সিলিন্ডারের দাম ৫০০ থেকে ৬০০০ টাকার মধ্যে হতে হবে
                        </span>
                      );
                    }
                    return (
                      <span className="text-emerald-500 font-semibold">
                        ✓ নির্ধারিত দাম: ৳ {toBengaliDigits(parsed)}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Citizen Trust Level & Quick Login Upgrade */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--canvas-bg)] border border-[var(--surface-border)] text-xs mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {trustInfo.tier === 'phone' ? '📱' : trustInfo.tier === 'google' ? '🛡️' : '👤'}
            </span>
            <span className="text-[var(--text-sub)]">
              {trustInfo.labelBn} (<span className="font-bold text-emerald-500">{toBengaliDigits(trustInfo.multiplier)}x</span>)
            </span>
          </div>
          {isAnonymous ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal();
              }}
              className="font-bold text-emerald-500 hover:text-emerald-400 hover:underline cursor-pointer"
            >
              লগইন করে দ্বিগুণ করুন ➜
            </button>
          ) : trustInfo.tier !== 'phone' ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal('phone');
              }}
              className="text-[11px] font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer"
            >
              x১.৫ ট্রাস্টে আপগ্রেড ➜
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-500">সর্বোচ্চ বিশ্বস্ততা</span>
          )}
        </div>

        {/* 1-Tap Tactical State Options */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* State: OK */}
          <button
            type="button"
            onClick={() => handleSubmitState('ok')}
            disabled={isSubmitting}
            className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--ok-tint)] border-2 border-[var(--ok-border)] hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40 disabled:opacity-50 select-none"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-lg font-bold shrink-0 group-hover:scale-105 transition-transform">
                ✓
              </span>
              <div>
                <h3 className="font-bengali font-bold text-base sm:text-lg text-[var(--ok-text)] leading-snug">
                  স্বাভাবিক / আছে
                </h3>
                <p className="font-bengali text-xs text-[var(--text-sub)]">
                  নিয়মিত সরবরাহ সচল আছে, কোনো সমস্যা নেই
                </p>
              </div>
            </div>
            <span className="font-bengali text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
              আছে ➜
            </span>
          </button>

          {/* State: LOW */}
          <button
            type="button"
            onClick={() => handleSubmitState('low')}
            disabled={isSubmitting}
            className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--low-tint)] border-2 border-[var(--low-border)] hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/40 disabled:opacity-50 select-none"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-lg font-bold shrink-0 group-hover:scale-105 transition-transform">
                ◐
              </span>
              <div>
                <h3 className="font-bengali font-bold text-base sm:text-lg text-[var(--low-text)] leading-snug">
                  স্বল্প / চাপ কম / সমস্যা
                </h3>
                <p className="font-bengali text-xs text-[var(--text-sub)]">
                  ভোল্টেজ উঠানামা / গ্যাসের চাপ কম / পানি ঘোলা
                </p>
              </div>
            </div>
            <span className="font-bengali text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-2">
              কম ➜
            </span>
          </button>

          {/* State: OUT */}
          <button
            type="button"
            onClick={() => handleSubmitState('out')}
            disabled={isSubmitting}
            className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--out-tint)] border-2 border-[var(--out-border)] hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40 disabled:opacity-50 select-none"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center text-lg font-bold shrink-0 group-hover:scale-105 transition-transform">
                ✕
              </span>
              <div>
                <h3 className="font-bengali font-bold text-base sm:text-lg text-[var(--out-text)] leading-snug">
                  নেই / সম্পূর্ণ বন্ধ
                </h3>
                <p className="font-bengali text-xs text-[var(--text-sub)]">
                  বিদ্যুৎ বিচ্ছিন্ন / পাইপে গ্যাস নেই / পানি বন্ধ
                </p>
              </div>
            </div>
            <span className="font-bengali text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 shrink-0 ml-2">
              নেই ➜
            </span>
          </button>
        </div>

        {/* Bengali Micro Disclaimer */}
        <p className="font-bengali text-[11px] text-[var(--text-tertiary)] text-center mt-3.5">
          নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়
        </p>
      </div>
    </div>
  );
}
