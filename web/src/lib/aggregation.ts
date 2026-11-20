/**
 * Halchal - Spatial Zone Aggregation & Deterministic Summary Engine
 * Architecture: Technical SEO Foundation & Human-Readable Area Architecture
 *
 * Implements:
 * 1. Multi-H3 Cell Aggregation Rule: "Worst confirmed state wins, with counts"
 * 2. Deterministic Bengali Text Summary Template Engine
 */

import { UtilityCategory, ZoneDisplayState } from '@/lib/theme';
import { ZoneCategoryStatus, ZoneStatusResponse } from '@/lib/zones';
import { toBengaliDigits, formatRelativeTimeBn } from '@/lib/bengali-utils';

/**
 * State severity hierarchy.
 * Confirmed states strictly rank higher than unconfirmed/unknown.
 * Among confirmed states: 'out' (worst) > 'low' > 'ok' (best).
 */
const STATE_SEVERITY_WEIGHT: Record<ZoneDisplayState, number> = {
  out: 50,       // Worst confirmed state
  low: 40,       // Second-worst confirmed state
  ok: 30,        // Normal confirmed state
  unverified: 10,// Citizen reports exist but below threshold
  unknown: 0,    // No active citizen reports
};

/**
 * Aggregates utility statuses across one or more H3 cells for an area.
 * Rule: Worst confirmed state wins, with aggregated reporter counts.
 */
export function aggregateZoneStatuses(
  statuses: ZoneStatusResponse[],
  areaMeta?: {
    areaNameBn?: string;
    ward?: string;
    city?: string;
  }
): ZoneStatusResponse {
  if (!statuses || statuses.length === 0) {
    const now = new Date().toISOString();
    return {
      h3_index: 'aggregated',
      area_name_bn: areaMeta?.areaNameBn || 'এলাকা',
      ward: areaMeta?.ward || '',
      city: areaMeta?.city || 'ঢাকা',
      updated_at: now,
      categories: {
        electricity: {
          category: 'electricity',
          state: 'unknown',
          distinct_reporters: 0,
          weighted_score: 0,
          state_since: now,
          updated_at: now,
        },
        gas: {
          category: 'gas',
          state: 'unknown',
          distinct_reporters: 0,
          weighted_score: 0,
          state_since: now,
          updated_at: now,
        },
        water: {
          category: 'water',
          state: 'unknown',
          distinct_reporters: 0,
          weighted_score: 0,
          state_since: now,
          updated_at: now,
        },
        lpg: {
          category: 'lpg',
          state: 'unknown',
          distinct_reporters: 0,
          weighted_score: 0,
          state_since: now,
          updated_at: now,
        },
      },
      cached: false,
      cache_note: 'Aggregated area view',
    };
  }

  // If single cell, return direct representation
  if (statuses.length === 1) {
    const single = statuses[0];
    return {
      ...single,
      area_name_bn: areaMeta?.areaNameBn || single.area_name_bn,
      ward: areaMeta?.ward || single.ward,
      city: areaMeta?.city || single.city,
    };
  }

  const categories: UtilityCategory[] = ['electricity', 'gas', 'water', 'lpg'];
  const aggregatedCategories: Record<UtilityCategory, ZoneCategoryStatus> = {} as any;

  let latestUpdatedAt = statuses[0].updated_at;

  for (const cat of categories) {
    let winningState: ZoneDisplayState = 'unknown';
    let highestSeverity = -1;
    let totalReporters = 0;
    let totalWeightedScore = 0;
    let earliestStateSince = statuses[0].categories[cat]?.state_since || statuses[0].updated_at;
    let catLatestUpdate = statuses[0].categories[cat]?.updated_at || statuses[0].updated_at;

    for (const status of statuses) {
      const catStatus = status.categories[cat];
      if (!catStatus) continue;

      totalReporters += catStatus.distinct_reporters || 0;
      totalWeightedScore += Number(catStatus.weighted_score || 0);

      if (new Date(catStatus.updated_at).getTime() > new Date(catLatestUpdate).getTime()) {
        catLatestUpdate = catStatus.updated_at;
      }
      if (new Date(catStatus.updated_at).getTime() > new Date(latestUpdatedAt).getTime()) {
        latestUpdatedAt = catStatus.updated_at;
      }

      const severity = STATE_SEVERITY_WEIGHT[catStatus.state] ?? 0;
      if (severity > highestSeverity) {
        highestSeverity = severity;
        winningState = catStatus.state;
        earliestStateSince = catStatus.state_since;
      } else if (severity === highestSeverity && catStatus.state === winningState) {
        // Keep earliest start time of the winning condition
        if (new Date(catStatus.state_since).getTime() < new Date(earliestStateSince).getTime()) {
          earliestStateSince = catStatus.state_since;
        }
      }
    }

    aggregatedCategories[cat] = {
      category: cat,
      state: winningState,
      distinct_reporters: totalReporters,
      weighted_score: Number(totalWeightedScore.toFixed(2)),
      state_since: earliestStateSince,
      updated_at: catLatestUpdate,
    };
  }

  return {
    h3_index: statuses.map((s) => s.h3_index).join(','),
    area_name_bn: areaMeta?.areaNameBn || statuses[0].area_name_bn,
    ward: areaMeta?.ward || statuses[0].ward,
    city: areaMeta?.city || statuses[0].city,
    updated_at: latestUpdatedAt,
    categories: aggregatedCategories,
    cached: statuses.every((s) => s.cached),
    cache_note: 'Aggregated across cells: worst confirmed state wins',
  };
}

