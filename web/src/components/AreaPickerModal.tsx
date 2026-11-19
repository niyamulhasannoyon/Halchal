'use client';

import React, { useState } from 'react';
import { DHAKA_SEED_ZONES, SeedZone } from '@/lib/zones';

interface AreaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectZone: (zone: SeedZone) => void;
  selectedH3?: string;
}

export function AreaPickerModal({
  isOpen,
  onClose,
  onSelectZone,
  selectedH3,
}: AreaPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredZones = DHAKA_SEED_ZONES.filter((z) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      z.area_name_bn.toLowerCase().includes(q) ||
      z.ward.toLowerCase().includes(q) ||
      z.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="area-picker-title"
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--surface-border)]">
          <div>
            <h2
              id="area-picker-title"
              className="font-bengali font-bold text-xl text-[var(--text-main)]"
            >
              আপনার এলাকা বেছে নিন
            </h2>
            <p className="font-bengali text-xs text-[var(--text-sub)] mt-0.5">
              ঢাকার মূল আবাসিক ও বাণিজ্যিক এলাকা
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer text-xl"
            aria-label="বন্ধ করুন"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-[var(--surface-border)]/60 bg-[var(--surface-elevated)]/50">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="এলাকা খুঁজুন (যেমন: ধানমন্ডি, মিরপুর, গুলশান)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-bg)] border border-[var(--surface-border)] font-bengali text-sm md:text-base text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Zones List */}
        <div className="overflow-y-auto p-3 space-y-1.5 flex-1 divide-y divide-[var(--surface-border)]/40">
          {filteredZones.map((zone) => {
            const isSelected = selectedH3 === zone.h3_index;
            return (
              <button
                key={zone.h3_index}
                type="button"
                onClick={() => {
                  onSelectZone(zone);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 font-bold'
                    : 'hover:bg-[var(--surface-elevated)] text-[var(--text-main)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <div>
                    <h3 className="font-bengali font-bold text-base md:text-lg">
                      {zone.area_name_bn}
                    </h3>
                    <p className="font-bengali text-xs text-[var(--text-sub)]">
                      {zone.ward}, {zone.city}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-emerald-500 text-lg font-bold">✓</span>
                )}
              </button>
            );
          })}

          {filteredZones.length === 0 && (
            <div className="py-12 text-center text-[var(--text-sub)] font-bengali">
              কোনো এলাকা পাওয়া যায়নি। অনুগ্রহ করে বানান পরীক্ষা করুন।
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
