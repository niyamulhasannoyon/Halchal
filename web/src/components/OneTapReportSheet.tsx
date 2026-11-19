'use client';

import React, { useState, useEffect } from 'react';
import { UtilityCategory, UserReportState, UTILITY_CATEGORIES } from '@/lib/theme';
import { getOrCreateDeviceId } from '@/lib/device';
import { enqueueReport, SubmitReportPayload } from '@/lib/offline-queue';
import { markSuccessfulReportSubmitted } from '@/lib/pwa';
import { toBengaliDigits } from '@/lib/bengali-utils';

interface OneTapReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  areaName: string;
  defaultLat: number;
  defaultLng: number;
  onOptimisticReport: (
    category: UtilityCategory,
    state: UserReportState,
    price?: number | null
  ) => void;
  onReportSuccess?: (message: string) => void;
}

const LPG_PRICE_CHIPS = [1400, 1450, 1500, 1550, 1600];

export function OneTapReportSheet({
  isOpen,
  onClose,
  areaName,
  defaultLat,
  defaultLng,
  onOptimisticReport,
  onReportSuccess,
}: OneTapReportSheetProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCategory, setSelectedCategory] = useState<UtilityCategory | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cached GPS coordinates
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number }>({
    lat: defaultLat,
    lng: defaultLng,
    accuracy: 35,
  });

  // Fetch GPS position once when modal opens
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setSelectedPrice(null);
      setCustomPriceInput('');
      setErrorMessage(null);
      setIsSubmitting(false);
      return;
    }

    setCoords({ lat: defaultLat, lng: defaultLng, accuracy: 35 });

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
  }, [isOpen, defaultLat, defaultLng]);

  if (!isOpen) return null;

  // Step 1: Select Category -> Move to Step 2
  const handleSelectCategory = (cat: UtilityCategory) => {
    setSelectedCategory(cat);
    setErrorMessage(null);
    setStep(2);
  };

  // Step 2: Select State & Submit
  const handleSubmitState = async (state: UserReportState) => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    let price: number | null = null;
    if (selectedCategory === 'lpg') {
      if (customPriceInput) {
        const parsed = parseInt(customPriceInput, 10);
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
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        markSuccessfulReportSubmitted();
        setIsSubmitting(false);
        onReportSuccess?.('আপনার রিপোর্ট সফলভাবে গ্রহণ করা হয়েছে!');
        onClose();
      } else {
        // Bengali error mapping from API or error codes
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-sheet-title"
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] shadow-2xl flex flex-col p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)] mb-4">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-1.5 -ml-2 rounded-xl text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer text-lg"
                aria-label="পূর্ববর্তী ধাপে যান"
              >
                ←
              </button>
            )}
            <div>
              <h2
                id="report-sheet-title"
                className="font-bengali font-bold text-xl text-[var(--text-main)] flex items-center gap-2"
              >
                <span>📢</span>
                <span>
                  {step === 1 ? 'কিসের অবস্থা জানাবেন?' : `${UTILITY_CATEGORIES[selectedCategory!].nameBn}র অবস্থা কী?`}
                </span>
              </h2>
              <p className="font-bengali text-xs text-[var(--text-sub)]">
                📍 {areaName} এলাকা
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer text-lg"
            aria-label="বন্ধ করুন"
          >
            ✕
          </button>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 font-bengali text-sm flex items-start gap-2.5 animate-in fade-in"
          >
            <span className="text-base shrink-0">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Category Selection (Tap 1) */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {/* Electricity */}
            <button
              type="button"
              onClick={() => handleSelectCategory('electricity')}
              className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[var(--surface-elevated)] hover:bg-amber-500/10 border border-[var(--surface-border)] hover:border-amber-500/50 transition-all cursor-pointer group active:scale-[0.98] min-h-[120px]"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                ⚡
              </span>
              <span className="font-bengali font-bold text-lg text-[var(--text-main)]">
                বিদ্যুৎ
              </span>
              <span className="font-bengali text-xs text-[var(--text-sub)] mt-0.5">
                কারেন্ট / ভোল্টেজ
              </span>
            </button>

            {/* Gas */}
            <button
              type="button"
              onClick={() => handleSelectCategory('gas')}
              className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[var(--surface-elevated)] hover:bg-orange-500/10 border border-[var(--surface-border)] hover:border-orange-500/50 transition-all cursor-pointer group active:scale-[0.98] min-h-[120px]"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                🔥
              </span>
              <span className="font-bengali font-bold text-lg text-[var(--text-main)]">
                গ্যাস
              </span>
              <span className="font-bengali text-xs text-[var(--text-sub)] mt-0.5">
                চাপ / পাইপলাইন
              </span>
            </button>

            {/* Water */}
            <button
              type="button"
              onClick={() => handleSelectCategory('water')}
              className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[var(--surface-elevated)] hover:bg-blue-500/10 border border-[var(--surface-border)] hover:border-blue-500/50 transition-all cursor-pointer group active:scale-[0.98] min-h-[120px]"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                💧
              </span>
              <span className="font-bengali font-bold text-lg text-[var(--text-main)]">
                পানি
              </span>
              <span className="font-bengali text-xs text-[var(--text-sub)] mt-0.5">
                ওয়াসা সরবরাহ
              </span>
            </button>

            {/* LPG */}
            <button
              type="button"
              onClick={() => handleSelectCategory('lpg')}
              className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[var(--surface-elevated)] hover:bg-emerald-500/10 border border-[var(--surface-border)] hover:border-emerald-500/50 transition-all cursor-pointer group active:scale-[0.98] min-h-[120px]"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                🛢️
              </span>
              <span className="font-bengali font-bold text-lg text-[var(--text-main)]">
                এলপিজি
              </span>
              <span className="font-bengali text-xs text-[var(--text-sub)] mt-0.5">
                ১২ কেজি সিলিন্ডার
              </span>
            </button>
          </div>
        )}

        {/* Step 2: State Selection (Tap 2) */}
        {step === 2 && selectedCategory && (
          <div className="space-y-4">
            {/* Optional LPG Price Selection */}
            {selectedCategory === 'lpg' && (
              <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2">
                <span className="font-bengali text-xs text-[var(--text-sub)] block">
                  ১২ কেজি সিলিন্ডারের দাম কত দিয়ে কিনেছেন? (ঐচ্ছিক)
                </span>
                <div className="flex flex-wrap gap-2">
                  {LPG_PRICE_CHIPS.map((price) => {
                    const isSelected = selectedPrice === price && !customPriceInput;
                    return (
                      <button
                        key={price}
                        type="button"
                        onClick={() => {
                          setSelectedPrice(price);
                          setCustomPriceInput('');
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bengali text-sm font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-[var(--surface-bg)] text-[var(--text-main)] border-[var(--surface-border)] hover:border-emerald-500'
                        }`}
                      >
                        ৳ {toBengaliDigits(price)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* The 3 Tactical State Buttons */}
            <div className="grid grid-cols-1 gap-3">
              {/* State: OK */}
              <button
                type="button"
                onClick={() => handleSubmitState('ok')}
                disabled={isSubmitting}
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ok-tint)] border-2 border-[var(--ok-border)] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40 disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                    ✓
                  </span>
                  <div>
                    <h3 className="font-bengali font-bold text-lg text-[var(--ok-text)]">
                      স্বাভাবিক / আছে
                    </h3>
                    <p className="font-bengali text-xs text-[var(--text-sub)]">
                      নিয়মিত সরবরাহ চলছে, কোনো সমস্যা নেই
                    </p>
                  </div>
                </div>
                <span className="font-bengali text-sm font-bold text-emerald-500">
                  আছে ➜
                </span>
              </button>

              {/* State: LOW */}
              <button
                type="button"
                onClick={() => handleSubmitState('low')}
                disabled={isSubmitting}
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--low-tint)] border-2 border-[var(--low-border)] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/40 disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-xl shrink-0">
                    ◐
                  </span>
                  <div>
                    <h3 className="font-bengali font-bold text-lg text-[var(--low-text)]">
                      স্বল্প / চাপ কম / সমস্যা
                    </h3>
                    <p className="font-bengali text-xs text-[var(--text-sub)]">
                      ভোল্টেজ উঠানামা / গ্যাসের চাপ খুব কম
                    </p>
                  </div>
                </div>
                <span className="font-bengali text-sm font-bold text-amber-500">
                  কম ➜
                </span>
              </button>

              {/* State: OUT */}
              <button
                type="button"
                onClick={() => handleSubmitState('out')}
                disabled={isSubmitting}
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--out-tint)] border-2 border-[var(--out-border)] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40 disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center text-xl shrink-0">
                    ✕
                  </span>
                  <div>
                    <h3 className="font-bengali font-bold text-lg text-[var(--out-text)]">
                      নেই / সম্পূর্ণ বন্ধ
                    </h3>
                    <p className="font-bengali text-xs text-[var(--text-sub)]">
                      বিদ্যুৎ বিচ্ছিন্ন / পাইপে গ্যাস নেই / পানি বন্ধ
                    </p>
                  </div>
                </div>
                <span className="font-bengali text-sm font-bold text-red-500">
                  নেই ➜
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer in Bengali */}
        <p className="font-bengali text-[11px] text-[var(--text-muted)] text-center mt-4">
          নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয় (CLAUDE.md)
        </p>
      </div>
    </div>
  );
}
