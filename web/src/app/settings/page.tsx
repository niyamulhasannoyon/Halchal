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
import { BottomNav } from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Bell, Moon, Zap, Flame, Droplets, CircleDot, Check, ArrowLeft, Shield } from 'lucide-react';
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

  useEffect(() => {
    setIsSubscribed(isUserPushSubscribed());
    const stored = getLocalPushSettings();
    setSettings(stored);

    const homeH3 = getStoredHomeZone();
    if (homeH3) {
      const meta = getZoneMetadata(homeH3);
      setHomeZoneName(meta?.area_name_bn || 'আপনার এলাকা');
    }
  }, []);

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
      </main>

      <BottomNav />
    </div>
  );
}
