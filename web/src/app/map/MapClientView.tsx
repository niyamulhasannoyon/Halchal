'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { useRouter } from 'next/navigation';

// Lazy-load MapLibre GL exclusively on /map route to protect the bundle budget
const MapLibreView = dynamic(() => import('@/components/MapLibreView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-140px)] flex flex-col items-center justify-center bg-[#070A0F] text-[#F8FAFC] gap-3">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-2xl">
        <span>🗺️</span>
        <span className="absolute h-full w-full rounded-2xl bg-emerald-500/15 animate-ping opacity-30" />
      </div>
      <p className="font-bengali text-base font-bold text-emerald-400">
        লাইভ হেক্স ম্যাপ লোড হচ্ছে...
      </p>
      <p className="font-bengali text-xs text-[#94A3B8]">
        Uber H3 Resolution 8 জোন ডেটা প্রস্তুত হচ্ছে
      </p>
    </div>
  ),
});

export function MapClientView() {
  const router = useRouter();

  return (
    <main className="flex-1 flex flex-col justify-between">
      {/* Live Map Canvas */}
      <div className="flex-1 relative min-h-[450px]">
        <MapLibreView onZoneSelect={(h3) => router.push(`/z/${h3}`)} />
      </div>

      {/* Persistent Bottom Nav */}
      <BottomNav
        activeTab="map"
        onTabChange={(tab: NavTab) => {
          if (tab === 'status') router.push('/');
          if (tab === 'map') router.push('/map');
          if (tab === 'history') router.push('/history');
        }}
      />
    </main>
  );
}
