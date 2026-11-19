'use client';

import React, { useState, useEffect } from 'react';
import {
  isPushSupported,
  isUserPushSubscribed,
  getLocalPushSettings,
  saveLocalPushSettings,
  subscribeToPush,
  unsubscribeFromPush,
  PushSettings,
} from '@/lib/push';
import { getStoredHomeZone, getZoneMetadata } from '@/lib/zones';
import { getOrCreateDeviceId } from '@/lib/device';
import { getSupabaseBrowserClient, signInWithGoogle, signOutUser } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { BottomNav } from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Bell,
  Moon,
  Zap,
  Flame,
  Droplets,
  CircleDot,
  Check,
  ArrowLeft,
  Shield,
  Trash2,
  FileText,
  AlertTriangle,
  Mail,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';

const CATEGORY_OPTIONS = [
  { id: 'electricity', label: 'বিদ্যুৎ (কারেন্ট)', icon: Zap, color: 'text-amber-500' },
  { id: 'gas', label: 'গ্যাস', icon: Flame, color: 'text-orange-500' },
  { id: 'water', label: 'পানি', icon: Droplets, color: 'text-blue-500' },
  { id: 'lpg', label: 'এলপিজি সিলিন্ডার', icon: CircleDot, color: 'text-emerald-500' },
];

