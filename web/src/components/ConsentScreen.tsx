'use client';

import React from 'react';

interface ConsentScreenProps {
  onGrantLocation: () => void;
  onManualSelect: () => void;
  isLoading?: boolean;
}

export function ConsentScreen({
  onGrantLocation,
  onManualSelect,
  isLoading = false,
}: ConsentScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="w-full max-w-md rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] p-6 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Radar / Shield Animation Icon */}
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-3xl">
          <span className="relative z-10" aria-hidden="true">
            📍
          </span>
          <span className="absolute h-full w-full rounded-2xl bg-emerald-500/10 animate-ping opacity-30" />
        </div>

        {/* Title */}
        <h2
          id="consent-title"
          className="font-bengali font-bold text-2xl md:text-3xl text-[var(--text-main)] mb-3 leading-tight"
        >
          আপনার এলাকার খবর জানতে লোকেশন প্রয়োজন
        </h2>

        {/* Privacy Explanation in Bengali */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-2xl p-4 text-left mb-6 text-sm md:text-base font-bengali text-[var(--text-sub)] space-y-2.5">
          <p className="flex items-start gap-2">
            <span className="text-emerald-500 text-lg leading-none shrink-0">✓</span>
            <span>
              আপনার এলাকার বিদ্যুৎ, গ্যাস ও পানির সঠিক লাইভ অবস্থা দেখাতে এবং ভুয়া রিপোর্ট প্রতিরোধ করতে অবস্থান জানা আবশ্যক।
            </span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-emerald-500 text-lg leading-none shrink-0">🛡️</span>
            <span>
              <strong>কঠোর প্রাইভেসি গ্যারান্টি:</strong> আমরা কখনো আপনার সঠিক GPS স্থানাঙ্ক বা ঠিকানা সার্ভারে সংরক্ষণ করি না (ADR-0005)।
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={onGrantLocation}
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bengali font-bold text-lg shadow-lg shadow-emerald-950/20 transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/50 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>অবস্থান শনাক্ত হচ্ছে...</span>
              </span>
            ) : (
              <span>লোকেশন অনুমতি দিন</span>
            )}
          </button>

          <button
            type="button"
            onClick={onManualSelect}
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-border)]/50 active:bg-[var(--surface-border)] text-[var(--text-main)] font-bengali font-semibold text-base transition-colors border border-[var(--surface-border)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            নিজে এলাকা বেছে নিন (ম্যানুয়াল)
          </button>
        </div>
      </div>
    </div>
  );
}
