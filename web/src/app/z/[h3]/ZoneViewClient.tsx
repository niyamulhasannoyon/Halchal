'use client';

import React, { useState } from 'react';
import { SeedZone, ZoneStatusResponse } from '@/lib/zones';
import { UtilityCategory, UserReportState } from '@/lib/theme';
import { AreaPill } from '@/components/AreaPill';
import { StatusCard } from '@/components/StatusCard';
import { ReportButton } from '@/components/ReportButton';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ShareButton } from '@/components/ShareButton';
import { OneTapReportSheet } from '@/components/OneTapReportSheet';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import { PushNotificationOptInModal } from '@/components/PushNotificationOptInModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ZoneViewClientProps {
  h3: string;
  initialStatus: ZoneStatusResponse;
  seedMeta: SeedZone;
}

export function ZoneViewClient({
  h3,
  initialStatus,
  seedMeta,
}: ZoneViewClientProps) {
  const router = useRouter();
  const [zoneStatus, setZoneStatus] = useState<ZoneStatusResponse>(initialStatus);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOptimisticReport = (
    category: UtilityCategory,
    state: UserReportState
  ) => {
    setZoneStatus((prev) => {
      const currentCat = prev.categories[category];
      return {
        ...prev,
        updated_at: new Date().toISOString(),
        categories: {
          ...prev.categories,
          [category]: {
            ...currentCat,
            state,
            distinct_reporters: (currentCat?.distinct_reporters || 0) + 1,
            state_since: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      };
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const categories = zoneStatus.categories;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--canvas-bg)] text-[var(--text-main)] transition-colors">
      {/* OneTap Report Sheet */}
      <OneTapReportSheet
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        areaName={seedMeta.area_name_bn}
        defaultLat={seedMeta.lat}
        defaultLng={seedMeta.lng}
        onOptimisticReport={handleOptimisticReport}
        onReportSuccess={showToast}
      />

      {/* Main Content Area */}
      <div className="flex-1 pb-24">
        {/* Sticky Area Pill */}
        <AreaPill
          areaName={`${seedMeta.area_name_bn} (${seedMeta.ward})`}
          updatedAt={zoneStatus.updated_at}
          isLive={true}
        />

        {/* Global HUD Header */}
        <div className="max-w-md mx-auto px-4 pt-3 pb-1 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-emerald-500 font-bengali font-bold text-sm hover:underline"
          >
            <span>←</span>
            <span>আমার এলাকায় যান</span>
          </Link>

          <div className="flex items-center gap-2">
            <ShareButton
              h3Index={h3}
              areaName={seedMeta.area_name_bn}
            />
            <ThemeToggle />
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            className="fixed top-14 left-4 right-4 z-50 max-w-sm mx-auto p-3.5 rounded-2xl bg-emerald-600 text-white font-bengali text-sm font-bold text-center shadow-2xl animate-in slide-in-from-top duration-200"
          >
            {toastMessage}
          </div>
        )}

        {/* 2x2 Tactical Status Cards Grid */}
        <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <StatusCard
              category="electricity"
              state={categories.electricity.state}
              reporterCount={categories.electricity.distinct_reporters}
              onClick={() => setIsReportOpen(true)}
            />

            <StatusCard
              category="gas"
              state={categories.gas.state}
              reporterCount={categories.gas.distinct_reporters}
              onClick={() => setIsReportOpen(true)}
            />

            <StatusCard
              category="water"
              state={categories.water.state}
              reporterCount={categories.water.distinct_reporters}
              onClick={() => setIsReportOpen(true)}
            />

            <StatusCard
              category="lpg"
              state={categories.lpg.state}
              reporterCount={categories.lpg.distinct_reporters}
              onClick={() => setIsReportOpen(true)}
            />
          </div>

          {/* Report Button */}
          <div className="pt-2">
            <ReportButton
              onClick={() => setIsReportOpen(true)}
              label="এই এলাকার হাল জানান"
            />
          </div>

          {/* 7-Day Insights Link */}
          <Link
            href={`/history?h3=${h3}`}
            className="w-full py-3.5 px-4 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-border)]/50 border border-[var(--surface-border)] text-[var(--text-main)] font-bengali font-bold text-sm flex items-center justify-between transition-colors shadow-sm"
          >
            <span className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">📊</span>
              <span>{seedMeta.area_name_bn} এলাকার ৭ দিনের ইতিহাস ও ইনসাইটস</span>
            </span>
            <span className="text-emerald-500 font-bold">দেখুন ➜</span>
          </Link>

          {/* Mandatory Community Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-center">
            <p className="font-bengali text-xs text-[var(--text-sub)] leading-relaxed">
              নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয় (CLAUDE.md)।
            </p>
          </div>
        </main>
      </div>

      <PWAInstallBanner />
      <PushNotificationOptInModal />

      {/* Bottom Navigation */}
      <BottomNav
        activeTab="status"
        onTabChange={(tab: NavTab) => {
          if (tab === 'status') router.push('/');
          if (tab === 'map') router.push('/map');
          if (tab === 'history') router.push('/history');
        }}
      />
    </div>
  );
}
