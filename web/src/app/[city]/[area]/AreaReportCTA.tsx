'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { UtilityCategory } from '@/lib/theme';
import { AreaInfo } from '@/lib/areas';

// Lazy-load the heavy report sheet so the initial Area page bundle stays well under 150 KB
const OneTapReportSheet = dynamic(
  () => import('@/components/OneTapReportSheet').then((m) => m.OneTapReportSheet),
  { ssr: false }
);

interface AreaReportCTAProps {
  area: AreaInfo;
  label?: string;
  className?: string;
  initialCategory?: UtilityCategory;
  showIcon?: boolean;
}

export function AreaReportCTA({
  area,
  label,
  className = '',
  initialCategory = 'electricity',
  showIcon = true,
}: AreaReportCTAProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const buttonText = label || `${area.nameBn} এলাকার হাল জানান (১-ট্যাপ রিপোর্ট)`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsReportOpen(true)}
        className={className}
      >
        {showIcon && (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
        <span>{buttonText}</span>
      </button>

      {/* 1-Tap Citizen Report Sheet */}
      <OneTapReportSheet
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        areaName={area.nameBn}
        defaultLat={area.lat}
        defaultLng={area.lng}
        currentH3={area.primaryH3}
        initialCategory={initialCategory}
        onOptimisticReport={() => {
          setToastMessage(`${area.nameBn} এলাকায় আপনার রিপোর্ট সফলভাবে জমা হয়েছে! ধন্যবাদ।`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      {/* Floating Confirmation Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg border border-emerald-500 animate-fade-in flex items-center gap-2"
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
