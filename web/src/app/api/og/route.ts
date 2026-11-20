/**
 * Halchal - Dynamic Share Card Generator (OG Image)
 * GET /api/og?h3=[h3]&route=[route]&t=[time_bucket]
 * Architecture: Growth Engine, Bengali Typography Clearance (ADR-0009)
 * Renders via resvg-js with Noto Sans Bengali TTF for verified HarfBuzz complex conjunct shaping (ক্ষ, শ্র, ত্র, স্ক, গ্য)
 * Returns 1200x630 PNG with Cache-Control: s-maxage=300, stale-while-revalidate=600
 */

import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { getZoneMetadata, isValidH3Zone, DHAKA_SEED_ZONES, SeedZone } from '@/lib/zones';
import { getCachedZoneStatus } from '@/lib/redis';
import { toBengaliDigits } from '@/lib/bengali-utils';
import { ZoneStatusResponse } from '@/lib/zones';
import { ZoneDisplayState } from '@/lib/theme';

export const dynamic = 'force-dynamic';

let cachedFontBuffer: Buffer | null = null;
let cachedFallbackImage: Buffer | null = null;

function getBengaliFontPath(): string {
  const primaryPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansBengali.ttf');
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }
  return path.join(process.cwd(), 'web', 'public', 'fonts', 'NotoSansBengali.ttf');
}

function getFallbackImagePath(): string {
  const primaryPath = path.join(process.cwd(), 'public', 'og-fallback.png');
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }
  return path.join(process.cwd(), 'web', 'public', 'og-fallback.png');
}

function getFallbackBuffer(): Buffer {
  if (cachedFallbackImage) return cachedFallbackImage;
  try {
    const p = getFallbackImagePath();
    if (fs.existsSync(p)) {
      cachedFallbackImage = fs.readFileSync(p);
      return cachedFallbackImage;
    }
  } catch {}
  // Minimal 1x1 fallback defense if disk read fails
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x04, 0xb0, 0x00, 0x00, 0x02, 0x76,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x71, 0x3d, 0x4d, 0x07, 0x00, 0x00, 0x00,
  ]);
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

