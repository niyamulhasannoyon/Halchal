import 'package:flutter_test/flutter_test.dart';
import 'package:halchal_mobile/utils/bengali_utils.dart';

void main() {
  group('BengaliUtils.toBengaliDigits', () {
    test('converts single digits 0 through 9', () {
      expect(BengaliUtils.toBengaliDigits(0), '০');
      expect(BengaliUtils.toBengaliDigits(1), '১');
      expect(BengaliUtils.toBengaliDigits(2), '২');
      expect(BengaliUtils.toBengaliDigits(3), '৩');
      expect(BengaliUtils.toBengaliDigits(4), '৪');
      expect(BengaliUtils.toBengaliDigits(5), '৫');
      expect(BengaliUtils.toBengaliDigits(6), '৬');
      expect(BengaliUtils.toBengaliDigits(7), '৭');
      expect(BengaliUtils.toBengaliDigits(8), '৮');
      expect(BengaliUtils.toBengaliDigits(9), '৯');
    });

    test('converts multi-digit numbers', () {
      expect(BengaliUtils.toBengaliDigits(42), '৪২');
      expect(BengaliUtils.toBengaliDigits(108), '১০৮');
      expect(BengaliUtils.toBengaliDigits(2026), '২০২৬');
    });

    test('converts string containing ASCII numbers preserving other chars', () {
      expect(BengaliUtils.toBengaliDigits('7'), '৭');
      expect(BengaliUtils.toBengaliDigits('Dhaka 1207'), 'Dhaka ১২০৭');
      expect(BengaliUtils.toBengaliDigits('area-04'), 'area-০৪');
    });

    test('handles null safely', () {
      expect(BengaliUtils.toBengaliDigits(null), '');
    });
  });

  group('BengaliUtils.formatRelativeTimeBn', () {
    final baseTime = DateTime.parse('2026-11-19T14:00:00Z');

    test('returns "এইমাত্র" for recent events (< 45s)', () {
      final recent = baseTime.subtract(const Duration(seconds: 20));
      expect(BengaliUtils.formatRelativeTimeBn(recent, now: baseTime), 'এইমাত্র');
    });

    test('returns "এইমাত্র" for future timestamps', () {
      final future = baseTime.add(const Duration(seconds: 15));
      expect(BengaliUtils.formatRelativeTimeBn(future, now: baseTime), 'এইমাত্র');
    });

    test('formats minute intervals e.g. "৮ মিনিট আগে"', () {
      final eightMinAgo = baseTime.subtract(const Duration(minutes: 8));
      expect(BengaliUtils.formatRelativeTimeBn(eightMinAgo, now: baseTime), '৮ মিনিট আগে');
    });

    test('formats hour intervals e.g. "২ ঘণ্টা আগে"', () {
      final twoHoursAgo = baseTime.subtract(const Duration(hours: 2));
      expect(BengaliUtils.formatRelativeTimeBn(twoHoursAgo, now: baseTime), '২ ঘণ্টা আগে');
    });

    test('formats day intervals e.g. "৩ দিন আগে"', () {
      final threeDaysAgo = baseTime.subtract(const Duration(days: 3));
      expect(BengaliUtils.formatRelativeTimeBn(threeDaysAgo, now: baseTime), '৩ দিন আগে');
    });
  });

  group('BengaliUtils.formatReporterCountBn', () {
    test('formats confirmed consensus count', () {
      expect(BengaliUtils.formatReporterCountBn(7, isVerified: true), '৭ জন কনফার্ম করেছেন');
      expect(BengaliUtils.formatReporterCountBn(15, isVerified: true), '১৫ জন কনফার্ম করেছেন');
    });

    test('formats unverified reporter count', () {
      expect(BengaliUtils.formatReporterCountBn(2, isVerified: false), '২ জন বলছেন, এখনো নিশ্চিত নয়');
      expect(BengaliUtils.formatReporterCountBn(1, isVerified: false), '১ জন বলছেন, এখনো নিশ্চিত নয়');
    });

    test('handles zero reports correctly', () {
      expect(BengaliUtils.formatReporterCountBn(0, isVerified: true), 'এখনো কোনো নিশ্চিত রিপোর্ট নেই');
      expect(BengaliUtils.formatReporterCountBn(0, isVerified: false), 'এখনো কেউ জানাননি');
    });

    test('clamps negative values to zero', () {
      expect(BengaliUtils.formatReporterCountBn(-5, isVerified: true), 'এখনো কোনো নিশ্চিত রিপোর্ট নেই');
      expect(BengaliUtils.formatReporterCountBn(-1, isVerified: false), 'এখনো কেউ জানাননি');
    });
  });
}
