import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toBengaliDigits,
  formatRelativeTimeBn,
  formatReporterCountBn,
} from './bengali-utils';

describe('toBengaliDigits', () => {
  it('converts single digits 0 through 9 accurately', () => {
    assert.equal(toBengaliDigits(0), '০');
    assert.equal(toBengaliDigits(1), '১');
    assert.equal(toBengaliDigits(2), '২');
    assert.equal(toBengaliDigits(3), '৩');
    assert.equal(toBengaliDigits(4), '৪');
    assert.equal(toBengaliDigits(5), '৫');
    assert.equal(toBengaliDigits(6), '৬');
    assert.equal(toBengaliDigits(7), '৭');
    assert.equal(toBengaliDigits(8), '৮');
    assert.equal(toBengaliDigits(9), '৯');
  });

  it('converts multi-digit numbers', () => {
    assert.equal(toBengaliDigits(42), '৪২');
    assert.equal(toBengaliDigits(108), '১০৮');
    assert.equal(toBengaliDigits(2026), '২০২৬');
  });

  it('converts string containing numbers preserving non-digit characters', () => {
    assert.equal(toBengaliDigits('7'), '৭');
    assert.equal(toBengaliDigits('Dhaka 1207'), 'Dhaka ১২০৭');
    assert.equal(toBengaliDigits('area-04'), 'area-০৪');
  });

  it('handles null, undefined and empty gracefully', () => {
    assert.equal(toBengaliDigits(null), '');
    assert.equal(toBengaliDigits(undefined), '');
    assert.equal(toBengaliDigits(''), '');
  });
});

describe('formatRelativeTimeBn', () => {
  const baseTime = new Date('2026-11-19T14:00:00Z');

  it('returns "এইমাত্র" for recent events (< 45 seconds)', () => {
    const recent = new Date(baseTime.getTime() - 20 * 1000);
    assert.equal(formatRelativeTimeBn(recent, baseTime), 'এইমাত্র');
  });

  it('returns "এইমাত্র" for zero or future timestamps', () => {
    const future = new Date(baseTime.getTime() + 10 * 1000);
    assert.equal(formatRelativeTimeBn(future, baseTime), 'এইমাত্র');
  });

  it('formats minute intervals e.g. "৮ মিনিট আগে"', () => {
    const eightMinutesAgo = new Date(baseTime.getTime() - 8 * 60 * 1000);
    assert.equal(formatRelativeTimeBn(eightMinutesAgo, baseTime), '৮ মিনিট আগে');
  });

  it('formats hour intervals e.g. "২ ঘণ্টা আগে"', () => {
    const twoHoursAgo = new Date(baseTime.getTime() - 2 * 60 * 60 * 1000);
    assert.equal(formatRelativeTimeBn(twoHoursAgo, baseTime), '২ ঘণ্টা আগে');
  });

  it('formats day intervals e.g. "৩ দিন আগে"', () => {
    const threeDaysAgo = new Date(baseTime.getTime() - 3 * 24 * 60 * 60 * 1000);
    assert.equal(formatRelativeTimeBn(threeDaysAgo, baseTime), '৩ দিন আগে');
  });

  it('handles invalid date input gracefully', () => {
    assert.equal(formatRelativeTimeBn('invalid-date', baseTime), 'অজানা সময়');
    assert.equal(formatRelativeTimeBn(null, baseTime), 'অজানা সময়');
  });
});

describe('formatReporterCountBn', () => {
  it('formats confirmed consensus count', () => {
    assert.equal(formatReporterCountBn(7, true), '৭ জন কনফার্ম করেছেন');
    assert.equal(formatReporterCountBn(15, true), '১৫ জন কনফার্ম করেছেন');
  });

  it('formats unverified reporter count', () => {
    assert.equal(formatReporterCountBn(2, false), '২ জন বলছেন, এখনো নিশ্চিত নয়');
    assert.equal(formatReporterCountBn(1, false), '১ জন বলছেন, এখনো নিশ্চিত নয়');
  });

  it('handles zero reports correctly', () => {
    assert.equal(formatReporterCountBn(0, true), 'এখনো কোনো নিশ্চিত রিপোর্ট নেই');
    assert.equal(formatReporterCountBn(0, false), 'এখনো কেউ জানাননি');
  });

  it('clamps negative numbers to zero', () => {
    assert.equal(formatReporterCountBn(-5, true), 'এখনো কোনো নিশ্চিত রিপোর্ট নেই');
    assert.equal(formatReporterCountBn(-1, false), 'এখনো কেউ জানাননি');
  });
});
