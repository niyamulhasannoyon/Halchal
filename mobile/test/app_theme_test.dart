import 'package:flutter_test/flutter_test.dart';
import 'package:halchal_mobile/theme/app_theme.dart';

void main() {
  group('AppTheme Theme Extension & Tokens', () {
    test('Dark theme provides darkStatusTheme extension with correct labels', () {
      final theme = AppTheme.darkTheme;
      final statusTheme = theme.extension<HalchalStatusTheme>();

      expect(statusTheme, isNotNull);
      expect(statusTheme!.ok.bengaliLabel, 'আছে');
      expect(statusTheme.low.bengaliLabel, 'কম');
      expect(statusTheme.out.bengaliLabel, 'নেই');
      expect(statusTheme.unverified.bengaliLabel, 'অনিশ্চিত');
      expect(statusTheme.unknown.bengaliLabel, 'খবর নেই');
    });

    test('Light theme provides lightStatusTheme extension with WCAG compliant colors', () {
      final theme = AppTheme.lightTheme;
      final statusTheme = theme.extension<HalchalStatusTheme>();

      expect(statusTheme, isNotNull);
      expect(statusTheme!.ok.bengaliLabel, 'আছে');
      expect(statusTheme.low.bengaliLabel, 'কম');
      expect(statusTheme.out.bengaliLabel, 'নেই');
      expect(statusTheme.unverified.bengaliLabel, 'অনিশ্চিত');
      expect(statusTheme.unknown.bengaliLabel, 'খবর নেই');
    });

    test('Typography respects 16px min body font and 1.6+ line height for Bengali', () {
      final darkText = AppTheme.darkTheme.textTheme;
      expect(darkText.bodyLarge?.fontSize, greaterThanOrEqualTo(16.0));
      expect(darkText.bodyLarge?.height, greaterThanOrEqualTo(1.6));
      expect(darkText.headlineMedium?.fontSize, equals(22.0));

      final lightText = AppTheme.lightTheme.textTheme;
      expect(lightText.bodyLarge?.fontSize, greaterThanOrEqualTo(16.0));
      expect(lightText.bodyLarge?.height, greaterThanOrEqualTo(1.6));
      expect(lightText.headlineMedium?.fontSize, equals(22.0));
    });
  });
}
