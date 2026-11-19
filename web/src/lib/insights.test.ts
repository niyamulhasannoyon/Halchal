/**
 * Unit Tests: 7-Day Insights Deterministic Bengali Templates & Thresholds
 * Framework: Vitest
 */

import { describe, it, expect } from 'vitest';
import {
  formatHourBn,
  formatHourRangeBn,
  findPeakProblemStreak,
  generateCategoryInsight,
  generateZonePrimaryInsight,
  INSUFFICIENT_DATA_BN,
  BIAS_DISCLAIMER_BN,
  COMPLAINT_CARD_FOOTER_BN,
} from './insights';

describe('formatHourBn', () => {
  it('formats midnight and early morning hours correctly', () => {
    expect(formatHourBn(0)).toBe('রাত ১২টা');
    expect(formatHourBn(3)).toBe('রাত ৩টা');
    expect(formatHourBn(4)).toBe('ভোর ৪টা');
    expect(formatHourBn(5)).toBe('ভোর ৫টা');
  });

  it('formats morning, noon, afternoon, and evening hours', () => {
    expect(formatHourBn(6)).toBe('সকাল ৬টা');
    expect(formatHourBn(10)).toBe('সকাল ১০টা');
    expect(formatHourBn(12)).toBe('দুপুর ১২টা');
    expect(formatHourBn(14)).toBe('দুপুর ২টা');
    expect(formatHourBn(16)).toBe('বিকাল ৪টা');
    expect(formatHourBn(18)).toBe('সন্ধ্যা ৬টা');
    expect(formatHourBn(22)).toBe('রাত ১০টা');
  });

  it('handles modulo wrap-around smoothly', () => {
    expect(formatHourBn(24)).toBe('রাত ১২টা');
    expect(formatHourBn(-1)).toBe('রাত ১১টা');
  });
});

describe('formatHourRangeBn', () => {
  it('formats 10 AM to 2 PM as "সকাল ১০টা থেকে দুপুর ২টার মধ্যে"', () => {
    expect(formatHourRangeBn(10, 14)).toBe('সকাল ১০টা থেকে দুপুর ২টার মধ্যে');
  });

  it('formats 6 PM to 10 PM as "সন্ধ্যা ৬টা থেকে রাত ১০টার মধ্যে"', () => {
    expect(formatHourRangeBn(18, 22)).toBe('সন্ধ্যা ৬টা থেকে রাত ১০টার মধ্যে');
  });
});

describe('findPeakProblemStreak', () => {
  it('identifies contiguous hours meeting threshold >= 0.4', () => {
    const pattern = new Array(24).fill(0.0);
    // Hours 10, 11, 12, 13 have problem share 0.43 (3 of 7 days)
    pattern[10] = 0.43;
    pattern[11] = 0.43;
    pattern[12] = 0.43;
    pattern[13] = 0.43;

    const streak = findPeakProblemStreak(pattern, 0.4, 2);
    expect(streak).not.toBeNull();
    expect(streak?.startHour).toBe(10);
    expect(streak?.endHour).toBe(14);
    expect(streak?.length).toBe(4);
  });

  it('ignores isolated single-hour spikes below minLength', () => {
    const pattern = new Array(24).fill(0.0);
    pattern[15] = 0.57; // only 1 hour spike

    const streak = findPeakProblemStreak(pattern, 0.4, 2);
    expect(streak).toBeNull();
  });

  it('returns null when all hours are below threshold', () => {
    const pattern = new Array(24).fill(0.14);
    const streak = findPeakProblemStreak(pattern, 0.4, 2);
    expect(streak).toBeNull();
  });
});

