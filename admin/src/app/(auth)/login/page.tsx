'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'unauthorized_email') {
      setErrorMessage(
        'অননুমোদিত গুগল অ্যাকাউন্ট: এই অ্যাকাউন্টটির জন্য হালচাল অ্যাডমিন প্যানেলে প্রবেশের অনুমতি নেই।'
      );
    } else if (error) {
      setErrorMessage(`লগইন ব্যর্থ হয়েছে (${error})। অনুগ্রহ করে অনুমোদিত অ্যাকাউন্ট দিয়ে পুনরায় চেষ্টা করুন।`);
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch {
      setErrorMessage('একটি অপ্রত্যাশিত নেটওয়ার্ক ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 mb-3 border border-blue-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Halchal Operations Panel
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            হালচাল অভ্যন্তরীণ প্রশাসন ও নজরদারি পোর্টাল
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Designated Administrator Sign-In</CardTitle>
            <CardDescription>
              Access is strictly restricted to designated administrative Google accounts.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div
                id="auth-error-alert"
                role="alert"
                className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-2"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 text-xs space-y-2 text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                <span>অনুমোদিত অ্যাডমিন অ্যাকাউন্ট (Authorized Accounts):</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                <li>niyamulhasanbd@gmail.com</li>
                <li>niyamulhasan1089@gmail.com</li>
              </ul>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-11 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 font-medium shadow-sm transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-zinc-500" />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Sign In with Google
                </>
              )}
            </Button>
          </CardContent>

          <CardFooter>
            <p className="text-xs text-center w-full text-zinc-500">
              অননুমোদিত প্রবেশ আইনত দণ্ডনীয়। সকল এক্সেস ও আইপি অডিট লগে সংরক্ষিত হয়।
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </main>
      }
    >
      <LoginContent />
    </React.Suspense>
  );
}
