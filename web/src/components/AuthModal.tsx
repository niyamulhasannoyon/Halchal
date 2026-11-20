'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  Shield,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowRight,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { toBengaliDigits, toAsciiDigits } from '@/lib/bengali-utils';

export function AuthModal() {
  const {
    user,
    trustInfo,
    isAnonymous,
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    signInWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    sendEmailOtp,
    verifyEmailOtp,
    signOut,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'phone' | 'google' | 'email'>('phone');
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

  // Initialize modal state on open
  useEffect(() => {
    if (isAuthModalOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(false);
      if (authModalMode === 'phone') {
        setActiveTab('phone');
      } else {
        setActiveTab('google');
      }
    }
  }, [isAuthModalOpen, authModalMode]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isAuthModalOpen) return null;

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMsg(error.message || 'গুগল লগইন শুরু করতে সমস্যা হয়েছে।');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMsg('লগইন প্রক্রিয়ায় ত্রুটি হয়েছে। আবার চেষ্টা করুন।');
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
      setSuccessMsg('মোবাইল নম্বর সফলভাবে যাচাই হয়েছে! ট্রাস্ট স্কোর দ্বিগুণ (x১.৫) হয়েছে।');
      setTimeout(() => {
        closeAuthModal();
      }, 1500);
    } else {
      setErrorMsg(res.error || 'ভুল বা মেয়াদোত্তীর্ণ ওটিপি কোড।');
    }
  };

  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await sendEmailOtp(email);
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
      setSuccessMsg('ইমেইল সফলভাবে যাচাই হয়েছে!');
      setTimeout(() => {
        closeAuthModal();
      }, 1500);
    } else {
      setErrorMsg(res.error || 'ভুল বা মেয়াদোত্তীর্ণ কোড।');
    }
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      await signOut();
      setSuccessMsg('সফলভাবে লগআউট করা হয়েছে।');
      setTimeout(() => {
        closeAuthModal();
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--surface-bg)] text-[var(--text-main)] border border-[var(--surface-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--surface-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="font-bold text-base leading-snug">
                {isAnonymous ? 'নাগরিক একাউন্ট ও ট্রাস্ট' : 'নাগরিক প্রোফাইল'}
              </h2>
              <p className="text-xs text-[var(--text-sub)]">
                {isAnonymous ? 'লগইন করে রিপোর্টের গ্রহণযোগ্যতা বাড়ান' : 'আপনার হালচাল নাগরিক পরিচয়'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-2 rounded-xl text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)] transition-colors"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Trust Tiers Explanatory Ribbon */}
          <div className="p-3.5 rounded-2xl bg-[var(--canvas-bg)] border border-[var(--surface-border)] space-y-2">
            <div className="text-[11px] font-semibold text-[var(--text-sub)] flex items-center justify-between">
              <span>নাগরিক ট্রাস্ট লেভেল ও গ্রহণযোগ্যতা:</span>
              <span className="text-emerald-500 font-bold">
                বর্তমান: {toBengaliDigits(trustInfo.multiplier)}x
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              <div
                className={`p-2 rounded-xl border transition-all ${
                  trustInfo.tier === 'anonymous'
                    ? 'border-zinc-500 bg-zinc-500/10 font-bold text-[var(--text-main)]'
                    : 'border-transparent text-[var(--text-sub)] opacity-70'
                }`}
              >
                <div className="text-sm">👤</div>
                <div className="text-[11px] mt-0.5">বেনামী</div>
                <div className="text-[10px] font-mono text-[var(--text-sub)]">x০.৫</div>
              </div>
              <div
                className={`p-2 rounded-xl border transition-all ${
                  trustInfo.tier === 'google'
                    ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-500'
                    : 'border-transparent text-[var(--text-sub)] opacity-70'
                }`}
              >
                <div className="text-sm">🛡️</div>
                <div className="text-[11px] mt-0.5">গুগল</div>
                <div className="text-[10px] font-mono text-emerald-500">x১.০</div>
              </div>
              <div
                className={`p-2 rounded-xl border transition-all ${
                  trustInfo.tier === 'phone'
                    ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-500'
                    : 'border-transparent text-[var(--text-sub)] opacity-70'
                }`}
              >
                <div className="text-sm">📱</div>
                <div className="text-[11px] mt-0.5">মোবাইল OTP</div>
                <div className="text-[10px] font-mono text-amber-500">x১.৫</div>
              </div>
            </div>
          </div>

          {/* Feedback Alerts */}
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

          {/* If already logged in with a permanent account */}
          {!isAnonymous && user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--canvas-bg)] border border-[var(--surface-border)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-emerald-500">
                      {trustInfo.labelBn} (x{toBengaliDigits(trustInfo.multiplier)})
                    </p>
                    <p className="text-sm font-bold text-[var(--text-main)] truncate mt-0.5">
                      {user.phone || user.email || 'নাগরিক প্রোফাইল'}
                    </p>
                  </div>
                </div>
              </div>

              {/* If user is Google-verified but hasn't verified phone, encourage 1.5x upgrade */}
              {trustInfo.tier !== 'phone' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                    <Smartphone className="w-4 h-4" />
                    <span>সর্বোচ্চ বিশ্বস্ততা (x১.৫) চান?</span>
                  </div>
                  <p className="text-xs text-[var(--text-sub)]">
                    আপনার মোবাইল নম্বর ওটিপি দিয়ে যাচাই করলে আপনার রিপোর্ট সর্বোচ্চ গুরুত্ব পাবে।
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('phone')}
                    className="w-full mt-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>মোবাইল নম্বর যুক্ত করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Sign out */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{isSubmitting ? 'লগআউট হচ্ছে...' : 'লগআউট করুন'}</span>
              </button>
            </div>
          ) : (
            /* Authentication Tabs for Anonymous / New Users */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-[var(--canvas-bg)] p-1 border border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('google');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'google'
                      ? 'bg-[var(--surface-bg)] text-[var(--text-main)] shadow-xs'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span>গুগল</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('phone');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
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
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'email'
                      ? 'bg-[var(--surface-bg)] text-[var(--text-main)] shadow-xs'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>ইমেইল</span>
                </button>
              </div>

              {/* Google Tab */}
              {activeTab === 'google' && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-[var(--text-sub)] text-center">
                    এক ক্লিকে গুগল দিয়ে প্রবেশ করুন। আপনার রিপোর্টের গ্রহণযোগ্যতা দ্বিগুণ হবে।
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] hover:bg-[var(--surface-border)] font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-xs"
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

              {/* Phone OTP Tab */}
              {activeTab === 'phone' && (
                <div className="space-y-3.5 pt-1">
                  {!isOtpSent ? (
                    <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                      <div>
                        <label
                          htmlFor="auth-phone-input"
                          className="block text-xs font-semibold text-[var(--text-sub)] mb-1.5"
                        >
                          বাংলাদেশি মোবাইল নম্বর
                        </label>
                        <div className="relative flex items-center rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] focus-within:border-emerald-500 overflow-hidden">
                          <span className="px-3 text-xs font-bold text-[var(--text-sub)] border-r border-[var(--surface-border)] select-none">
                            🇧🇩 +৮৮০
                          </span>
                          <input
                            id="auth-phone-input"
                            type="tel"
                            placeholder="017XXXXXXXX"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full py-2.5 px-3 bg-transparent text-sm font-semibold outline-hidden placeholder:text-[var(--text-sub)]"
                            required
                          />
                        </div>
                        <p className="text-[11px] text-[var(--text-sub)] mt-1.5">
                          ইংরেজি বা বাংলা সংখ্যায় নম্বর লিখুন (যেমন: 01712345678 বা ০১৭১২৩৪৫৬৭৮)
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !phoneNumber}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
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
                    /* Step 2: Enter OTP */
                    <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="auth-otp-input"
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
                            className="text-[11px] text-emerald-500 hover:underline"
                          >
                            নম্বর পরিবর্তন
                          </button>
                        </div>
                        <input
                          id="auth-otp-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="123456"
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value)}
                          className="w-full py-3 px-4 text-center tracking-widest text-lg font-mono font-bold rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] focus:border-emerald-500 outline-hidden"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || phoneOtp.length < 6}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                      >
                        {isSubmitting ? 'যাচাই করা হচ্ছে...' : 'ওটিপি যাচাই ও লগইন সম্পন্ন করুন'}
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
                            className="text-xs font-semibold text-emerald-500 hover:underline"
                          >
                            আবার ওটিপি কোড পাঠান
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Email Tab */}
              {activeTab === 'email' && (
                <div className="space-y-3.5 pt-1">
                  {!isEmailSent ? (
                    <form onSubmit={handleSendEmailOtp} className="space-y-3">
                      <div>
                        <label
                          htmlFor="auth-email-input"
                          className="block text-xs font-semibold text-[var(--text-sub)] mb-1.5"
                        >
                          আপনার ইমেইল ঠিকানা
                        </label>
                        <input
                          id="auth-email-input"
                          type="email"
                          placeholder="example@gmail.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full py-2.5 px-3.5 rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] focus:border-emerald-500 outline-hidden text-sm font-semibold"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !email}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                      >
                        {isSubmitting ? 'পাঠানো হচ্ছে...' : 'লগইন কোড পাঠান'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyEmailOtp} className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="auth-email-otp"
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
                            className="text-[11px] text-emerald-500 hover:underline"
                          >
                            ইমেইল পরিবর্তন
                          </button>
                        </div>
                        <input
                          id="auth-email-otp"
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value)}
                          className="w-full py-3 px-4 text-center tracking-widest text-lg font-mono font-bold rounded-2xl border border-[var(--surface-border)] bg-[var(--canvas-bg)] focus:border-emerald-500 outline-hidden"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || emailOtp.length < 6}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                      >
                        {isSubmitting ? 'যাচাই করা হচ্ছে...' : 'লগইন সম্পন্ন করুন'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
