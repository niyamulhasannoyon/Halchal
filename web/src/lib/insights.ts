/**
 * Halchal - 7-Day Community Reliability Insights Engine
 * Module: insights.ts
 *
 * Implements deterministic Bengali template generators with strict thresholds,
 * time window formatters, and type definitions for 7-day utility insights.
 */

import { UtilityCategory, ZoneDisplayState } from './theme';
import { toBengaliDigits, formatBengaliCurrency } from './bengali-utils';

export interface HourlyBlock {
  block_index: number;
  hours_label_bn: string;
  start_hour: number;
  end_hour: number;
  state: ZoneDisplayState;
  minutes_out: number;
  minutes_low: number;
}

export interface HeatmapDay {
  date: string;
  day_name_bn: string;
  blocks: HourlyBlock[];
}

export interface CategoryInsight {
  category: UtilityCategory;
  total_outage_minutes: number;
  outage_event_count: number;
  hourly_pattern: number[]; // 24 values: share of last 7 days (0.0 to 1.0)
  heatmap: HeatmapDay[]; // 7 rows x 6 blocks
  insight_bn: string;
}

export interface LpgPriceInsight {
  area_median: number;
  official_price: number;
  official_effective_from: string;
  report_count: number;
}

export interface Zone7DayInsights {
  h3_index: string;
  area_name_bn: string;
  ward: string;
  city: string;
  data_confidence: 'ok' | 'insufficient';
  distinct_days: number;
  total_reporters: number;
  categories: Record<UtilityCategory, CategoryInsight>;
  lpg_price: LpgPriceInsight | null;
  insight_bn: string;
  generated_at: string;
  cached?: boolean;
  hourly_heatmap?: any;
}

export const INSUFFICIENT_DATA_BN = 'এখনো পর্যাপ্ত তথ্য নেই (কমপক্ষে ৩ দিনের রিপোর্ট লাগবে)।';

export const BIAS_DISCLAIMER_BN =
  'নাগরিকরা মূলত সমস্যা চলাকালীন বেশি রিপোর্ট করেন, তাই এই তথ্যগুলো কোনো সরকারি পরিমাপ নয় বরং এলাকার সার্বিক পরিস্থিতির নির্দেশক মাত্র।';

export const COMPLAINT_CARD_FOOTER_BN =
  'কমিউনিটি-রিপোর্টেড তথ্য, সরকারি পরিমাপ নয়। হালচাল ব্যবহারকারীদের রিপোর্ট থেকে তৈরি।';

/**
 * Formats a 24-hour integer (0-23) into standard Bengali colloquial time phrase.
 * Example: 10 -> "সকাল ১০টা", 14 -> "দুপুর ২টা", 18 -> "সন্ধ্যা ৬টা", 22 -> "রাত ১০টা"
 */
export function formatHourBn(hour: number): string {
  const h = ((hour % 24) + 24) % 24;

  switch (h) {
    case 0:
      return 'রাত ১২টা';
    case 1:
      return 'রাত ১টা';
    case 2:
      return 'রাত ২টা';
    case 3:
      return 'রাত ৩টা';
    case 4:
      return 'ভোর ৪টা';
    case 5:
      return 'ভোর ৫টা';
    case 6:
      return 'সকাল ৬টা';
    case 7:
      return 'সকাল ৭টা';
    case 8:
      return 'সকাল ৮টা';
    case 9:
      return 'সকাল ৯টা';
    case 10:
      return 'সকাল ১০টা';
    case 11:
      return 'সকাল ১১টা';
    case 12:
      return 'দুপুর ১২টা';
    case 13:
      return 'দুপুর ১টা';
    case 14:
      return 'দুপুর ২টা';
    case 15:
      return 'দুপুর ৩টা';
    case 16:
      return 'বিকাল ৪টা';
    case 17:
      return 'বিকাল ৫টা';
    case 18:
      return 'সন্ধ্যা ৬টা';
    case 19:
      return 'সন্ধ্যা ৭টা';
    case 20:
      return 'রাত ৮টা';
    case 21:
      return 'রাত ৯টা';
    case 22:
      return 'রাত ১০টা';
    case 23:
      return 'রাত ১১টা';
    default:
      return '';
  }
}

/**
 * Formats a time range window into authentic colloquial Bengali.
 * Example: start=10, end=14 -> "সকাল ১০টা থেকে দুপুর ২টার মধ্যে"
 */
