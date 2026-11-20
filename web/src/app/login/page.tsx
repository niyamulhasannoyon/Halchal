'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { toBengaliDigits, toAsciiDigits } from '@/lib/bengali-utils';
import Link from 'next/link';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetRedirect = searchParams.get('next') || searchParams.get('redirect') || '/';

  const {
    user,
    trustInfo,
    isAnonymous,
    signInWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    sendEmailOtp,
    verifyEmailOtp,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'google' | 'phone' | 'email'>('google');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in with permanent identity, redirect back
  useEffect(() => {
    if (!isAnonymous && user) {
      router.replace(targetRedirect);
    }
  }, [user, isAnonymous, router, targetRedirect]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await signInWithGoogle(
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetRedirect)}`
          : undefined
      );
      if (error) {
        setErrorMsg(error.message || 'গুগল লগইন শুরু করতে সমস্যা হয়েছে।');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMsg('লগইন প্রক্রিয়ায় ত্রুটি হয়েছে।');
      setIsSubmitting(false);
    }
  };

  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await sendPhoneOtp(phoneNumber);
    setIsSubmitting(false);

    if (res.success) {
      setIsOtpSent(true);
      setCountdown(60);
      setSuccessMsg('আপনার মোবাইলে ৬ ডিজিটের যাচাইকরণ কোড পাঠানো হয়েছে।');
    } else {
      setErrorMsg(res.error || 'ওটিপি কোড পাঠানো ব্যর্থ হয়েছে।');
    }
  };

  const handleVerifyPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const asciiOtp = toAsciiDigits(phoneOtp);
    const res = await verifyPhoneOtp(phoneNumber, asciiOtp);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('লগইন সফল হয়েছে!');
      setTimeout(() => {
        router.replace(targetRedirect);
      }, 1000);
    } else {
      setErrorMsg(res.error || 'ভুল বা মেয়াদোত্তীর্ণ ওটিপি কোড।');
    }
  };

  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await sendEmailOtp(
      email,
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetRedirect)}`
        : undefined
    );
    setIsSubmitting(false);

    if (res.success) {
      setIsEmailSent(true);
      setSuccessMsg('আপনার ইমেইলে যাচাইকরণ ওটিপি / লগইন লিঙ্ক পাঠানো হয়েছে।');
    } else {
      setErrorMsg(res.error || 'ইমেইল পাঠানো ব্যর্থ হয়েছে।');
    }
  };

  const handleVerifyEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const asciiOtp = toAsciiDigits(emailOtp);
    const res = await verifyEmailOtp(email, asciiOtp);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('ইমেইল যাচাই সফল হয়েছে!');
      setTimeout(() => {
        router.replace(targetRedirect);
      }, 1000);
    } else {
      setErrorMsg(res.error || 'ভুল বা মেয়াদোত্তীর্ণ কোড।');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header & Brand */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-sub)] hover:text-[var(--text-main)] mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>হালচালে ফিরে যান</span>
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-main)]">নাগরিক পরিচয় ও লগইন</h1>
          <p className="text-xs text-[var(--text-sub)]">
            এলাকার ইউটিলিটি সমস্যা নিরসনে আপনার রিপোর্টের বিশ্বস্ততা নিশ্চিত করুন
          </p>
        </div>

        {/* Trust Multipliers Infographic */}
        <div className="p-3.5 rounded-2xl bg-[var(--canvas-bg)] border border-[var(--surface-border)]">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-[var(--surface-bg)] border border-[var(--surface-border)]">
              <span className="text-base block">👤</span>
              <span className="text-[11px] font-semibold block text-[var(--text-sub)]">বেনামী</span>
              <span className="text-[10px] font-mono text-[var(--text-sub)]">x০.৫ ট্রাস্ট</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <span className="text-base block">🛡️</span>
              <span className="text-[11px] font-bold block">গুগল</span>
              <span className="text-[10px] font-mono font-bold">x১.০ ট্রাস্ট</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <span className="text-base block">📱</span>
              <span className="text-[11px] font-bold block">মোবাইল OTP</span>
              <span className="text-[10px] font-mono font-bold">x১.৫ ট্রাস্ট</span>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex rounded-xl bg-[var(--canvas-bg)] p-1 border border-[var(--surface-border)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('google');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'google'
                ? 'bg-[var(--surface-bg)] text-[var(--text-main)] shadow-xs'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            গুগল
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('phone');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'phone'
                ? 'bg-[var(--surface-bg)] text-[var(--text-main)] shadow-xs'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>মোবাইল OTP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('email');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'email'
                ? 'bg-[var(--surface-bg)] text-[var(--text-main)] shadow-xs'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>ইমেইল</span>
          </button>
        </div>

        {/* Google Login Form */}
        {activeTab === 'google' && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-[var(--text-sub)] text-center">
              আপনার গুগল অ্যাকাউন্টের মাধ্যমে নিরাপদে সাইন ইন করুন।
            </p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] hover:bg-[var(--surface-border)] font-bold text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>{isSubmitting ? 'সংযোগ করা হচ্ছে...' : 'গুগল দিয়ে প্রবেশ করুন (১.০x)'}</span>
            </button>
          </div>
        )}

        {/* Mobile Phone OTP Form */}
        {activeTab === 'phone' && (
          <div className="space-y-4 pt-1">
            {!isOtpSent ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-phone-input"
                    className="block text-xs font-semibold text-[var(--text-sub)] mb-1.5"
                  >
                    বাংলাদেশি মোবাইল নম্বর
                  </label>
                  <div className="relative flex items-center rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] focus-within:border-emerald-500 overflow-hidden">
                    <span className="px-3.5 text-xs font-bold text-[var(--text-sub)] border-r border-[var(--surface-border)] select-none">
                      🇧🇩 +৮৮০
                    </span>
                    <input
                      id="login-phone-input"
                      type="tel"
                      placeholder="017XXXXXXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full py-3 px-3 bg-transparent text-sm font-semibold outline-hidden placeholder:text-[var(--text-sub)]"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-sub)] mt-1.5">
                    বাংলা বা ইংরেজি সংখ্যায় নম্বর টাইপ করুন
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !phoneNumber}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>ওটিপি পাঠানো হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <span>ওটিপি কোড পাঠান (x১.৫ ট্রাস্ট)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-otp-input"
                      className="text-xs font-semibold text-[var(--text-sub)]"
                    >
                      ৬ ডিজিটের ওটিপি কোড
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpSent(false);
                        setPhoneOtp('');
                      }}
                      className="text-[11px] text-emerald-500 hover:underline cursor-pointer"
                    >
                      নম্বর পরিবর্তন
                    </button>
                  </div>
                  <input
                    id="login-otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    className="w-full py-3.5 px-4 text-center tracking-widest text-lg font-mono font-bold rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] focus:border-emerald-500 outline-hidden"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || phoneOtp.length < 6}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'যাচাই করা হচ্ছে...' : 'ওটিপি যাচাই সম্পন্ন করুন'}
                </button>

                <div className="text-center pt-1">
                  {countdown > 0 ? (
                    <span className="text-xs text-[var(--text-sub)]">
                      পুনরায় কোড পাঠানোর সময়: {toBengaliDigits(countdown)} সেকেন্ড
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendPhoneOtp()}
                      disabled={isSubmitting}
                      className="text-xs font-semibold text-emerald-500 hover:underline cursor-pointer"
                    >
                      আবার ওটিপি কোড পাঠান
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Email OTP Form */}
        {activeTab === 'email' && (
          <div className="space-y-4 pt-1">
            {!isEmailSent ? (
              <form onSubmit={handleSendEmailOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email-input"
                    className="block text-xs font-semibold text-[var(--text-sub)] mb-1.5"
                  >
                    আপনার ইমেইল ঠিকানা
                  </label>
                  <input
                    id="login-email-input"
                    type="email"
                    placeholder="citizen@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-3 px-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] focus:border-emerald-500 outline-hidden text-sm font-semibold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'পাঠানো হচ্ছে...' : 'লগইন কোড পাঠান'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-email-otp"
                      className="text-xs font-semibold text-[var(--text-sub)]"
                    >
                      ইমেইলে প্রাপ্ত ওটিপি কোড
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmailSent(false);
                        setEmailOtp('');
                      }}
                      className="text-[11px] text-emerald-500 hover:underline cursor-pointer"
                    >
                      ইমেইল পরিবর্তন
                    </button>
                  </div>
                  <input
                    id="login-email-otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    className="w-full py-3.5 px-4 text-center tracking-widest text-lg font-mono font-bold rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] focus:border-emerald-500 outline-hidden"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || emailOtp.length < 6}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'যাচাই করা হচ্ছে...' : 'লগইন সম্পন্ন করুন'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--canvas-bg)]">
          <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