/**
 * Deterministic Bengali Status Descriptions per Category
 */
export const BENGALI_CATEGORY_DESCRIPTIONS: Record<UtilityCategory, Record<ZoneDisplayState, string>> = {
  electricity: {
    ok: 'বিদ্যুৎ সরবরাহ স্বাভাবিক রয়েছে',
    low: 'ভোল্টেজ ওঠানামা বা স্বল্প সরবরাহের তথ্য রয়েছে',
    out: 'বিদ্যুৎ বিভ্রাট বা লোডশেডিং চলছে',
    unverified: 'বিদ্যুৎ নিয়ে নাগরিকদের কিছু রিপোর্ট এসেছে, যা এখনো যাচাইাধীন',
    unknown: 'বিদ্যুৎ সরবরাহের সাম্প্রতিক কোনো তথ্য নেই',
  },
  gas: {
    ok: 'গ্যাসের চাপ স্বাভাবিক রয়েছে',
    low: 'গ্যাসের চাপ কম রয়েছে, রান্নায় সমস্যা হতে পারে',
    out: 'গ্যাস সরবরাহ সম্পূর্ণ বন্ধ রয়েছে',
    unverified: 'গ্যাসের চাপ নিয়ে কিছু রিপোর্ট এসেছে, যা এখনো যাচাইাধীন',
    unknown: 'গ্যাসের সাম্প্রতিক কোনো তথ্য নেই',
  },
  water: {
    ok: 'ওয়াসা পানির সরবরাহ স্বাভাবিক রয়েছে',
    low: 'পানির প্রেসার কম পাওয়া যাচ্ছে',
    out: 'পানির সরবরাহ বন্ধ রয়েছে',
    unverified: 'পানি সরবরাহ নিয়ে কিছু রিপোর্ট এসেছে, যা এখনো যাচাইাধীন',
    unknown: 'পানির সাম্প্রতিক কোনো তথ্য নেই',
  },
  lpg: {
    ok: 'এলপিজি সিলিন্ডার সরবরাহ স্বাভাবিক',
    low: 'এলপিজি সিলিন্ডারের দাম কিছুটা চড়া বা স্বল্প সরবরাহ',
    out: 'এলপিজি সিলিন্ডারের সংকট চলছে',
    unverified: 'এলপিজি নিয়ে কিছু তথ্য এসেছে',
    unknown: 'এলপিজি সংক্রান্ত কোনো তথ্য নেই',
  },
};