export function formatHourRangeBn(startHour: number, endHour: number): string {
  const startStr = formatHourBn(startHour);
  const endStr = formatHourBn(endHour);
  const suffix = endStr.endsWith('টা') ? `${endStr}র` : endStr;
  return `${startStr} থেকে ${suffix} মধ্যে`;
}

/**
 * Detects the longest contiguous streak of problem hours (share >= threshold).
 * Returns { startHour, endHour, length } or null if no streak >= minLength.
 */
export function findPeakProblemStreak(
  hourlyPattern: number[],
  threshold = 0.4, // At least ~3 of 7 days
  minLength = 2
): { startHour: number; endHour: number; length: number } | null {
  if (!hourlyPattern || hourlyPattern.length !== 24) return null;

  let maxStart = -1;
  let maxLength = 0;
  let curStart = -1;
  let curLength = 0;

  for (let h = 0; h < 24; h++) {
    if (hourlyPattern[h] >= threshold) {
      if (curStart === -1) {
        curStart = h;
        curLength = 1;
      } else {
        curLength++;
      }

      if (curLength > maxLength) {
        maxLength = curLength;
        maxStart = curStart;
      }
    } else {
      curStart = -1;
      curLength = 0;
    }
  }

  if (maxLength >= minLength && maxStart !== -1) {
    const endHour = (maxStart + maxLength) % 24;
    return { startHour: maxStart, endHour, length: maxLength };
  }

  return null;
}

/**
 * Generates a deterministic Bengali insight for a utility category.
 */
export function generateCategoryInsight(params: {
  category: UtilityCategory;
  data_confidence: 'ok' | 'insufficient';
  total_outage_minutes: number;
  outage_event_count: number;
  hourly_pattern: number[];
  lpg_price?: LpgPriceInsight | null;
}): string {
  const { category, data_confidence, total_outage_minutes, outage_event_count, hourly_pattern, lpg_price } = params;

  if (data_confidence === 'insufficient') {
    return INSUFFICIENT_DATA_BN;
  }

  // 1. Check for peak problem streaks (e.g. 10 AM to 2 PM)
  const peakStreak = findPeakProblemStreak(hourly_pattern, 0.4, 2);
  if (peakStreak) {
    const rangeStr = formatHourRangeBn(peakStreak.startHour, peakStreak.endHour);
    switch (category) {
      case 'gas':
        return `এই এলাকায় সাধারণত ${rangeStr} গ্যাসের চাপ কম থাকে।`;
      case 'electricity':
        return `এই এলাকায় সাধারণত ${rangeStr} বিদ্যুৎ বিভ্রাট বেশি হয়।`;
      case 'water':
        return `এই এলাকায় সাধারণত ${rangeStr} পানির চাপ কম থাকে।`;
      case 'lpg':
        return `এই এলাকায় সাধারণত ${rangeStr} এলপিজি সংকট বেশি দেখা যায়।`;
    }
  }

  // 2. Electricity outage summary card template: "এই সপ্তাহে ৪ বার কারেন্ট গেছে • মোট ৯ ঘণ্টা"
  if (category === 'electricity' && outage_event_count > 0) {
    const hours = Math.max(1, Math.round(total_outage_minutes / 60));
    return `এই সপ্তাহে ${toBengaliDigits(outage_event_count)} বার কারেন্ট গেছে • মোট ${toBengaliDigits(hours)} ঘণ্টা`;
  }

  // 3. LPG Price insight
  if (category === 'lpg' && lpg_price && lpg_price.area_median) {
    return `এই এলাকায় ১২ কেজি এলপিজির বর্তমান গড় বাজারদর ৳ ${formatBengaliCurrency(Math.round(lpg_price.area_median))}।`;
  }

  // 4. Minor issues or clean week fallbacks
  if (total_outage_minutes > 0) {
    if (category === 'gas') return 'এই সপ্তাহে মাঝে মাঝে গ্যাসের চাপ কম ছিল।';
    if (category === 'water') return 'এই সপ্তাহে মাঝে মাঝে পানি সরবরাহ বিঘ্নিত হয়েছিল।';
    if (category === 'electricity') return 'এই সপ্তাহে স্বল্প সময়ের জন্য বিদ্যুৎ বিচ্ছিন্ন ছিল।';
  }

  return 'এই সপ্তাহে ইউটিলিটি পরিষেবা অধিকাংশ সময় স্বাভাবিক ছিল।';
}

