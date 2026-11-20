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
import { getStoredHomeZone, getZoneMetadata, setStoredHomeZone, SeedZone } from '@/lib/zones';
import { getOrCreateDeviceId } from '@/lib/device';
import { getSupabaseBrowserClient, signInWithGoogle, signOutUser } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { BottomNav } from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AreaPickerModal } from '@/components/AreaPickerModal';
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
  AlertCircle,
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
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [homeZoneName, setHomeZoneName] = useState<string>('নির্ধারিত হয়নি');
  const [currentHomeH3, setCurrentHomeH3] = useState<string>('');
  const [isAreaPickerOpen, setIsAreaPickerOpen] = useState(false);

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
      setCurrentHomeH3(homeH3);
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

  const handleZoneSelected = (zone: SeedZone) => {
    setCurrentHomeH3(zone.h3_index);
    setHomeZoneName(zone.area_name_bn);
    setStoredHomeZone(zone.h3_index);
    setSettings((prev) => ({
      ...prev,
      h3Subscriptions: [zone.h3_index],
    }));
    setIsAreaPickerOpen(false);
    setFeedbackMessage({
      type: 'success',
      text: `পর্যবেক্ষণ এলাকা "${zone.area_name_bn}" হিসেবে নির্ধারিত হয়েছে।`,
    });
  };

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setFeedbackMessage(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setFeedbackMessage({
          type: 'error',
          text: 'গুগল লগইন শুরু করতে সমস্যা হয়েছে: ' + error.message,
        });
        setIsAuthLoading(false);
      }
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'লগইন ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।',
      });
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthLoading(true);
    setFeedbackMessage(null);
    try {
      await signOutUser();
      setCurrentUser(null);
      setFeedbackMessage({
        type: 'success',
        text: 'সফলভাবে লগআউট করা হয়েছে।',
      });
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'লগআউট করতে সমস্যা হয়েছে।',
      });
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
        setFeedbackMessage({
          type: 'success',
          text: 'নোটিফিকেশন বন্ধ করা হয়েছে।',
        });
      }
    } else {
      const res = await subscribeToPush(settings);
      if (res.success) {
        setIsSubscribed(true);
        setFeedbackMessage({
          type: 'success',
          text: 'নোটিফিকেশন সফলভাবে চালু করা হয়েছে!',
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: res.error || 'নোটিফিকেশন অনুমতি দেওয়া হয়নি।',
        });
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

      setFeedbackMessage({
        type: 'success',
        text: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে।',
      });
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
      });
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
        setFeedbackMessage({
          type: 'error',
          text: 'অ্যাকাউন্ট মোছার জন্য সক্রিয় সেশন পাওয়া যায়নি।',
        });
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
        setFeedbackMessage({
          type: 'error',
          text: data.error || 'অ্যাকাউন্ট মোছা সম্ভব হয়নি। আবার চেষ্টা করুন।',
        });
        setIsDeleting(false);
        setDeleteConfirmOpen(false);
        return;
      }

      await client.auth.signOut();
      localStorage.removeItem('halchal-home-h3');
      localStorage.removeItem('halchal-home-set-at');
      localStorage.removeItem('halchal_push_subscribed');
      localStorage.removeItem('halchal_push_settings');
      localStorage.removeItem('halchal_offline_report_queue');

      setIsSubscribed(false);
      setDeleteConfirmOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: 'আপনার অ্যাকাউন্ট এবং সকল তথ্য সফলভাবে চিরতরে মুছে ফেলা হয়েছে।',
      });
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary pb-28">
      {/* Area Picker Modal */}
      <AreaPickerModal
        isOpen={isAreaPickerOpen}
        onClose={() => setIsAreaPickerOpen(false)}
        onSelectZone={handleZoneSelected}
        selectedH3={currentHomeH3}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-surface-border px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
            aria-label="হোম পেজে ফিরে যান"
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
          <div
            className={`p-3.5 rounded-xl border text-sm flex items-center gap-2.5 animate-in fade-in ${
              feedbackMessage.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {feedbackMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            ) : (
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            )}
            <span>{feedbackMessage.text}</span>
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
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    যাচাইকৃত নাগরিক (x১.০)
                  </span>
                  <p className="text-sm font-bold text-text-primary truncate mt-1">
                    {currentUser.email || currentUser.phone || 'নাগরিক প্রোফাইল'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                disabled={isAuthLoading}
                aria-label="লগআউট"
                className="p-2.5 rounded-xl border border-surface-border text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base">বেনামী নাগরিক মোড</h2>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      x০.৫ ট্রাস্ট
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    লগইন করলে আপনার রিপোর্টের গ্রহণযোগ্যতা দ্বিগুণ হবে
                  </p>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-surface-border bg-canvas hover:bg-surface-elevated text-xs font-semibold transition-colors flex items-center justify-center gap-2.5 shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isAuthLoading ? 'সংযোগ করা হচ্ছে...' : 'গুগল দিয়ে লগইন করুন'}</span>
              </button>
            </div>
          )}
        </section>

        {/* Master Push Notification Toggle */}
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
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider block">
                পর্যবেক্ষণ এলাকা
              </span>
              <p className="text-base font-bold text-text-primary mt-0.5 truncate">{homeZoneName}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAreaPickerOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 transition-colors shrink-0 cursor-pointer"
            >
              এলাকা পরিবর্তন
            </button>
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
            {CATEGORY_OPTIONS.map((cat) => {
              const isChecked = settings.categories.includes(cat.id);
              const Icon = cat.icon;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryToggle(cat.id)}
                  disabled={!isSubscribed}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                    !isSubscribed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    isChecked
                      ? 'bg-canvas border-surface-border'
                      : 'bg-surface border-transparent opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${cat.color}`} />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      isChecked
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                        : 'border-surface-border'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Quiet Hours Policy Section */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm">রাতের নীরবতা (২৩:০০ - ০৬:০০)</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  রাত ১১টা থেকে সকাল ৬টা পর্যন্ত স্বয়ংক্রিয়ভাবে অ্যালার্ট বন্ধ থাকবে।
                </p>
              </div>
            </div>

            <button
              onClick={handleNightAlertsToggle}
              disabled={!isSubscribed}
              aria-label="রাতের অ্যালার্ট চালু বা বন্ধ করুন"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.allowNightAlerts ? 'bg-indigo-600' : 'bg-zinc-700'
              } ${!isSubscribed ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.allowNightAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-text-muted leading-relaxed">
            {settings.allowNightAlerts
              ? '⚠️ আপনি রাতের জরুরি অ্যালার্ট চালু রেখেছেন। গভীর রাতে লোডশেডিং হলেও নোটিফিকেশন আসবে।'
              : '✅ ডিফল্ট অনুযায়ী গভীর রাতে আপনার ফোনে কোনো অপ্রয়োজনীয় নোটিফিকেশন আসবে না।'}
          </p>
        </section>

        {/* Save Button */}
        {isSubscribed && (
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'পছন্দসমূহ সংরক্ষণ করুন'}
          </button>
        )}

        {/* Legal & Policy Links */}
        <section className="bg-surface border border-surface-border rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-text-muted">
            <FileText className="w-5 h-5" />
            <h2 className="font-bold text-base text-text-primary">নীতিমালা ও আইনি তথ্য</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/privacy"
              className="p-3 rounded-xl border border-surface-border bg-canvas hover:bg-surface/50 text-xs font-medium flex items-center gap-2 transition-colors"
            >
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>গোপনীয়তা নীতি</span>
            </Link>
            <Link
              href="/terms"
              className="p-3 rounded-xl border border-surface-border bg-canvas hover:bg-surface/50 text-xs font-medium flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>ব্যবহারের শর্তাবলী</span>
            </Link>
          </div>
        </section>

        {/* Content Takedown & Abuse Reporting */}
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
              className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>আমার সমস্ত তথ্য মুছে ফেলুন</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                আপনি কি নিশ্চিত? এই কাজটি অপরিবর্তনীয় এবং ডাটাবেস থেকে আপনার সব তথ্য চিরতরে মুছে যাবে।
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? 'মোছা হচ্ছে...' : 'হ্যাঁ, স্থায়ীভাবে মুছুন'}
                </button>
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                  className="py-2 px-3 bg-surface hover:bg-surface/80 border border-surface-border text-text-primary rounded-lg text-xs transition-colors cursor-pointer"
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