export default function SettingsPage() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [settings, setSettings] = useState<PushSettings>(getLocalPushSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [homeZoneName, setHomeZoneName] = useState<string>('নির্ধারিত হয়নি');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    setIsSubscribed(isUserPushSubscribed());
    const stored = getLocalPushSettings();
    setSettings(stored);

    const homeH3 = getStoredHomeZone();
    if (homeH3) {
      const meta = getZoneMetadata(homeH3);
      setHomeZoneName(meta?.area_name_bn || 'আপনার এলাকা');
    }

    // Monitor Supabase auth session
    const client = getSupabaseBrowserClient();
    client.auth.getUser().then(({ data }) => {
      if (data?.user && !data.user.is_anonymous) {
        setCurrentUser(data.user);
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !session.user.is_anonymous) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setFeedbackMessage(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setFeedbackMessage('গুগল লগইন শুরু করতে সমস্যা হয়েছে: ' + error.message);
        setIsAuthLoading(false);
      }
    } catch {
      setFeedbackMessage('লগইন ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।');
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthLoading(true);
    setFeedbackMessage(null);
    try {
      await signOutUser();
      setCurrentUser(null);
      setFeedbackMessage('সফলভাবে লগআউট করা হয়েছে।');
    } catch {
      setFeedbackMessage('লগআউট করতে সমস্যা হয়েছে।');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleToggleMasterSubscription = async () => {
    setIsSaving(true);
    setFeedbackMessage(null);

    if (isSubscribed) {
      const ok = await unsubscribeFromPush();
      if (ok) {
        setIsSubscribed(false);
        setFeedbackMessage('নোটিফিকেশন বন্ধ করা হয়েছে।');
      }
    } else {
      const res = await subscribeToPush(settings);
      if (res.success) {
        setIsSubscribed(true);
        setFeedbackMessage('নোটিফিকেশন সফলভাবে চালু করা হয়েছে!');
      } else {
        setFeedbackMessage(res.error || 'অনুমতি দেওয়া হয়নি।');
      }
    }
    setIsSaving(false);
  };

  const handleCategoryToggle = (catId: string) => {
    setSettings((prev) => {
      const exists = prev.categories.includes(catId);
      const updated = exists
        ? prev.categories.filter((c) => c !== catId)
        : [...prev.categories, catId];

      // Keep at least 1 category selected
      if (updated.length === 0) return prev;
      return { ...prev, categories: updated };
    });
  };

  const handleNightAlertsToggle = () => {
    setSettings((prev) => ({
      ...prev,
      allowNightAlerts: !prev.allowNightAlerts,
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setFeedbackMessage(null);

    saveLocalPushSettings(settings);

    try {
      const deviceId = getOrCreateDeviceId();
      await fetch('/api/push/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          categories: settings.categories,
          allow_night_alerts: settings.allowNightAlerts,
          h3_subscriptions: settings.h3Subscriptions,
        }),
      });

      setFeedbackMessage('সেটিংস সফলভাবে সংরক্ষিত হয়েছে।');
    } catch {
      setFeedbackMessage('সেটিংস সংরক্ষণ ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setFeedbackMessage(null);

    try {
      const client = getSupabaseBrowserClient();
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setFeedbackMessage('অ্যাকাউন্ট মোছার জন্য সক্রিয় সেশন পাওয়া যায়নি।');
        setIsDeleting(false);
        setDeleteConfirmOpen(false);
        return;
      }

      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedbackMessage(data.error || 'অ্যাকাউন্ট মোছা সম্ভব হয়নি। আবার চেষ্টা করুন।');
        setIsDeleting(false);
        setDeleteConfirmOpen(false);
        return;
      }

      // Clear local state and browser auth
      await client.auth.signOut();
      localStorage.removeItem('halchal-home-h3');
      localStorage.removeItem('halchal-home-set-at');
      localStorage.removeItem('halchal_push_subscribed');
      localStorage.removeItem('halchal_push_settings');
      localStorage.removeItem('halchal_offline_report_queue');

      setIsSubscribed(false);
      setDeleteConfirmOpen(false);
      setFeedbackMessage('আপনার অ্যাকাউন্ট এবং সকল তথ্য সফলভাবে চিরতরে মুছে ফেলা হয়েছে।');
    } catch {
      setFeedbackMessage('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-surface-border px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
            aria-label="হোমে ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">নোটিফিকেশন ও সেটিংস</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Account & Profile Card */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs">
          {currentUser ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-bold text-sm truncate">
                      {(currentUser.user_metadata?.full_name as string) ||
                        currentUser.email?.split('@')[0] ||
                        'ব্যবহারকারী'}
                    </h2>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      সংযুক্ত
                    </span>
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5">{currentUser.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isAuthLoading}
                className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">হালচাল অ্যাকাউন্ট</h2>
                  <p className="text-xs text-text-muted">
                    আপনার সেটিংস ক্লাউডে সেভ রাখতে গুগল দিয়ে যুক্ত হোন
                  </p>
                </div>
              </div>
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthLoading}
                className="w-full py-2.5 px-4 bg-canvas hover:bg-surface border border-surface-border text-text-primary rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>{isAuthLoading ? 'সংযোগ হচ্ছে...' : 'Google দিয়ে সাইন-ইন করুন'}</span>
              </button>
            </div>
          )}
        </section>

        {/* Master Toggle Card */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  isSubscribed
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base leading-snug">পুশ নোটিফিকেশন</h2>
                <p className="text-xs text-text-muted">
                  {isSubscribed ? 'বর্তমানে চালু রয়েছে' : 'বর্তমানে বন্ধ রয়েছে'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleMasterSubscription}
              disabled={isSaving}
              aria-label={isSubscribed ? 'নোটিফিকেশন বন্ধ করুন' : 'নোটিফিকেশন চালু করুন'}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                isSubscribed ? 'bg-emerald-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isSubscribed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Monitored Area Card */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                পর্যবেক্ষণ এলাকা
              </span>
              <p className="text-base font-bold text-text-primary mt-0.5">{homeZoneName}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              মূল এলাকা
            </span>
          </div>
        </section>

        {/* Subscribed Utility Categories */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h2 className="font-bold text-base">যেসব সেবার সতর্কতা পাবেন</h2>
            <p className="text-xs text-text-muted mt-0.5">
              কোন কোন সেবার সংযোগ বিচ্ছিন্ন বা স্বাভাবিক হলে জানতে চান তা নির্বাচন করুন।
            </p>
          </div>

          <div className="space-y-2.5">
            {CATEGORY_OPTIONS.map((item) => {
              const isChecked = settings.categories.includes(item.id);
              const Icon = item.icon;

              return (
                <label
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-surface-border bg-canvas hover:bg-surface/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-surface ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>

                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCategoryToggle(item.id)}
                    className="w-5 h-5 rounded-md border-zinc-600 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 bg-surface cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        </section>

        {/* Quiet Hours & Night Alerts */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-amber-500">
            <Moon className="w-5 h-5" />
            <h2 className="font-bold text-base text-text-primary">শান্ত সময় (Quiet Hours)</h2>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            ডিফল্টভাবে <strong>রাত ১১:০০ টা থেকে সকাল ০৬:০০ টা</strong> পর্যন্ত সব নোটিফিকেশন বন্ধ
            থাকে, যাতে আপনার ঘুমের ব্যাঘাত না ঘটে।
          </p>

          <label className="flex items-start justify-between p-3.5 rounded-xl border border-surface-border bg-canvas cursor-pointer gap-3">
            <div>
              <span className="text-sm font-medium block">
                শান্ত সময়েও জরুরি সতর্কতা পাঠান
              </span>
              <span className="text-xs text-text-muted block mt-0.5">
                গভীর রাতে বিদ্যুৎ বা গ্যাস চলে গেলে নোটিফিকেশন পাবেন
              </span>
            </div>

            <input
              type="checkbox"
              checked={settings.allowNightAlerts}
              onChange={handleNightAlertsToggle}
              className="w-5 h-5 mt-1 rounded-md border-zinc-600 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 bg-surface cursor-pointer shrink-0"
            />
          </label>
        </section>

        {/* Anti-Spam Guarantee Box */}
        <section className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3 text-xs text-text-muted">
          <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-emerald-400 block font-medium mb-0.5">
              হালচাল স্প্যাম-মুক্ত প্রতিশ্রুতি
            </strong>
            <span>
              একটি এলাকায় ৩০ মিনিটের মধ্যে একাধিকবার নোটিফিকেশন পাঠানো হয় না। দিনে সর্বোচ্চ ৩টির বেশি
              বার্তা কখনোই আপনার ফোনে পৌঁছাবে না।
            </span>
          </div>
        </section>

        {/* Save Settings Button */}
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
        >
          {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}
        </button>

        {/* Legal & Privacy Section */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>আইনি ও গোপনীয়তা (Legal & Privacy)</span>
          </h2>
          <div className="space-y-2">
            <Link
              href="/privacy"
              className="flex items-center justify-between p-3 rounded-xl border border-surface-border bg-canvas hover:bg-surface/50 text-xs font-medium transition-colors"
            >
              <span>গোপনীয়তা নীতি (Privacy Policy)</span>
              <span className="text-text-muted">বিস্তারিত দেখুন &rarr;</span>
            </Link>
            <Link
              href="/terms"
              className="flex items-center justify-between p-3 rounded-xl border border-surface-border bg-canvas hover:bg-surface/50 text-xs font-medium transition-colors"
            >
              <span>ব্যবহারের শর্তাবলী (Terms of Service)</span>
              <span className="text-text-muted">বিস্তারিত দেখুন &rarr;</span>
            </Link>
          </div>
        </section>

        {/* Content Abuse & Report Issue Section */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-bold text-base text-text-primary">রিপোর্ট করুন / সমস্যা জানান</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            কোনো ভুল তথ্য, অপব্যবহার বা ব্যক্তির নাম সংক্রান্ত আপত্তিকর রিপোর্টের বিরুদ্ধে ব্যবস্থা
            নিতে আমাদের অপব্যবহার নিরসন টিম প্রস্তুত রয়েছে।
          </p>
          <a
            href="mailto:takedown@halchal.bd?subject=Content%20Takedown%20/%20Abuse%20Report"
            className="w-full py-3 px-4 rounded-xl border border-surface-border bg-canvas hover:bg-surface/50 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Mail className="w-4 h-4 text-emerald-500" />
            <span>সমস্যা বা অপব্যবহার জানান (takedown@halchal.bd)</span>
          </a>
        </section>

        {/* Account Deletion & Right to Erasure */}
        <section className="bg-surface border border-red-500/20 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-red-500">
            <Trash2 className="w-5 h-5" />
            <h2 className="font-bold text-base text-text-primary">অ্যাকাউন্ট ও সকল তথ্য মুছুন</h2>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            হালচাল থেকে আপনার প্রোফাইল, পুশ নোটিফিকেশন তথ্য এবং পূর্বে প্রদান করা সমস্ত রিপোর্ট
            স্থায়ীভাবে মুছে ফেলতে নিচের বোতামে চাপুন।
          </p>

          {!deleteConfirmOpen ? (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>আমার সমস্ত তথ্য মুছে ফেলুন</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
              <p className="text-xs text-red-300 font-medium">
                আপনি কি নিশ্চিত? এই কাজটি অপরিবর্তনীয় এবং ডাটাবেস থেকে আপনার সব তথ্য চিরতরে মুছে যাবে।
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'মোছা হচ্ছে...' : 'হ্যাঁ, স্থায়ীভাবে মুছুন'}
                </button>
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                  className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors"
                >
                  বাতিল
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
