'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DHAKA_SEED_ZONES,
  DEFAULT_DHAKA_ZONE,
  SeedZone,
  ZoneStatusResponse,
  findNearestZone,
  createDefaultZoneStatus,
  setStoredHomeZone,
} from '@/lib/zones';
import { UtilityCategory, UserReportState } from '@/lib/theme';
import { AreaPill } from '@/components/AreaPill';
import { StatusCard } from '@/components/StatusCard';
import { ReportButton } from '@/components/ReportButton';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ConsentScreen } from '@/components/ConsentScreen';
import { AreaPickerModal } from '@/components/AreaPickerModal';
import { OneTapReportSheet } from '@/components/OneTapReportSheet';
import { ShareButton } from '@/components/ShareButton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import { PushNotificationOptInModal } from '@/components/PushNotificationOptInModal';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { registerServiceWorker } from '@/lib/pwa';
import { initOfflineQueueListeners } from '@/lib/offline-queue';
import { ensureAnonymousSession } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const CONSENT_KEY = 'halchal-consent-granted';
const ZONE_KEY = 'halchal-selected-zone';

export default function HomePage() {
  const router = useRouter();

  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [activeZone, setActiveZone] = useState<SeedZone>(DEFAULT_DHAKA_ZONE);
  const [zoneStatus, setZoneStatus] = useState<ZoneStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAreaPickerOpen, setIsAreaPickerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const previousStatusRef = useRef<ZoneStatusResponse | null>(null);

  // Initialize PWA Service Worker & Anonymous Auth
  useEffect(() => {
    registerServiceWorker();
    void ensureAnonymousSession();

    // Setup offline network status listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Setup offline queue auto-flusher
    const cleanupQueue = initOfflineQueueListeners(async (payload) => {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { success: res.ok };
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanupQueue();
    };
  }, []);

  // Fetch zone status
  const fetchStatus = useCallback(async (h3Index: string) => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch(`/api/zone/${h3Index}`);
      if (res.ok) {
        const data = (await res.json()) as ZoneStatusResponse;
        setZoneStatus(data);
      } else {
        setZoneStatus(createDefaultZoneStatus(h3Index));
      }
    } catch {
      setIsOffline(true);
      setZoneStatus(createDefaultZoneStatus(h3Index, { is_stale: true }));
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Check initial consent & zone storage on mount
  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem(CONSENT_KEY);
      const storedZone = localStorage.getItem(ZONE_KEY);

      if (storedZone) {
        const parsed = JSON.parse(storedZone) as SeedZone;
        setActiveZone(parsed);
        void fetchStatus(parsed.h3_index);
      } else {
        void fetchStatus(DEFAULT_DHAKA_ZONE.h3_index);
      }

      if (!storedConsent) {
        setShowConsent(true);
      }
    } catch {
      setShowConsent(true);
    } finally {
      setHasCheckedStorage(true);
    }
  }, [fetchStatus]);

  // Geolocation consent handler
  const handleGrantLocation = () => {
    setIsLocating(true);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nearest = findNearestZone(pos.coords.latitude, pos.coords.longitude);
          setActiveZone(nearest);
          localStorage.setItem(CONSENT_KEY, 'true');
          localStorage.setItem(ZONE_KEY, JSON.stringify(nearest));
          setShowConsent(false);
          setIsLocating(false);
          void fetchStatus(nearest.h3_index);
        },
        () => {
          // If user denies or GPS times out, fallback to default zone
          localStorage.setItem(CONSENT_KEY, 'true');
          setShowConsent(false);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    } else {
      setShowConsent(false);
      setIsLocating(false);
    }
  };

  const handleManualSelectConsent = () => {
    setShowConsent(false);
    setIsAreaPickerOpen(true);
  };

  const handleZoneSelected = (zone: SeedZone) => {
    setActiveZone(zone);
    setStoredHomeZone(zone.h3_index);
    localStorage.setItem(CONSENT_KEY, 'true');
    localStorage.setItem(ZONE_KEY, JSON.stringify(zone));
    void fetchStatus(zone.h3_index);
  };

  // Optimistic UI update upon submitting a report
  const handleOptimisticReport = (
    category: UtilityCategory,
    state: UserReportState
  ) => {
    previousStatusRef.current = zoneStatus;
    setZoneStatus((prev) => {
      const base = prev ?? createDefaultZoneStatus(activeZone.h3_index);
      const currentCat = base.categories[category];
      return {
        ...base,
        updated_at: new Date().toISOString(),
        categories: {
          ...base.categories,
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

  const handleOptimisticRollback = () => {
    if (previousStatusRef.current) {
      setZoneStatus(previousStatusRef.current);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentCategories =
    zoneStatus?.categories ?? createDefaultZoneStatus(activeZone.h3_index).categories;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--canvas-bg)] text-[var(--text-main)] transition-colors">
      {/* 1. Geolocation Consent Screen (First-time visitor) */}
      {showConsent && hasCheckedStorage && (
        <ConsentScreen
          onGrantLocation={handleGrantLocation}
          onManualSelect={handleManualSelectConsent}
          isLoading={isLocating}
        />
      )}

      {/* 2. Manual Area Picker Modal */}
      <AreaPickerModal
        isOpen={isAreaPickerOpen}
        onClose={() => setIsAreaPickerOpen(false)}
        onSelectZone={handleZoneSelected}
        selectedH3={activeZone.h3_index}
      />

      {/* 3. OneTap Report Sheet Modal */}
      <OneTapReportSheet
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        areaName={activeZone.area_name_bn}
        defaultLat={activeZone.lat}
        defaultLng={activeZone.lng}
        onOptimisticReport={handleOptimisticReport}
        onOptimisticRollback={handleOptimisticRollback}
        onReportSuccess={showToast}
      />

      {/* Main Content Area */}
      <div className="flex-1 pb-32">
        {/* Offline Banner */}
        <OfflineBanner
          isOffline={isOffline}
          isStale={zoneStatus?.is_stale}
          updatedAt={zoneStatus?.updated_at}
        />

        {/* Sticky Area Pill Header */}
        <AreaPill
          areaName={`${activeZone.area_name_bn} (${activeZone.ward})`}
          updatedAt={zoneStatus?.updated_at}
          isLive={!isOffline}
          onAreaClick={() => setIsAreaPickerOpen(true)}
        />

        {/* Global HUD Header Bar */}
        <div className="max-w-md mx-auto px-4 pt-3 pb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-bengali font-bold text-lg text-[var(--text-main)]">
              হালচাল
            </span>
            <span className="font-bengali text-xs text-[var(--text-sub)]">
              লাইভ HUD
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/settings"
              aria-label="নোটিফিকেশন সেটিংস"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors shrink-0"
            >
              <Bell className="w-4 h-4" />
            </Link>
            <ShareButton
              h3Index={activeZone.h3_index}
              areaName={activeZone.area_name_bn}
            />
            <ThemeToggle variant="compact" />
          </div>
        </div>

        {/* Toast Notification Banner */}
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
            {/* Electricity */}
            <StatusCard
              category="electricity"
              state={currentCategories.electricity.state}
              reporterCount={currentCategories.electricity.distinct_reporters}
              onClick={() => setIsReportOpen(true)}
            />

            {/* Gas */}
            <StatusCard
              category="gas"
              state={currentCategories.gas.state}
              reporterCount={currentCategories.gas.distinct_reporters}
              onClick={() => setIsReportOpen(true)}
            />

            {/* Water */}
            <StatusCard
              category="water"
              state={currentCategories.water.state}
              reporterCount={currentCategories.water.distinct_reporters}
              onClick={() => setIsReportOpen(true)}
            />

            {/* LPG */}
            <StatusCard
              category="lpg"
              state={currentCategories.lpg.state}
              reporterCount={currentCategories.lpg.distinct_reporters}
              onClick={() => setIsReportOpen(true)}
            />
          </div>

          {/* Action Zone: Report Button */}
          <div className="pt-2">
            <ReportButton
              onClick={() => setIsReportOpen(true)}
              label="আপনার এলাকার হাল জানান"
            />
          </div>

          {/* Mandatory Community Disclaimer (CLAUDE.md Section 1.5) */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-center">
            <p className="font-bengali text-xs text-[var(--text-sub)] leading-relaxed">
              নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়।
            </p>
          </div>
        </main>
      </div>

      {/* PWA Install Prompt Banner (Shown ONLY after first successful report) */}
      <PWAInstallBanner />

      {/* Push Notification Opt-in Prompt (Shown after first successful report) */}
      <PushNotificationOptInModal />

      {/* Persistent Bottom Navigation */}
      <BottomNav
        activeTab="status"
        onTabChange={(tab: NavTab) => {
          if (tab === 'map') router.push('/map');
          if (tab === 'history') router.push('/history');
        }}
      />
    </div>
  );
}