/**
 * Generates deterministic Bengali summary text for search-engine and user visibility
 */
export function generateAreaBengaliSummary(
  status: ZoneStatusResponse,
  areaName: string,
  trendSummary?: string | null
): {
  headline: string;
  leadParagraph: string;
  detailsList: string[];
  reporterConfirmationText: string;
  lastUpdatedText: string;
  trendText?: string;
} {
  const electricityState = status.categories.electricity?.state || 'unknown';
  const gasState = status.categories.gas?.state || 'unknown';
  const waterState = status.categories.water?.state || 'unknown';
  const lpgState = status.categories.lpg?.state || 'unknown';

  const electricityDesc = BENGALI_CATEGORY_DESCRIPTIONS.electricity[electricityState];
  const gasDesc = BENGALI_CATEGORY_DESCRIPTIONS.gas[gasState];
  const waterDesc = BENGALI_CATEGORY_DESCRIPTIONS.water[waterState];
  const lpgDesc = BENGALI_CATEGORY_DESCRIPTIONS.lpg[lpgState];

  // Calculate total confirmed reporters across all 4 categories
  const totalReporters =
    (status.categories.electricity?.distinct_reporters || 0) +
    (status.categories.gas?.distinct_reporters || 0) +
    (status.categories.water?.distinct_reporters || 0) +
    (status.categories.lpg?.distinct_reporters || 0);

  const reporterCountBn = toBengaliDigits(totalReporters);
  const reporterConfirmationText =
    totalReporters >= 3
      ? `${reporterCountBn} জন নাগরিকের লাইভ রিপোর্টের ভিত্তিতে এই তথ্য নিশ্চিত করা হয়েছে।`
      : totalReporters > 0
      ? `এখন পর্যন্ত ${reporterCountBn} জন নাগরিক রিপোর্ট করেছেন (যাচাই প্রক্রিয়াধীন)।`
      : 'এখনো পর্যন্ত কোনো নাগরিক রিপোর্ট জমা দেননি।';

  const relativeTime = formatRelativeTimeBn(status.updated_at);
  const lastUpdatedText = `সর্বশেষ আপডেট: ${relativeTime}`;

  // Headline summarizing the most critical active state
  let headline = `${areaName} এলাকার সার্বিক ইউটিলিটি অবস্থা`;
  if (electricityState === 'out' || gasState === 'out' || waterState === 'out') {
    headline = `${areaName} এলাকায় সংযোগ বিভ্রাট বা সংকট রিপোর্ট করা হয়েছে`;
  } else if (electricityState === 'low' || gasState === 'low' || waterState === 'low') {
    headline = `${areaName} এলাকায় স্বল্প চাপ বা ধীরগতির সরবরাহ রয়েছে`;
  } else if (electricityState === 'ok' && gasState === 'ok' && waterState === 'ok') {
    headline = `${areaName} এলাকায় বিদ্যুৎ, গ্যাস ও পানি সরবরাহ স্বাভাবিক রয়েছে`;
  }

  const leadParagraph = `${areaName} এলাকায় বর্তমান বিদ্যুৎ, গ্যাস, ওয়াসা পানি ও এলপিজি সিলিন্ডারের রিয়েল-টাইম তথ্য অনুযায়ী: ${electricityDesc}, ${gasDesc}, এবং ${waterDesc}। ${reporterConfirmationText}`;

  const detailsList = [
    `বিদ্যুৎ: ${electricityDesc}`,
    `গ্যাস: ${gasDesc}`,
    `পানি: ${waterDesc}`,
    `এলপিজি সিলিন্ডার: ${lpgDesc}`,
  ];

  return {
    headline,
    leadParagraph,
    detailsList,
    reporterConfirmationText,
    lastUpdatedText,
    trendText: trendSummary || undefined,
  };
}
