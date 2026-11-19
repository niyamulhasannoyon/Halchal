'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Listen for auth state change after OAuth callback
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Successful login, forward back to settings
        router.replace('/settings');
      }
    });

    // Also check current session directly in case already exchanged
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setErrorMsg('লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        return;
      }
      if (data.session) {
        router.replace('/settings');
      }
    });

    // Safety timeout to avoid hanging indefinitely if OAuth was aborted
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
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas text-text-primary px-4">
      <div className="max-w-sm w-full p-6 rounded-2xl bg-surface border border-surface-border text-center space-y-4 shadow-lg">
        {errorMsg ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-red-400">লগইন ত্রুটি</h2>
            <p className="text-xs text-text-muted">{errorMsg}</p>
            <button
              onClick={() => router.replace('/settings')}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors"
            >
              সেটিংস-এ ফিরে যান
            </button>
          </>
        ) : (
          <>
            <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
              <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <ShieldCheck className="w-6 h-6 text-emerald-500 absolute" />
            </div>
            <h2 className="text-base font-bold text-text-primary">লগইন যাচাই হচ্ছে...</h2>
            <p className="text-xs text-text-muted">
              আপনার গুগল অ্যাকাউন্টের সাথে হালচাল যুক্ত করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন।
            </p>
          </>
        )}
      </div>
    </div>
  );
}
