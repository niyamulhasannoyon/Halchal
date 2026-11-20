'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck, ShieldAlert, Loader2, ArrowRight, LogOut, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface MfaEnrollData {
  id: string;
  type: string;
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export default function MfaPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [isEnrolled, setIsEnrolled] = React.useState(false);
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [enrollData, setEnrollData] = React.useState<MfaEnrollData | null>(null);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Check MFA status on mount
  React.useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch('/api/auth/mfa/status');
        if (!res.ok) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        if (data.currentLevel === 'aal2') {
          router.push('/');
          return;
        }

        setIsEnrolled(data.isEnrolled);
        setFactorId(data.factorId);

        // If not enrolled, trigger enrollment flow
        if (!data.isEnrolled) {
          const enrollRes = await fetch('/api/auth/mfa/enroll', { method: 'POST' });
          const enrollJson = await enrollRes.json();
          if (enrollRes.ok) {
            setEnrollData(enrollJson);
            setFactorId(enrollJson.id);
          } else {
            setError(enrollJson.error || 'Failed to initialize MFA enrollment.');
          }
        }
      } catch {
        setError('Error establishing connection with MFA service.');
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed. Please check the code.');
        setSubmitting(false);
        return;
      }

      router.push(data.redirect || '/');
    } catch {
      setError('An error occurred during verification.');
      setSubmitting(false);
    }
  };

  const copySecret = () => {
    if (enrollData?.totp.secret) {
      navigator.clipboard.writeText(enrollData.totp.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm">Verifying Authenticator Assurance Level...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = '/auth/logout')}
          title="Sign out"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          Sign Out
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 mb-3 border border-blue-500/20">
            {isEnrolled ? <ShieldCheck className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isEnrolled ? 'Two-Factor Authentication' : 'Setup Authenticator App'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            ম্যান্ডেটরি সিকিউরিটি ভেরিফিকেশন (AAL2)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEnrolled ? 'Enter Verification Code' : 'Scan Authenticator QR'}</CardTitle>
            <CardDescription>
              {isEnrolled
                ? 'Open Google Authenticator, 1Password, or Authy on your mobile device and enter your 6-digit code.'
                : 'Scan the QR code below using your preferred TOTP Authenticator application.'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleVerify}>
            <CardContent className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-2"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!isEnrolled && enrollData && (
                <div className="space-y-3">
                  <div className="p-4 bg-white rounded-lg border border-zinc-200 dark:border-zinc-700 flex justify-center">
                    {/* Render QR Code SVG directly */}
                    <img
                      src={enrollData.totp.qr_code}
                      alt="TOTP Enrollment QR Code"
                      className="w-48 h-48"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-medium">Manual Setup Key:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-zinc-100 dark:bg-zinc-800 p-2 rounded border border-zinc-200 dark:border-zinc-700 flex-1 break-all select-all font-mono">
                        {enrollData.totp.secret}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copySecret}
                        title="Copy Key"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="totp-code">
                  6-Digit Authenticator Code
                </label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.3em] font-mono"
                  disabled={submitting}
                />
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || code.length !== 6}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating TOTP...
                  </>
                ) : (
                  <>
                    {isEnrolled ? 'Verify & Continue' : 'Confirm & Complete Enrollment'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-zinc-500">
                AAL2 sessions are strictly required for administrative operations.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
