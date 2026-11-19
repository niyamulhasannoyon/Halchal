'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { AreaPickerModal } from '@/components/AreaPickerModal';
import { OutageSummaryCard } from '@/components/insights/OutageSummaryCard';
import { InsightsHeatmap } from '@/components/insights/InsightsHeatmap';
import { LpgPriceCard } from '@/components/insights/LpgPriceCard';
import { ComplaintCardModal } from '@/components/insights/ComplaintCardModal';
import { BiasDisclaimer } from '@/components/insights/BiasDisclaimer';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DHAKA_SEED_ZONES,
  DEFAULT_DHAKA_ZONE,
  SeedZone,
  getZoneMetadata,
} from '@/lib/zones';
import { Zone7DayInsights, createDefaultZone7DayInsights } from '@/lib/insights';
import { MapPin, Sparkles, ChevronDown, RefreshCw } from 'lucide-react';

const ZONE_STORAGE_KEY = 'halchal-selected-zone';

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeZone, setActiveZone] = useState<SeedZone>(DEFAULT_DHAKA_ZONE);
  const [insights, setInsights] = useState<Zone7DayInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAreaPickerOpen, setIsAreaPickerOpen] = useState(false);

  // Initialize zone from URL query param or localStorage
  useEffect(() => {
    const urlH3 = searchParams.get('h3');
    if (urlH3) {
      const match = getZoneMetadata(urlH3);
      if (match) {
        setActiveZone(match);
        return;
      }
    }

    try {
      const saved = localStorage.getItem(ZONE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SeedZone;
        if (parsed?.h3_index) {
          const match = getZoneMetadata(parsed.h3_index);
          if (match) {
            setActiveZone(match);
            return;
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [searchParams]);

  // Fetch 7-day insights
  const fetchInsights = useCallback(async (h3Index: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/zone/${h3Index}/insights`);
      if (res.ok) {
        const data = (await res.json()) as Zone7DayInsights;
        setInsights(data);
      } else {
        const meta = getZoneMetadata(h3Index) || DEFAULT_DHAKA_ZONE;
        setInsights(
          createDefaultZone7DayInsights(h3Index, meta.area_name_bn, meta.ward, meta.city, {
            isSynthetic: true,
          })
        );
      }
    } catch (err) {
      console.warn('Failed to fetch 7-day insights, using fallback:', err);
      const meta = getZoneMetadata(h3Index) || DEFAULT_DHAKA_ZONE;
      setInsights(
        createDefaultZone7DayInsights(h3Index, meta.area_name_bn, meta.ward, meta.city, {
          isSynthetic: true,
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeZone?.h3_index) {
      void fetchInsights(activeZone.h3_index);
    }
  }, [activeZone, fetchInsights]);

  const handleSelectZone = (zone: SeedZone) => {
    setActiveZone(zone);
    try {
      localStorage.setItem(ZONE_STORAGE_KEY, JSON.stringify(zone));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--canvas-bg)] text-[var(--text-main)] transition-colors">
      {/* Area Picker Modal */}
      <AreaPickerModal
        isOpen={isAreaPickerOpen}
        onClose={() => setIsAreaPickerOpen(false)}
        onSelectZone={handleSelectZone}
        selectedH3={activeZone.h3_index}
      />

      {/* Main Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-28 space-y-5">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between py-2 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              📊
            </span>
            <div>
              <h1 className="font-bengali font-bold text-xl text-[var(--text-main)] leading-none">
                ৭ দিনের ইতিহাস
              </h1>
              <p className="font-bengali text-xs text-[var(--text-sub)] mt-1">
                এলাকার ইউটিলিটি নির্ভরযোগ্যতা ও প্যাটার্ন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="text-xs font-bengali text-emerald-600 dark:text-emerald-400 font-bold hover:underline py-1 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
            >
              লাইভ হালচাল
            </Link>
          </div>
        </header>

        {/* Sticky Area Selector Pill */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] shadow-sm">
          <button
            type="button"
            onClick={() => setIsAreaPickerOpen(true)}
            className="flex items-center gap-2 text-left cursor-pointer group focus:outline-none"
            aria-label="এলাকা পরিবর্তন করুন"
          >
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
              <MapPin className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bengali font-bold text-sm text-[var(--text-main)] group-hover:text-emerald-500 transition-colors">
                  {activeZone.area_name_bn} ({activeZone.ward})
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-sub)]" aria-hidden="true" />
              </div>
              <span className="font-bengali text-[11px] text-[var(--text-sub)] block">
                এলাকা পরিবর্তন করতে ট্যাপ করুন
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fetchInsights(activeZone.h3_index)}
            disabled={isLoading}
            className="p-2.5 rounded-xl hover:bg-[var(--surface-elevated)] text-[var(--text-sub)] transition-colors cursor-pointer"
            aria-label="তথ্য রিফ্রেশ করুন"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Primary Deterministic Insight Headline */}
        {insights && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/40 border border-emerald-500/30 shadow-sm space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bengali font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>সাপ্তাহিক মূল ইনসাইট (Indicative Pattern)</span>
            </div>
            <p className="font-bengali font-bold text-base md:text-lg text-[var(--text-main)] leading-relaxed">
              &ldquo;{insights.insight_bn}&rdquo;
            </p>
          </div>
        )}

        {/* Summary Card: Electricity Outages */}
        {insights && (
          <OutageSummaryCard
            electricityInsight={insights.categories.electricity}
            dataConfidence={insights.data_confidence}
            areaNameBn={activeZone.area_name_bn}
          />
        )}

        {/* 7 Days x 6 Blocks Heatmap */}
        {insights && (
          <InsightsHeatmap
            categories={insights.categories}
            dataConfidence={insights.data_confidence}
            areaNameBn={activeZone.area_name_bn}
          />
        )}

        {/* LPG Cylinder Price Card */}
        {insights && (
          <LpgPriceCard
            lpgPrice={insights.lpg_price}
            areaNameBn={activeZone.area_name_bn}
          />
        )}

        {/* Action: Share / Download Complaint Copy */}
        {insights && (
          <ComplaintCardModal
            insights={insights}
            className="mt-2"
          />
        )}

        {/* Known Bias Notice */}
        <BiasDisclaimer />
      </div>

      {/* Persistent Bottom Nav */}
      <BottomNav
        activeTab="history"
        onTabChange={(tab: NavTab) => {
          if (tab === 'status') router.push('/');
          if (tab === 'map') router.push('/map');
          if (tab === 'history') router.push('/history');
        }}
      />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--canvas-bg)] text-emerald-500 font-bengali font-bold text-base">
          ৭ দিনের তথ্য লোড হচ্ছে...
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