/**
 * Evaluates the overall zone-level primary insight.
 */
export function generateZonePrimaryInsight(insights: {
  data_confidence: 'ok' | 'insufficient';
  categories: Partial<Record<UtilityCategory, CategoryInsight>>;
}): string {
  if (insights.data_confidence === 'insufficient') {
    return INSUFFICIENT_DATA_BN;
  }

  const gasInsight = insights.categories.gas?.insight_bn;
  if (gasInsight && gasInsight.includes('গ্যাসের চাপ কম থাকে')) {
    return gasInsight;
  }

  const elecInsight = insights.categories.electricity?.insight_bn;
  if (elecInsight && elecInsight.includes('বিদ্যুৎ বিভ্রাট বেশি হয়')) {
    return elecInsight;
  }

  const elecCategory = insights.categories.electricity;
  if (elecCategory && elecCategory.outage_event_count > 0) {
    const hours = Math.max(1, Math.round(elecCategory.total_outage_minutes / 60));
    return `এই সপ্তাহে ${toBengaliDigits(elecCategory.outage_event_count)} বার কারেন্ট গেছে • মোট ${toBengaliDigits(hours)} ঘণ্টা`;
  }

  return 'এই সপ্তাহে এলাকার ইউটিলিটি পরিষেবা অধিকাংশ সময় স্বাভাবিক ছিল।';
}

const BENGALI_DAY_NAMES = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

export function generateEmptyHeatmap(): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const now = new Date();
  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dayName = BENGALI_DAY_NAMES[dayDate.getDay()];
    const dateStr = dayDate.toISOString().split('T')[0];
    const blocks: HourlyBlock[] = [];
    for (let b = 0; b < 6; b++) {
      const startH = b * 4;
      const endH = startH + 3;
      blocks.push({
        block_index: b,
        hours_label_bn: `${formatHourBn(startH)} - ${formatHourBn((endH + 1) % 24)}`,
        start_hour: startH,
        end_hour: endH,
        state: 'unknown',
        minutes_out: 0,
        minutes_low: 0,
      });
    }
    days.push({
      date: dateStr,
      day_name_bn: dayName,
      blocks,
    });
  }
  return days;
}

/**
 * Creates default or demo 7-day insights for an H3 zone.
 */
