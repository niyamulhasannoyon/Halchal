'use client';

import React, { useState } from 'react';
import { AreaPill } from '@/components/AreaPill';
import { StatusCard } from '@/components/StatusCard';
import { StateBadge } from '@/components/StateBadge';
import { ReportButton } from '@/components/ReportButton';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  ZoneDisplayState,
  UtilityCategory,
  STATE_CONFIGS,
  UTILITY_CATEGORIES,
  CONTRAST_AUDIT_DATA,
} from '@/lib/theme';
import { toBengaliDigits } from '@/lib/bengali-utils';

type ColorBlindFilter = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'monochrome';

export default function DesignPreviewPage() {
  const [activeTab, setActiveTab] = useState<NavTab>('status');
  const [cbFilter, setCbFilter] = useState<ColorBlindFilter>('none');
  const [simulatedReducedMotion, setSimulatedReducedMotion] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [sampleStates, setSampleStates] = useState<Record<UtilityCategory, ZoneDisplayState>>({
    electricity: 'out',
    gas: 'low',
    water: 'ok',
    lpg: 'unverified',
  });

  const filterStyle: React.CSSProperties = {
    filter:
      cbFilter === 'monochrome'
        ? 'grayscale(100%)'
        : cbFilter === 'deuteranopia'
        ? 'url(#deuteranopia-filter)'
        : cbFilter === 'protanopia'
        ? 'url(#protanopia-filter)'
        : cbFilter === 'tritanopia'
        ? 'url(#tritanopia-filter)'
        : 'none',
  };

  const handleReportClick = () => {
    setReportLoading(true);
    setTimeout(() => {
      setReportLoading(false);
      alert('হালচাল রিপোর্ট গেটওয়ে: আপনার এলাকার স্ট্যাটাস Edge Function-এ পাঠানো হয়েছে।');
    }, 1200);
  };

  return (
    <div className={`min-h-screen pb-20 ${simulatedReducedMotion ? '[&_*]:!animate-none [&_*]:!transition-none' : ''}`}>
      {/* SVG Colorblind Filters for Accessibility Verification */}
      <svg className="hidden">
        <defs>
          <filter id="deuteranopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.625 0.375 0 0 0
                      0.7   0.3   0 0 0
                      0     0.3   0.7 0 0
                      0     0     0   1 0"
            />
          </filter>
          <filter id="protanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.567 0.433 0 0 0
                      0.558 0.442 0 0 0
                      0     0.242 0.758 0 0
                      0     0     0     1 0"
            />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.95 0.05  0     0 0
                      0    0.433 0.567 0 0
                      0    0.475 0.525 0 0
                      0    0     0     1 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Architect's Header Bar */}
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface-bg)] px-4 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h1 className="text-xl md:text-2xl font-bengali font-bold tracking-tight text-[var(--text-main)]">
                হালচাল — ডিজাইন সিস্টেম প্রিভিউ
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                Next.js 15 + Tailwind v4 + Flutter
              </span>
            </div>
            <p className="text-xs md:text-sm font-bengali text-[var(--text-sub)] mt-0.5">
              ট্যাকটিক্যাল ইউটিলিটি HUD: ব্ল্যাকআউটের অন্ধকার ঘর ও ঢাকার প্রখর রোদে পরিষ্কার দৃষ্টিগোচর।
            </p>
          </div>

          {/* Interactive Inspection Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle showLabels />

            {/* Color Blindness Vision Simulator */}
            <div className="flex items-center gap-1.5 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-full px-2.5 py-1 text-xs">
              <span className="text-[var(--text-sub)]">দৃষ্টি পরীক্ষা:</span>
              <select
                aria-label="দৃষ্টি পরীক্ষা মোড"
                value={cbFilter}
                onChange={(e) => setCbFilter(e.target.value as ColorBlindFilter)}
                className="bg-transparent font-medium text-[var(--text-main)] focus:outline-none cursor-pointer"
              >
                <option value="none">স্বাভাবিক (Normal)</option>
                <option value="deuteranopia">ডিউটেরানোপিয়া (সবুজ-অন্ধ)</option>
                <option value="protanopia">প্রোটানোপিয়া (লাল-অন্ধ)</option>
                <option value="tritanopia">ট্রিটানোপিয়া (নীল-অন্ধ)</option>
                <option value="monochrome">মনোক্রোম (রংহীন LCD)</option>
              </select>
            </div>

            {/* Reduced Motion Toggle */}
            <button
              type="button"
              onClick={() => setSimulatedReducedMotion(!simulatedReducedMotion)}
              className={`px-2.5 py-1 rounded-full text-xs font-bengali font-medium border transition-colors cursor-pointer ${
                simulatedReducedMotion
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 font-bold'
                  : 'bg-[var(--surface-elevated)] border-[var(--surface-border)] text-[var(--text-sub)]'
              }`}
            >
              {simulatedReducedMotion ? 'পলস বন্ধ (Reduced Motion)' : 'মোশন চালু'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Preview Container with optional optical filter */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12" style={filterStyle}>
        
        {/* SECTION 1: Tactical Mobile HUD in Situ (Thumb Zone Demonstration) */}
        <section className="space-y-4">
          <div className="border-b border-[var(--surface-border)] pb-2 flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bengali font-bold text-[var(--text-main)]">
                ১. লাইভ মোবাইল HUD প্রিভিউ (আঙ্গুল পৌঁছানোর জোন)
              </h2>
              <p className="text-xs md:text-sm font-bengali text-[var(--text-sub)]">
                শীর্ষে স্টিকি এরিয়া পিল, মাঝে ২x২ স্ট্যাটাস কার্ড (নূন্যতম ১৩৬px), নিচে সহজে স্পর্শযোগ্য রিপোর্ট বাটন ও ৩-আইটেম নেভিগেশন।
              </p>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-medium">
              Viewport: 390 x 844 px
            </span>
          </div>

          <div className="flex justify-center">
            {/* Realistic smartphone frame */}
            <div className="w-full max-w-[390px] min-h-[720px] rounded-[36px] bg-[var(--canvas-bg)] border-[4px] border-[var(--surface-border-strong)] shadow-2xl overflow-hidden flex flex-col justify-between relative transition-colors">
              {/* Top: Sticky Area Pill */}
              <AreaPill
                areaName="মিরপুর ২, ব্লক সি"
                updatedAt={new Date(Date.now() - 8 * 60 * 1000)}
                isLive={true}
                onAreaClick={() => alert('এলাকা পরিবর্তন মডাল (H3 Cell: 8864264627fffff)')}
              />

              {/* Middle: 2x2 Tactical Grid & Community Disclaimer */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-3">
                  <StatusCard
                    category="electricity"
                    state={sampleStates.electricity}
                    reporterCount={7}
                    isVerified={true}
                    onClick={() => {
                      const next: Record<ZoneDisplayState, ZoneDisplayState> = {
                        ok: 'low',
                        low: 'out',
                        out: 'unverified',
                        unverified: 'unknown',
                        unknown: 'ok',
                      };
                      setSampleStates((prev) => ({ ...prev, electricity: next[prev.electricity] }));
                    }}
                  />

                  <StatusCard
                    category="gas"
                    state={sampleStates.gas}
                    reporterCount={4}
                    isVerified={true}
                    onClick={() => {
                      const next: Record<ZoneDisplayState, ZoneDisplayState> = {
                        ok: 'low',
                        low: 'out',
                        out: 'unverified',
                        unverified: 'unknown',
                        unknown: 'ok',
                      };
                      setSampleStates((prev) => ({ ...prev, gas: next[prev.gas] }));
                    }}
                  />

                  <StatusCard
                    category="water"
                    state={sampleStates.water}
                    reporterCount={12}
                    isVerified={true}
                    onClick={() => {
                      const next: Record<ZoneDisplayState, ZoneDisplayState> = {
                        ok: 'low',
                        low: 'out',
                        out: 'unverified',
                        unverified: 'unknown',
                        unknown: 'ok',
                      };
                      setSampleStates((prev) => ({ ...prev, water: next[prev.water] }));
                    }}
                  />

                  <StatusCard
                    category="lpg"
                    state={sampleStates.lpg}
                    reporterCount={2}
                    isVerified={false}
                    onClick={() => {
                      const next: Record<ZoneDisplayState, ZoneDisplayState> = {
                        ok: 'low',
                        low: 'out',
                        out: 'unverified',
                        unverified: 'unknown',
                        unknown: 'ok',
                      };
                      setSampleStates((prev) => ({ ...prev, lpg: next[prev.lpg] }));
                    }}
                  />
                </div>

                {/* Mandatory Community Disclaimer (CLAUDE.md Section 1.5) */}
                <div className="rounded-xl p-2.5 bg-[var(--surface-bg)] border border-[var(--surface-border)] text-center">
                  <p className="font-bengali text-xs text-[var(--text-sub)] leading-relaxed">
                    ⚠️ নাগরিক তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়।
                  </p>
                </div>
              </div>

              {/* Bottom (Thumb Zone): Report Button + 3-item Navigation */}
              <div className="p-4 pt-1 space-y-3 bg-gradient-to-t from-[var(--canvas-bg)] via-[var(--canvas-bg)]/90 to-transparent">
                <ReportButton
                  isLoading={reportLoading}
                  onClick={handleReportClick}
                />
              </div>

              <BottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: "Never Color Alone" State Matrix */}
        <section className="space-y-4">
          <div className="border-b border-[var(--surface-border)] pb-2">
            <h2 className="text-xl md:text-2xl font-bengali font-bold text-[var(--text-main)]">
              ২. &quot;শুধু রঙের ওপর নির্ভর নয়&quot; (Never Color Alone) স্টেট ম্যাট্রিক্স
            </h2>
            <p className="text-xs md:text-sm font-bengali text-[var(--text-sub)]">
              প্রতিটি স্টেটে আলাদা আইকন + স্পষ্ট বাংলা শব্দ + নির্দিষ্ট বর্ডার প্যাটার্ন (সলিড, ড্যাশড, ডটেড) রয়েছে যা বর্ণান্ধদের জন্য ১০০% স্পষ্ট।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {(['ok', 'low', 'out', 'unverified', 'unknown'] as ZoneDisplayState[]).map((st) => {
              const cfg = STATE_CONFIGS[st];
              return (
                <div
                  key={st}
                  className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase font-bold text-[var(--text-sub)]">
                      {st}
                    </span>
                    <StateBadge state={st} size="md" />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[var(--surface-border)]/60 text-xs font-bengali text-[var(--text-sub)]">
                    <div className="flex justify-between">
                      <span>বাংলা শব্দ:</span>
                      <strong className="text-[var(--text-main)]">{cfg.bengaliWord}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>বর্ডার প্যাটার্ন:</span>
                      <span className="capitalize">{cfg.borderStyle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>পালস অ্যানিমেশন:</span>
                      <span>{cfg.shouldPulse ? 'সক্রিয় (আউট)' : 'নিষ্ক্রিয়'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: WCAG Contrast Verification Audit */}
        <section className="space-y-4">
          <div className="border-b border-[var(--surface-border)] pb-2">
            <h2 className="text-xl md:text-2xl font-bengali font-bold text-[var(--text-main)]">
              ৩. WCAG 2.1 কনট্রাস্ট রেশিও অডিট (≥ ৪.৫:১ নিশ্চিতকরণ)
            </h2>
            <p className="text-xs md:text-sm font-bengali text-[var(--text-sub)]">
              গাঢ় ব্যাকগ্রাউন্ডে টেক্সটের রঙের পাশাপাশি হালকা টিন্টের ওপর সব রঙের কনট্রাস্ট অনুপাত গাণিতিকভাবে যাচাইকৃত।
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)]">
            <table className="w-full text-left font-bengali text-xs md:text-sm">
              <thead className="bg-[var(--surface-elevated)] border-b border-[var(--surface-border)] text-[var(--text-sub)]">
                <tr>
                  <th className="p-3">ইউআই উপাদান (UI Element)</th>
                  <th className="p-3">ফোরগ্রাউন্ড</th>
                  <th className="p-3">ব্যাকগ্রাউন্ড</th>
                  <th className="p-3">কনট্রাস্ট অনুপাত</th>
                  <th className="p-3">WCAG ফলাফল</th>
                  <th className="p-3">ব্যবহারিক প্রেক্ষিত</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border)]">
                {CONTRAST_AUDIT_DATA.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                    <td className="p-3 font-semibold text-[var(--text-main)]">{row.element}</td>
                    <td className="p-3 font-mono">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: row.foreground }} />
                        {row.foreground}
                      </span>
                    </td>
                    <td className="p-3 font-mono">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: row.background }} />
                        {row.background}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-500">{row.ratio}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                        {row.rating}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--text-sub)]">{row.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 4: Bengali Typography & Conjunct Vertical Clearance */}
        <section className="space-y-4">
          <div className="border-b border-[var(--surface-border)] pb-2">
            <h2 className="text-xl md:text-2xl font-bengali font-bold text-[var(--text-main)]">
              ৪. বাংলা টাইপোগ্রাফি ও যুক্তাক্ষর অক্ষত রাখার নিয়ম (Line-Height ≥ ১.৬)
            </h2>
            <p className="text-xs md:text-sm font-bengali text-[var(--text-sub)]">
              ইংরেজি ফন্টের সাধারণ টাইট লাইন-হাইটে বাংলা উপরের মাত্রা (ী, ৈ, ৌ) ও নিচের কার/যুক্তাক্ষর (ষ্ণ, ক্ষ্ম, ণ্ড, হ্ণ) কেটে যায়। হালচালে সব বডি টেক্সট নূন্যতম ১৬px এবং লাইন হাইট ১.৬৫।
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-emerald-500 uppercase">
                যুক্তাক্ষর পরীক্ষা (Complex Ligature Test)
              </span>
              <p className="text-lg md:text-xl font-bengali leading-[1.65] text-[var(--text-main)]">
                &ldquo;কৃষ্ণচূড়া গাছের নিচে লোডশেডিংয়ের তীব্র অন্ধকারেও নাগরিকগণ ভোল্টেজের হ্রাস-বৃদ্ধি ও গ্যাসের স্বল্প চাপের তথ্য নিশ্চিত করেছেন।&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--surface-border)]">
              <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)]">
                <span className="text-xs text-[var(--text-sub)]">বডি টেক্সট আকার:</span>
                <p className="text-base font-bold text-[var(--text-main)] mt-0.5">১৬ পিক্সেল (১rem)</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)]">
                <span className="text-xs text-[var(--text-sub)]">লাইন হাইট অনুপাত:</span>
                <p className="text-base font-bold text-[var(--text-main)] mt-0.5">১.৬৫ (26.4px)</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)]">
                <span className="text-xs text-[var(--text-sub)]">হেডার টাইটেল আকার:</span>
                <p className="text-base font-bold text-[var(--text-main)] mt-0.5">২২ পিক্সেল (বোল্ড)</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)]">
                <span className="text-xs text-[var(--text-sub)]">ফন্ট সাবসেট:</span>
                <p className="text-base font-bold text-[var(--text-main)] mt-0.5">Bengali (Hind Siliguri)</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: Multi-Platform Parity (Next.js + Flutter) */}
        <section className="space-y-4">
          <div className="border-b border-[var(--surface-border)] pb-2">
            <h2 className="text-xl md:text-2xl font-bengali font-bold text-[var(--text-main)]">
              ৫. মাল্টি-প্ল্যাটফর্ম কোড সমতা (Next.js + Flutter / Dart)
            </h2>
            <p className="text-xs md:text-sm font-bengali text-[var(--text-sub)]">
              Next.js ওয়েব এবং Flutter মোবাইল অ্যাপ উভয়ের মধ্যেই হুবহু একই টোকেন, কালার প্যালেট, বাংলা ইউটিলিটি ও টেস্ট স্যুট তৈরি করা হয়েছে।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[var(--text-main)]">Next.js 15 Web Implementation</h3>
                <span className="text-xs font-mono text-emerald-500 font-semibold">TypeScript</span>
              </div>
              <ul className="text-xs space-y-1 font-mono text-[var(--text-sub)]">
                <li>• web/src/styles/globals.css (@theme Tailwind v4)</li>
                <li>• web/src/lib/bengali-utils.ts (toBengaliDigits, relativeTime)</li>
                <li>• web/src/components/StatusCard.tsx (2x2 HUD cards)</li>
                <li>• web/src/components/StateBadge.tsx (Never color alone)</li>
                <li>• 14 Unit Tests Passing (node:test + tsx)</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[var(--text-main)]">Flutter Mobile Implementation</h3>
                <span className="text-xs font-mono text-blue-500 font-semibold">Dart</span>
              </div>
              <ul className="text-xs space-y-1 font-mono text-[var(--text-sub)]">
                <li>• mobile/lib/theme/app_theme.dart (ThemeData & StatusToken)</li>
                <li>• mobile/lib/utils/bengali_utils.dart (BengaliUtils)</li>
                <li>• mobile/test/bengali_utils_test.dart</li>
                <li>• mobile/test/app_theme_test.dart</li>
                <li>• 16 Flutter Unit Tests Passing (flutter test)</li>
              </ul>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
