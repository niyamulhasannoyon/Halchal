'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { ShieldCheck, AlertCircle } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const targetRedirect = searchParams.get('next') || searchParams.get('redirect') || '/';

  useEffect(() => {
    const errorParam = searchParams.get('error_description') || searchParams.get('error');
    if (errorParam) {
      setErrorMsg(`লগইন ত্রুটি: ${errorParam}`);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    // 1. Listen for auth state change after OAuth callback
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace(targetRedirect);
      }
    });

    // 2. Also check current session directly in case already exchanged
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setErrorMsg('লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        return;
      }
      if (data.session) {
        router.replace(targetRedirect);
      }
    });

    // 3. Safety timeout to avoid hanging indefinitely if OAuth was aborted
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          setErrorMsg('লগইন প্রক্রিয়া সময়সীমা উত্তীর্ণ হয়েছে।');
        }
      });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, searchParams, targetRedirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--canvas-bg)] text-[var(--text-main)] px-4">
      <div className="max-w-sm w-full p-6 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] text-center space-y-4 shadow-xl">
        {errorMsg ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-red-500">লগইন ত্রুটি</h2>
            <p className="text-xs text-[var(--text-sub)]">{errorMsg}</p>
            <button
              onClick={() => router.replace('/')}
              className="w-full py-2.5 px-4 bg-[var(--surface-elevated)] hover:bg-[var(--surface-border)] text-[var(--text-main)] rounded-xl text-xs font-semibold transition-colors"
            >
              হোমে ফিরে যান
            </button>
          </>
        ) : (
          <>
            <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
              <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <ShieldCheck className="w-6 h-6 text-emerald-500 absolute" />
            </div>
            <h2 className="text-base font-bold text-[var(--text-main)]">নাগরিক পরিচয় যাচাই হচ্ছে...</h2>
            <p className="text-xs text-[var(--text-sub)]">
              আপনার অ্যাকাউন্টের সাথে হালচাল যুক্ত করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন।
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--canvas-bg)]">
          <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