export function createDefaultZone7DayInsights(
  h3: string,
  areaNameBn = 'ঢাকা এলাকা',
  ward = 'ওয়ার্ড অজ্ঞাত',
  city = 'ঢাকা',
  options?: { isSynthetic?: boolean }
): Zone7DayInsights {
  const now = new Date();
  const isSynthetic = options?.isSynthetic ?? false;

  const emptyHeatmap = generateEmptyHeatmap();

  if (!isSynthetic) {
    const categories: Record<UtilityCategory, CategoryInsight> = {
      electricity: {
        category: 'electricity',
        total_outage_minutes: 0,
        outage_event_count: 0,
        hourly_pattern: new Array(24).fill(0),
        heatmap: emptyHeatmap,
        insight_bn: INSUFFICIENT_DATA_BN,
      },
      gas: {
        category: 'gas',
        total_outage_minutes: 0,
        outage_event_count: 0,
        hourly_pattern: new Array(24).fill(0),
        heatmap: emptyHeatmap,
        insight_bn: INSUFFICIENT_DATA_BN,
      },
      water: {
        category: 'water',
        total_outage_minutes: 0,
        outage_event_count: 0,
        hourly_pattern: new Array(24).fill(0),
        heatmap: emptyHeatmap,
        insight_bn: INSUFFICIENT_DATA_BN,
      },
      lpg: {
        category: 'lpg',
        total_outage_minutes: 0,
        outage_event_count: 0,
        hourly_pattern: new Array(24).fill(0),
        heatmap: emptyHeatmap,
        insight_bn: INSUFFICIENT_DATA_BN,
      },
    };

    return {
      h3_index: h3,
      area_name_bn: areaNameBn,
      ward,
      city,
      data_confidence: 'insufficient',
      distinct_days: 0,
      total_reporters: 0,
      categories,
      lpg_price: null,
      insight_bn: INSUFFICIENT_DATA_BN,
      generated_at: now.toISOString(),
      cached: false,
    };
  }

  // Realistic synthetic pattern for authentic Dhaka zone experience
  // Electricity: 4 outages, 9 hours (540 min), evening load shedding pattern
  const elecPattern = new Array(24).fill(0.0);
  elecPattern[18] = 0.43;
  elecPattern[19] = 0.43;
  elecPattern[20] = 0.43;
  elecPattern[21] = 0.29;

  const elecHeatmap = generateEmptyHeatmap().map((day, idx) => {
    // 4 days had outages in evening block 4 (16:00 - 20:00) or block 5 (20:00 - 24:00)
    const blocks = day.blocks.map((blk) => {
      if ((idx === 1 || idx === 2 || idx === 4 || idx === 5) && (blk.block_index === 4 || blk.block_index === 5)) {
        return {
          ...blk,
          state: 'out' as ZoneDisplayState,
          minutes_out: idx % 2 === 0 ? 120 : 150,
          minutes_low: 0,
        };
      }
      return {
        ...blk,
        state: 'ok' as ZoneDisplayState,
        minutes_out: 0,
        minutes_low: 0,
      };
    });
    return { ...day, blocks };
  });

  // Gas: Low pressure recurring between 10:00 and 14:00 (10 AM to 2 PM) on 3 days
  const gasPattern = new Array(24).fill(0.0);
  gasPattern[10] = 0.43;
  gasPattern[11] = 0.43;
  gasPattern[12] = 0.43;
  gasPattern[13] = 0.43;

  const gasHeatmap = generateEmptyHeatmap().map((day, idx) => {
    const blocks = day.blocks.map((blk) => {
      // Block 2: 08:00 - 12:00, Block 3: 12:00 - 16:00
      if ((idx === 2 || idx === 3 || idx === 4) && (blk.block_index === 2 || blk.block_index === 3)) {
        return {
          ...blk,
          state: 'low' as ZoneDisplayState,
          minutes_out: 0,
          minutes_low: 120,
        };
      }
      return {
        ...blk,
        state: 'ok' as ZoneDisplayState,
        minutes_out: 0,
        minutes_low: 0,
      };
    });
    return { ...day, blocks };
  });

  const waterHeatmap = generateEmptyHeatmap().map((day) => ({
    ...day,
    blocks: day.blocks.map((blk) => ({
      ...blk,
      state: 'ok' as ZoneDisplayState,
      minutes_out: 0,
      minutes_low: 0,
    })),
  }));

  const categories: Record<UtilityCategory, CategoryInsight> = {
    electricity: {
      category: 'electricity',
      total_outage_minutes: 540,
      outage_event_count: 4,
      hourly_pattern: elecPattern,
      heatmap: elecHeatmap,
      insight_bn: 'এই সপ্তাহে ৪ বার কারেন্ট গেছে • মোট ৯ ঘণ্টা',
    },
    gas: {
      category: 'gas',
      total_outage_minutes: 120,
      outage_event_count: 2,
      hourly_pattern: gasPattern,
      heatmap: gasHeatmap,
      insight_bn: 'এই এলাকায় সাধারণত সকাল ১০টা থেকে দুপুর ২টার মধ্যে গ্যাসের চাপ কম থাকে।',
    },
    water: {
      category: 'water',
      total_outage_minutes: 0,
      outage_event_count: 0,
      hourly_pattern: new Array(24).fill(0.0),
      heatmap: waterHeatmap,
      insight_bn: 'এই সপ্তাহে পানির সরবরাহ অধিকাংশ সময় স্বাভাবিক ছিল।',
    },
    lpg: {
      category: 'lpg',
      total_outage_minutes: 0,
      outage_event_count: 0,
      hourly_pattern: new Array(24).fill(0.0),
      heatmap: emptyHeatmap,
      insight_bn: 'এই এলাকায় ১২ কেজি এলপিজির বর্তমান গড় বাজারদর ৳ ১,৪২০।',
    },
  };

  return {
    h3_index: h3,
    area_name_bn: areaNameBn,
    ward,
    city,
    data_confidence: 'ok',
    distinct_days: 5,
    total_reporters: 18,
    categories,
    lpg_price: {
      area_median: 1420,
      official_price: 1455,
      official_effective_from: '2026-11-01',
      report_count: 7,
    },
    insight_bn: 'এই এলাকায় সাধারণত সকাল ১০টা থেকে দুপুর ২টার মধ্যে গ্যাসের চাপ কম থাকে।',
    generated_at: now.toISOString(),
    cached: false,
  };
}
