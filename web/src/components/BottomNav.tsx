'use client';

import React from 'react';

export type NavTab = 'status' | 'map' | 'history';

interface BottomNavProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  className?: string;
}

export function BottomNav({
  activeTab = 'status',
  onTabChange,
  className = '',
}: BottomNavProps) {
  const tabs: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'status',
      label: 'হালচাল',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      id: 'map',
      label: 'লাইভ ম্যাপ',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" x2="9" y1="3" y2="18" />
          <line x1="15" x2="15" y1="6" y2="21" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: 'ইতিহাস',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="প্রধান নেভিগেশন"
      className={`sticky bottom-0 z-40 w-full bg-[var(--surface-bg)]/95 backdrop-blur-md border-t border-[var(--surface-border)] px-4 py-2 pb-safe shadow-lg transition-colors ${className}`}
    >
      <div className="max-w-md mx-auto grid grid-cols-3 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange?.(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer select-none ${
                isActive
                  ? 'text-emerald-500 font-bold bg-emerald-500/10'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-elevated)] font-medium'
              }`}
            >
              <span className={`transition-transform duration-150 ${isActive ? 'scale-110' : ''}`} aria-hidden="true">
                {tab.icon}
              </span>
              <span className="font-bengali text-xs mt-1 leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