describe('generateCategoryInsight', () => {
  it('returns exact threshold warning when data_confidence is insufficient', () => {
    const insight = generateCategoryInsight({
      category: 'gas',
      data_confidence: 'insufficient',
      total_outage_minutes: 300,
      outage_event_count: 5,
      hourly_pattern: new Array(24).fill(0.5),
    });
    expect(insight).toBe(INSUFFICIENT_DATA_BN);
    expect(insight).toBe('এখনো পর্যাপ্ত তথ্য নেই (কমপক্ষে ৩ দিনের রিপোর্ট লাগবে)।');
  });

  it('generates the gas low-pressure template when peak hours are 10 AM to 2 PM', () => {
    const pattern = new Array(24).fill(0.1);
    pattern[10] = 0.43;
    pattern[11] = 0.43;
    pattern[12] = 0.43;
    pattern[13] = 0.43;

    const insight = generateCategoryInsight({
      category: 'gas',
      data_confidence: 'ok',
      total_outage_minutes: 180,
      outage_event_count: 2,
      hourly_pattern: pattern,
    });

    expect(insight).toBe('এই এলাকায় সাধারণত সকাল ১০টা থেকে দুপুর ২টার মধ্যে গ্যাসের চাপ কম থাকে।');
  });

  it('generates the electricity summary card template "এই সপ্তাহে ৪ বার কারেন্ট গেছে • মোট ৯ ঘণ্টা"', () => {
    const pattern = new Array(24).fill(0.1);
    const insight = generateCategoryInsight({
      category: 'electricity',
      data_confidence: 'ok',
      total_outage_minutes: 540, // 9 hours
      outage_event_count: 4,
      hourly_pattern: pattern,
    });

    expect(insight).toBe('এই সপ্তাহে ৪ বার কারেন্ট গেছে • মোট ৯ ঘণ্টা');
  });

  it('generates LPG area median price insight when available', () => {
    const pattern = new Array(24).fill(0);
    const insight = generateCategoryInsight({
      category: 'lpg',
      data_confidence: 'ok',
      total_outage_minutes: 0,
      outage_event_count: 0,
      hourly_pattern: pattern,
      lpg_price: {
        area_median: 1420,
        official_price: 1455,
        official_effective_from: '2026-11-01',
        report_count: 6,
      },
    });

    expect(insight).toBe('এই এলাকায় ১২ কেজি এলপিজির বর্তমান গড় বাজারদর ৳ ১,৪২০।');
  });

  it('returns peaceful normal week message when no issues found', () => {
    const pattern = new Array(24).fill(0);
    const insight = generateCategoryInsight({
      category: 'electricity',
      data_confidence: 'ok',
      total_outage_minutes: 0,
      outage_event_count: 0,
      hourly_pattern: pattern,
    });

    expect(insight).toBe('এই সপ্তাহে ইউটিলিটি পরিষেবা অধিকাংশ সময় স্বাভাবিক ছিল।');
  });
});

describe('generateZonePrimaryInsight', () => {
  it('propagates INSUFFICIENT_DATA_BN when confidence is insufficient', () => {
    const primary = generateZonePrimaryInsight({
      data_confidence: 'insufficient',
      categories: {},
    });
    expect(primary).toBe(INSUFFICIENT_DATA_BN);
  });

  it('prioritizes gas low-pressure peak pattern if detected in the area', () => {
    const primary = generateZonePrimaryInsight({
      data_confidence: 'ok',
      categories: {
        gas: {
          category: 'gas',
          total_outage_minutes: 200,
          outage_event_count: 3,
          hourly_pattern: [],
          heatmap: [],
          insight_bn: 'এই এলাকায় সাধারণত সকাল ১০টা থেকে দুপুর ২টার মধ্যে গ্যাসের চাপ কম থাকে।',
        },
        electricity: {
          category: 'electricity',
          total_outage_minutes: 120,
          outage_event_count: 1,
          hourly_pattern: [],
          heatmap: [],
          insight_bn: 'এই সপ্তাহে ১ বার কারেন্ট গেছে • মোট ২ ঘণ্টা',
        },
      },
    });

    expect(primary).toBe('এই এলাকায় সাধারণত সকাল ১০টা থেকে দুপুর ২টার মধ্যে গ্যাসের চাপ কম থাকে।');
  });
});

describe('Disclaimers and Standards', () => {
  it('contains the mandatory community reporting bias notice', () => {
    expect(BIAS_DISCLAIMER_BN).toContain('নাগরিকরা মূলত সমস্যা চলাকালীন বেশি রিপোর্ট করেন');
    expect(BIAS_DISCLAIMER_BN).toContain('সরকারি পরিমাপ নয়');
  });

  it('contains the mandatory complaint card footer text verbatim', () => {
    expect(COMPLAINT_CARD_FOOTER_BN).toBe(
      'কমিউনিটি-রিপোর্টেড তথ্য, সরকারি পরিমাপ নয়। হালচাল ব্যবহারকারীদের রিপোর্ট থেকে তৈরি।'
    );
  });
});
