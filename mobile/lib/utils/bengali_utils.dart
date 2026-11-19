import 'package:intl/intl.dart';

/// Halchal Bengali Localization & Utility Functions (Dart/Flutter)
///
/// Implements strict Bengali numerals, relative timestamps, and
/// crowd-sourced reporter verification copy matching the web Next.js implementation.
class BengaliUtils {
  static const List<String> _bengaliDigits = [
    '০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'
  ];

  /// Converts any number or string with ASCII digits (0-9) to Bengali digits (০-৯).
  /// Matches TypeScript Intl.NumberFormat('bn-BD', { useGrouping: false }).
  static String toBengaliDigits(dynamic input) {
    if (input == null) return '';

    if (input is num) {
      try {
        // Explicitly avoid comma grouping to match web { useGrouping: false }
        final formatter = NumberFormat('#0.##########', 'bn_BD');
        return formatter.format(input);
      } catch (_) {
        return _fallbackMapDigits(input.toString());
      }
    }

    return _fallbackMapDigits(input.toString());
  }

  static String _fallbackMapDigits(String str) {
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      final codeUnit = str.codeUnitAt(i);
      // '0' is 48, '9' is 57
      if (codeUnit >= 48 && codeUnit <= 57) {
        buffer.write(_bengaliDigits[codeUnit - 48]);
      } else {
        buffer.write(str[i]);
      }
    }
    return buffer.toString();
  }

  /// Formats a past DateTime into an accessible relative Bengali string.
  /// Examples: "এইমাত্র", "৮ মিনিট আগে", "২ ঘণ্টা আগে", "৩ দিন আগে"
  static String formatRelativeTimeBn(DateTime date, {DateTime? now}) {
    final current = now ?? DateTime.now();
    final difference = current.difference(date);
    final diffSec = difference.inSeconds;

    // Defense against future clock skew
    if (diffSec < 45) {
      return 'এইমাত্র';
    }

    final diffMin = difference.inMinutes;
    if (diffMin < 60) {
      return '${toBengaliDigits(diffMin)} মিনিট আগে';
    }

    final diffHours = difference.inHours;
    if (diffHours < 24) {
      return '${toBengaliDigits(diffHours)} ঘণ্টা আগে';
    }

    final diffDays = difference.inDays;
    if (diffDays < 30) {
      return '${toBengaliDigits(diffDays)} দিন আগে';
    }

    final diffMonths = (diffDays / 30).round();
    if (diffMonths < 12) {
      return '${toBengaliDigits(diffMonths)} মাস আগে';
    }

    final diffYears = (diffDays / 365).round();
    return '${toBengaliDigits(diffYears)} বছর আগে';
  }

  /// Formats the crowd reporter count based on consensus confirmation rules.
  ///
  /// - Confirmed: "৭ জন কনফার্ম করেছেন"
  /// - Unverified: "২ জন বলছেন, এখনো নিশ্চিত নয়"
  static String formatReporterCountBn(int count, {bool isVerified = true}) {
    final safeCount = count < 0 ? 0 : count;
    final bnCount = toBengaliDigits(safeCount);

    if (safeCount == 0) {
      return isVerified
          ? 'এখনো কোনো নিশ্চিত রিপোর্ট নেই'
          : 'এখনো কেউ জানাননি';
    }

    if (isVerified) {
      return '$bnCount জন কনফার্ম করেছেন';
    }

    return '$bnCount জন বলছেন, এখনো নিশ্চিত নয়';
  }
}
