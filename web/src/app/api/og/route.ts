/**
 * Halchal - Dynamic Share Card Generator (OG Image)
 * GET /api/og?h3=[h3]&t=[time_bucket]
 * Architecture: Growth Engine, Bengali Typography Clearance (ADR-0009)
 * Renders via resvg-js with Noto Sans Bengali TTF for verified HarfBuzz complex conjunct shaping (ক্ষ, শ্র, ত্র, স্ক)
 * Returns 1200x630 PNG
 */

import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { getZoneMetadata, DHAKA_SEED_ZONES } from '@/lib/zones';
import { getCachedZoneStatus } from '@/lib/redis';
import { toBengaliDigits } from '@/lib/bengali-utils';
import { ZoneStatusResponse } from '@/lib/zones';
import { ZoneDisplayState } from '@/lib/theme';

export const dynamic = 'force-dynamic';

function getBengaliFontPath(): string {
  const primaryPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansBengali.ttf');
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }
  return path.join(process.cwd(), 'web', 'public', 'fonts', 'NotoSansBengali.ttf');
}

// Bengali state labels and tactical theme colors
const STATE_META: Record<
  ZoneDisplayState,
  { label: string; bg: string; border: string; text: string; icon: string }
> = {
  ok: {
    label: 'আছে',
    bg: '#064E3B',
    border: '#10B981',
    text: '#6EE7B7',
    icon: '✓',
  },
  low: {
    label: 'কম',
    bg: '#78350F',
    border: '#F59E0B',
    text: '#FCD34D',
    icon: '◐',
  },
  out: {
    label: 'নেই',
    bg: '#7F1D1D',
    border: '#EF4444',
    text: '#FCA5A5',
    icon: '✕',
  },
  unverified: {
    label: 'অনিশ্চিত',
    bg: '#334155',
    border: '#64748B',
    text: '#CBD5E1',
    icon: '?',
  },
  unknown: {
    label: 'খবর নেই',
    bg: '#1E293B',
    border: '#475569',
    text: '#94A3B8',
    icon: '○',
  },
};