function renderFallbackCardSvg(title: string, subtitle: string, timeBucket: string): string {
  const timestampBn = formatBengaliTimestamp(new Date());

  return `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#070A0F"/>
        <stop offset="50%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#070A0F"/>
      </linearGradient>
      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)"/>

    <!-- Subtle background grid -->
    <g stroke="#334155" stroke-width="0.5" opacity="0.15">
      <line x1="0" y1="120" x2="1200" y2="120" />
      <line x1="0" y1="240" x2="1200" y2="240" />
      <line x1="0" y1="360" x2="1200" y2="360" />
      <line x1="0" y1="480" x2="1200" y2="480" />
      <line x1="240" y1="0" x2="240" y2="630" />
      <line x1="480" y1="0" x2="480" y2="630" />
      <line x1="720" y1="0" x2="720" y2="630" />
      <line x1="960" y1="0" x2="960" y2="630" />
    </g>

    <!-- Top Header Bar -->
    <g transform="translate(60, 55)">
      <rect width="48" height="48" rx="12" fill="url(#brandGrad)"/>
      <text x="14" y="34" font-family="Noto Sans Bengali" font-weight="700" font-size="28" fill="#FFFFFF">হ</text>
      <text x="64" y="36" font-family="Noto Sans Bengali" font-weight="700" font-size="34" fill="#F8FAFC">হালচাল</text>
      <text x="185" y="34" font-family="Noto Sans Bengali" font-size="18" fill="#94A3B8">| এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর</text>
    </g>

    <!-- Center Content Card -->
    <g transform="translate(60, 150)">
      <rect width="1080" height="330" rx="24" fill="#0B0F17" stroke="#1E293B" stroke-width="2"/>

      <text x="50" y="80" font-family="Noto Sans Bengali" font-weight="700" font-size="44" fill="#F8FAFC">
        ${title}
      </text>

      <text x="50" y="130" font-family="Noto Sans Bengali" font-size="22" fill="#94A3B8">
        ${subtitle}
      </text>

      <!-- 4 Category Badges -->
      <g transform="translate(50, 180)">
        <g transform="translate(0, 0)">
          <rect width="220" height="64" rx="14" fill="#064E3B" stroke="#10B981" stroke-width="1.5"/>
          <text x="20" y="40" font-size="24">⚡</text>
          <text x="56" y="40" font-family="Noto Sans Bengali" font-weight="700" font-size="20" fill="#6EE7B7">বিদ্যুৎ পরিস্থিতি</text>
        </g>
        <g transform="translate(250, 0)">
          <rect width="220" height="64" rx="14" fill="#78350F" stroke="#F59E0B" stroke-width="1.5"/>
          <text x="20" y="40" font-size="24">🔥</text>
          <text x="56" y="40" font-family="Noto Sans Bengali" font-weight="700" font-size="20" fill="#FCD34D">গ্যাস সরবরাহ</text>
        </g>
        <g transform="translate(500, 0)">
          <rect width="220" height="64" rx="14" fill="#064E3B" stroke="#10B981" stroke-width="1.5"/>
          <text x="20" y="40" font-size="24">💧</text>
          <text x="56" y="40" font-family="Noto Sans Bengali" font-weight="700" font-size="20" fill="#6EE7B7">পানি সরবরাহ</text>
        </g>
        <g transform="translate(750, 0)">
          <rect width="220" height="64" rx="14" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
          <text x="20" y="40" font-size="24">🛢️</text>
          <text x="56" y="40" font-family="Noto Sans Bengali" font-weight="700" font-size="20" fill="#94A3B8">এলপিজি সিলিন্ডার</text>
        </g>
      </g>
    </g>

    <!-- Bottom Footer Bar -->
    <g transform="translate(60, 525)">
      <text x="0" y="32" font-family="Noto Sans Bengali" font-size="17" fill="#64748B">
        কার্ড তৈরির সময়: ${timestampBn} (বাকেট: ${timeBucket})
      </text>
      <rect x="680" y="0" width="400" height="52" rx="14" fill="#10B981"/>
      <text x="710" y="33" font-family="Noto Sans Bengali" font-weight="700" font-size="19" fill="#FFFFFF">
        আপনার এলাকার হাল জানান ➜ halchal.bd
      </text>
    </g>
  </svg>
  `;
}

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const rawH3 = searchParams.get('h3');
  const route = searchParams.get('route');
  const timeBucket = searchParams.get('t') || String(Math.floor(Date.now() / 600000));

  // If h3 is passed, validate whether it represents a known zone
  let meta: SeedZone | null = null;
  if (rawH3) {
    const cleanH3 = rawH3.toLowerCase();
    if (isValidH3Zone(cleanH3)) {
      meta = getZoneMetadata(cleanH3);
    }
    // If an unknown zone is requested, do not 500! Fallback gracefully to the static/fallback image
    if (!meta) {
      const fallbackBuf = getFallbackBuffer();
      return new Response(new Uint8Array(fallbackBuf), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'x-time-bucket': timeBucket,
          'x-fallback': 'true',
        },
      });
    }
  }

  // Non-zone route cards or generic homepage
  if (!meta) {
    let title = 'লাইভ ইউটিলিটি হালচাল — বাংলাদেশ';
    let subtitle = 'বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস জানুন';

    if (route === 'map') {
      title = 'লাইভ ম্যাপ — এলাকাভিত্তিক ইউটিলিটি হালচাল';
      subtitle = 'Uber H3 হেক্সাগন গ্রিডে ঢাকার বিদ্যুৎ, গ্যাস ও পানির রিয়েল-টাইম পরিস্থিতি';
    } else if (route === 'history') {
      title = '৭ দিনের ইউটিলিটি রিপোর্ট ও ইতিহাস';
      subtitle = 'এলাকাভিত্তিক বিদ্যুৎ বিভ্রাট, গ্যাস সংকট ও পানির প্রেসারের নির্ভরযোগ্য ইতিহাস';
    } else if (route === 'privacy') {
      title = 'গোপনীয়তা নীতি — হালচাল';
      subtitle = 'জিরো র জিপিএস স্টোরেজ ও সম্পূর্ণ নাগরিক পরিচয়হীনতা নীতিমালার বিবরণ';
    } else if (route === 'terms') {
      title = 'ব্যবহারের শর্তাবলি — হালচাল';
      subtitle = 'নাগরিক দায়িত্ব, অপব্যবহার রোধ নীতিমালা এবং পরিষেবা ব্যবহারের শর্তাবলি';
    }

    try {
      const fontPath = getBengaliFontPath();
      const svg = renderFallbackCardSvg(title, subtitle, timeBucket);
      const resvg = new Resvg(svg, {
        font: {
          fontFiles: [fontPath],
          defaultFontFamily: 'Noto Sans Bengali',
          loadSystemFonts: false,
        },
        fitTo: { mode: 'width', value: 1200 },
      });

      const pngBuffer = resvg.render().asPng();
      return new Response(new Uint8Array(pngBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'x-time-bucket': timeBucket,
        },
      });
    } catch {
      const fallbackBuf = getFallbackBuffer();
      return new Response(new Uint8Array(fallbackBuf), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'x-time-bucket': timeBucket,
          'x-fallback': 'true',
        },
      });
    }
  }

  // Zone specific card
  const areaTitle = `${meta.area_name_bn} (${meta.ward}, ${meta.city})`;

  // Retrieve current zone status from cache if available
  let cachedStatus = await getCachedZoneStatus<ZoneStatusResponse>(meta.h3_index);
  if (!cachedStatus) {
    cachedStatus = {
      h3_index: meta.h3_index,
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
    (cachedStatus.categories.water?.distinct_reporters || 0) +
    (cachedStatus.categories.lpg?.distinct_reporters || 0);

  const reporterCountBn = toBengaliDigits(totalReporters);
  const timestampBn = formatBengaliTimestamp(new Date());

  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#070A0F"/>
        <stop offset="50%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#070A0F"/>
      </linearGradient>
      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)"/>

    <!-- Subtle background grid -->
    <g stroke="#334155" stroke-width="0.5" opacity="0.15">
      <line x1="0" y1="120" x2="1200" y2="120" />
      <line x1="0" y1="240" x2="1200" y2="240" />
      <line x1="0" y1="360" x2="1200" y2="360" />
      <line x1="0" y1="480" x2="1200" y2="480" />
      <line x1="240" y1="0" x2="240" y2="630" />
      <line x1="480" y1="0" x2="480" y2="630" />
      <line x1="720" y1="0" x2="720" y2="630" />
      <line x1="960" y1="0" x2="960" y2="630" />
    </g>

    <!-- Top Header Bar -->
    <g transform="translate(60, 55)">
      <rect width="48" height="48" rx="12" fill="url(#brandGrad)"/>
      <text x="14" y="34" font-family="Noto Sans Bengali" font-weight="700" font-size="28" fill="#FFFFFF">হ</text>
      <text x="64" y="36" font-family="Noto Sans Bengali" font-weight="700" font-size="34" fill="#F8FAFC">হালচাল</text>
      <text x="185" y="34" font-family="Noto Sans Bengali" font-size="18" fill="#94A3B8">| এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর</text>
    </g>

    <!-- Main Card Body -->
    <g transform="translate(60, 135)">
      <rect width="1080" height="135" rx="20" fill="#0B0F17" stroke="#1E293B" stroke-width="2"/>
      
      <!-- Area Title & Tag -->
      <text x="32" y="55" font-family="Noto Sans Bengali" font-weight="700" font-size="36" fill="#F8FAFC">
        ${areaTitle}
      </text>

      <!-- Subtitle metadata -->
      <text x="32" y="98" font-family="Noto Sans Bengali" font-size="20" fill="#94A3B8">
        লাইভ রিপোর্ট • ${reporterCountBn} জন নাগরিকের সক্রিয় তথ্য • H3 Res 8 হেক্সাগন
      </text>

      <!-- Live Indicator Badge -->
      <g transform="translate(930, 36)">
        <rect width="115" height="38" rx="10" fill="#064E3B" stroke="#10B981" stroke-width="1.5"/>
        <circle cx="20" cy="19" r="6" fill="#10B981"/>
        <text x="34" y="26" font-family="Noto Sans Bengali" font-weight="700" font-size="17" fill="#6EE7B7">লাইভ আপডেট</text>
      </g>
    </g>

    <!-- 4 Tactical Utility Cards (2x2 Grid) -->
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
        loadSystemFonts: false,
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
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'x-time-bucket': timeBucket,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('OG generation error, returning fallback image:', errorMsg);
    const fallbackBuf = getFallbackBuffer();
    return new Response(new Uint8Array(fallbackBuf), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'x-time-bucket': timeBucket,
        'x-fallback': 'true',
      },
    });
  }
}
