'use client';

import React, { useState, useEffect } from 'react';
import {
  isPushSupported,
  isUserPushSubscribed,
  subscribeToPush,
} from '@/lib/push';
import { Bell, ShieldCheck, Moon, X, Check } from 'lucide-react';

const PUSH_PROMPT_DISMISSED_KEY = 'halchal_push_prompt_dismissed';

export function PushNotificationOptInModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if eligible to show:
    // 1. Push is supported in browser
    // 2. User hasn't subscribed already
    // 3. User hasn't dismissed the prompt
    // 4. User has completed at least one successful report
    const checkEligibility = () => {
      if (typeof window === 'undefined') return;
      if (!isPushSupported()) return;
      if (isUserPushSubscribed()) return;
      if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
      if (localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY) === 'true') return;

      const hasReported = localStorage.getItem('halchal_has_successfully_reported') === 'true';
      if (hasReported) {
        setIsOpen(true);
      }
    };

    // Listen for custom event triggered immediately upon successful report submission
    const handleEligibleEvent = () => {
      checkEligibility();
    };

    window.addEventListener('halchal:eligible_for_pwa_install', handleEligibleEvent);
    // Also check on mount if they reported previously in this session
    checkEligibility();

    return () => {
      window.removeEventListener('halchal:eligible_for_pwa_install', handleEligibleEvent);
    };
  }, []);

  if (!isOpen) return null;

  const handleDismiss = () => {
    localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, 'true');
    setIsOpen(false);
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await subscribeToPush();

    if (result.success) {
      setIsLoading(false);
      setIsOpen(false);
    } else {
      setIsLoading(false);
      setErrorMessage(result.error || 'অনুমতি পাওয়া যায়নি');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl text-text-primary">
        <button
          onClick={handleDismiss}
          aria-label="বন্ধ করুন"
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-medium text-emerald-500 tracking-wide uppercase">
              জরুরি সতর্কবার্তা
            </span>
            <h2 id="push-modal-title" className="text-lg font-bold leading-tight">
              এলাকার লাইভ আপডেট চান?
            </h2>
          </div>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          আপনার এলাকায় কারেন্ট, গ্যাস বা পানির সংযোগ বিচ্ছিন্ন হলে কিংবা ফিরে আসলে সাথে সাথে
          নোটিফিকেশন পাবেন।
        </p>

        <div className="space-y-2.5 mb-6 text-xs text-text-muted bg-canvas p-3.5 rounded-xl border border-surface-border">
          <div className="flex items-start gap-2.5">
            <Moon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <strong>শান্ত সময়:</strong> রাত ১১:০০ থেকে সকাল ০৬:০০ পর্যন্ত কোনো সাধারণ নোটিফিকেশন আসবে না।
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>স্প্যাম-মুক্ত গ্যারান্টি:</strong> দিনে সর্বোচ্চ ৩টি বার্তা, অপ্রয়োজনীয় নোটিফিকেশন নেই।
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
          >
            {isLoading ? (
              <span>সংযোগ হচ্ছে...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>হ্যাঁ, নোটিফিকেশন চালু করুন</span>
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isLoading}
            className="w-full py-2.5 px-4 text-text-muted hover:text-text-primary text-sm font-medium rounded-xl transition-colors"
          >
            এখন নয়
          </button>
        </div>
      </div>
    </div>
  );
}