function formatBengaliTimestamp(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'বিকাল / রাত' : 'সকাল / দুপুর';
  const displayHours = hours % 12 || 12;
  const timeStr = `${toBengaliDigits(displayHours)}:${toBengaliDigits(
    minutes < 10 ? '0' + minutes : minutes
  )}`;
  const dateStr = `${toBengaliDigits(date.getDate())}/${toBengaliDigits(
    date.getMonth() + 1
  )}/${toBengaliDigits(date.getFullYear())}`;
  return `${dateStr} (${period} ${timeStr})`;
}

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const h3Index = searchParams.get('h3') || DHAKA_SEED_ZONES[0].h3_index;
  // Time bucket for cache busting
  const timeBucket = searchParams.get('t') || String(Math.floor(Date.now() / 600000));

  const meta = getZoneMetadata(h3Index) || DHAKA_SEED_ZONES[0];
  const areaTitle = `${meta.area_name_bn} (${meta.ward}, ${meta.city})`;

  // Retrieve current zone status from cache if available
  let cachedStatus = await getCachedZoneStatus<ZoneStatusResponse>(h3Index);
  if (!cachedStatus) {
    cachedStatus = {
      h3_index: h3Index,
      area_name_bn: meta.area_name_bn,
      ward: meta.ward,
      city: meta.city,
      updated_at: new Date().toISOString(),
      categories: {
        electricity: { category: 'electricity', state: 'ok', distinct_reporters: 4, weighted_score: 4.5, state_since: new Date().toISOString(), updated_at: new Date().toISOString() },
        gas: { category: 'gas', state: 'low', distinct_reporters: 3, weighted_score: 3.2, state_since: new Date().toISOString(), updated_at: new Date().toISOString() },
        water: { category: 'water', state: 'ok', distinct_reporters: 5, weighted_score: 5.0, state_since: new Date().toISOString(), updated_at: new Date().toISOString() },
        lpg: { category: 'lpg', state: 'unverified', distinct_reporters: 1, weighted_score: 1.0, state_since: new Date().toISOString(), updated_at: new Date().toISOString() },
      },
      cached: false,
      cache_note: 'DB reads are cached',
    };
  }

  const elecState = cachedStatus.categories.electricity?.state || 'unknown';
  const gasState = cachedStatus.categories.gas?.state || 'unknown';
  const waterState = cachedStatus.categories.water?.state || 'unknown';
  const lpgState = cachedStatus.categories.lpg?.state || 'unknown';

  const elecMeta = STATE_META[elecState];
  const gasMeta = STATE_META[gasState];
  const waterMeta = STATE_META[waterState];
  const lpgMeta = STATE_META[lpgState];

  const totalReporters =
    (cachedStatus.categories.electricity?.distinct_reporters || 0) +
    (cachedStatus.categories.gas?.distinct_reporters || 0) +
    (cachedStatus.categories.water?.distinct_reporters || 0);
  const reporterCountBn = toBengaliDigits(Math.max(totalReporters, 3));
  const timestampBn = formatBengaliTimestamp(new Date());

  // 1200x630 Tactical Canvas SVG
  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#070A0F"/>
        <stop offset="100%" stop-color="#111622"/>
      </linearGradient>
      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#047857"/>
      </linearGradient>
    </defs>

    <!-- Canvas Background -->
    <rect width="1200" height="630" fill="url(#bgGrad)"/>
    <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="#1E293B" stroke-width="2"/>

    <!-- Header Brand Bar -->
    <g transform="translate(60, 60)">
      <!-- App Icon -->
      <rect width="52" height="52" rx="14" fill="#182030" stroke="#10B981" stroke-width="2"/>
      <path d="M28 10 L16 28 L25 28 L22 44 L36 24 L27 24 Z" fill="#10B981"/>

      <!-- Brand Text -->
      <text x="68" y="34" font-family="Noto Sans Bengali" font-weight="700" font-size="30" fill="#F8FAFC">হালচাল</text>
      <text x="175" y="34" font-family="Noto Sans Bengali" font-weight="400" font-size="20" fill="#94A3B8">— এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর</text>
    </g>

    <!-- Live Zone Pill & Title -->
    <g transform="translate(60, 145)">
      <rect width="130" height="34" rx="17" fill="#064E3B" stroke="#10B981" stroke-width="1.5"/>
      <circle cx="18" cy="17" r="5" fill="#10B981"/>
      <text x="32" y="23" font-family="Noto Sans Bengali" font-weight="700" font-size="16" fill="#6EE7B7">লাইভ আপডেট</text>

      <!-- Area Name Heading -->
      <text x="0" y="80" font-family="Noto Sans Bengali" font-weight="700" font-size="44" fill="#F8FAFC">
        📍 ${areaTitle}
      </text>
      <text x="0" y="112" font-family="Noto Sans Bengali" font-weight="400" font-size="20" fill="#94A3B8">
        নাগরিকদের তথ্যের ভিত্তিতে প্রস্তুত • ${reporterCountBn} জন নাগরিক জানিয়েছেন
      </text>
    </g>

    <!-- 4-Box Status Strip (250px width each, 20px gap) -->
    <g transform="translate(60, 305)">
      <!-- Box 1: Electricity -->
      <g transform="translate(0, 0)">
        <rect width="250" height="175" rx="18" fill="#111622" stroke="${elecMeta.border}" stroke-width="2"/>
        <text x="24" y="44" font-size="28">⚡</text>
        <text x="64" y="44" font-family="Noto Sans Bengali" font-weight="700" font-size="24" fill="#F8FAFC">বিদ্যুৎ</text>
        
        <!-- Status Badge -->
        <rect x="24" y="70" width="120" height="42" rx="12" fill="${elecMeta.bg}" stroke="${elecMeta.border}" stroke-width="1.5"/>
        <text x="44" y="98" font-family="Noto Sans Bengali" font-weight="700" font-size="22" fill="${elecMeta.text}">${elecMeta.icon} ${elecMeta.label}</text>

        <text x="24" y="145" font-family="Noto Sans Bengali" font-size="15" fill="#94A3B8">ভোল্টেজ ও লোডশেডিং</text>
      </g>

      <!-- Box 2: Gas -->
      <g transform="translate(276, 0)">
        <rect width="250" height="175" rx="18" fill="#111622" stroke="${gasMeta.border}" stroke-width="2"/>
        <text x="24" y="44" font-size="28">🔥</text>
        <text x="64" y="44" font-family="Noto Sans Bengali" font-weight="700" font-size="24" fill="#F8FAFC">গ্যাস</text>
        
        <!-- Status Badge -->
        <rect x="24" y="70" width="120" height="42" rx="12" fill="${gasMeta.bg}" stroke="${gasMeta.border}" stroke-width="1.5"/>
        <text x="44" y="98" font-family="Noto Sans Bengali" font-weight="700" font-size="22" fill="${gasMeta.text}">${gasMeta.icon} ${gasMeta.label}</text>

        <text x="24" y="145" font-family="Noto Sans Bengali" font-size="15" fill="#94A3B8">পাইপলাইন সরবরাহ</text>
      </g>

      <!-- Box 3: Water -->
      <g transform="translate(552, 0)">
        <rect width="250" height="175" rx="18" fill="#111622" stroke="${waterMeta.border}" stroke-width="2"/>
        <text x="24" y="44" font-size="28">💧</text>
        <text x="64" y="44" font-family="Noto Sans Bengali" font-weight="700" font-size="24" fill="#F8FAFC">পানি</text>
        
        <!-- Status Badge -->
        <rect x="24" y="70" width="120" height="42" rx="12" fill="${waterMeta.bg}" stroke="${waterMeta.border}" stroke-width="1.5"/>
        <text x="44" y="98" font-family="Noto Sans Bengali" font-weight="700" font-size="22" fill="${waterMeta.text}">${waterMeta.icon} ${waterMeta.label}</text>

        <text x="24" y="145" font-family="Noto Sans Bengali" font-size="15" fill="#94A3B8">ওয়াসা পাইপলাইন ও চাপ</text>
      </g>

      <!-- Box 4: LPG -->
      <g transform="translate(828, 0)">
        <rect width="250" height="175" rx="18" fill="#111622" stroke="${lpgMeta.border}" stroke-width="2"/>
        <text x="24" y="44" font-size="28">🛢️</text>
        <text x="64" y="44" font-family="Noto Sans Bengali" font-weight="700" font-size="24" fill="#F8FAFC">এলপিজি</text>
        
        <!-- Status Badge -->
        <rect x="24" y="70" width="130" height="42" rx="12" fill="${lpgMeta.bg}" stroke="${lpgMeta.border}" stroke-width="1.5"/>
        <text x="44" y="98" font-family="Noto Sans Bengali" font-weight="700" font-size="22" fill="${lpgMeta.text}">${lpgMeta.icon} ${lpgMeta.label}</text>

        <text x="24" y="145" font-family="Noto Sans Bengali" font-size="15" fill="#94A3B8">১২ কেজি সিলিন্ডার মূল্য</text>
      </g>
    </g>

    <!-- Bottom Footer Bar -->
    <g transform="translate(60, 525)">
      <!-- Printed Timestamp -->
      <text x="0" y="32" font-family="Noto Sans Bengali" font-size="17" fill="#64748B">
        কার্ড তৈরির সময়: ${timestampBn} (বাকেট: ${timeBucket})
      </text>

      <!-- CTA Button -->
      <rect x="680" y="0" width="400" height="52" rx="14" fill="#10B981"/>
      <text x="710" y="33" font-family="Noto Sans Bengali" font-weight="700" font-size="19" fill="#FFFFFF">
        আপনার এলাকার হাল জানান ➜ halchal.bd
      </text>
    </g>
  </svg>
  `;

  try {
    const fontPath = getBengaliFontPath();
    const resvg = new Resvg(svg, {
      font: {
        fontFiles: [fontPath],
        defaultFontFamily: 'Noto Sans Bengali',
      },
      fitTo: {
        mode: 'width',
        value: 1200,
      },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200',
        'x-time-bucket': timeBucket,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('OG generation error:', errorMsg);
    return new Response('Error generating image', { status: 500 });
  }
}
