import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:halchal_mobile/features/home/models/zone_status_model.dart';
import 'package:halchal_mobile/features/home/presentation/widgets/status_card.dart';
import 'package:halchal_mobile/theme/app_theme.dart';

void main() {
  Widget buildTestableWidget({
    required ZoneCategoryStatus status,
    ThemeData? theme,
  }) {
    return MaterialApp(
      theme: theme ?? AppTheme.darkTheme,
      home: Scaffold(
        body: Center(
          child: SizedBox(
            width: 200,
            child: StatusCard(status: status),
          ),
        ),
      ),
    );
  }

  group('StatusCard Multi-Modal Widget Tests (Every State)', () {
    final now = DateTime.now();

    testWidgets('State OK renders Green check with "আছে" label', (tester) async {
      final status = ZoneCategoryStatus(
        h3Index: '883cf10ca1fffff',
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'electricity',
        state: HalchalStatusState.ok,
        distinctReporters: 5,
        weightedScore: 4.5,
        stateSince: now,
        updatedAt: now,
      );

      await tester.pumpWidget(buildTestableWidget(status: status));

      expect(find.text('বিদ্যুৎ'), findsOneWidget);
      expect(find.text('আছে'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      expect(find.text('৫ জন কনফার্ম করেছেন'), findsOneWidget);
    });

    testWidgets('State LOW renders Amber warning with "কম" label', (tester) async {
      final status = ZoneCategoryStatus(
        h3Index: '883cf10ca1fffff',
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'gas',
        state: HalchalStatusState.low,
        distinctReporters: 4,
        weightedScore: 3.5,
        stateSince: now,
        updatedAt: now,
      );

      await tester.pumpWidget(buildTestableWidget(status: status));

      expect(find.text('গ্যাস'), findsOneWidget);
      expect(find.text('কম'), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
      expect(find.text('৪ জন কনফার্ম করেছেন'), findsOneWidget);
    });

    testWidgets('State OUT renders Red cancel icon with "নেই" label', (tester) async {
      final status = ZoneCategoryStatus(
        h3Index: '883cf10ca1fffff',
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'electricity',
        state: HalchalStatusState.out,
        distinctReporters: 8,
        weightedScore: 6.0,
        stateSince: now,
        updatedAt: now,
      );

      await tester.pumpWidget(buildTestableWidget(status: status));

      expect(find.text('বিদ্যুৎ'), findsOneWidget);
      expect(find.text('নেই'), findsOneWidget);
      expect(find.byIcon(Icons.cancel_outlined), findsOneWidget);
      expect(find.text('৮ জন কনফার্ম করেছেন'), findsOneWidget);
    });

    testWidgets('State UNVERIFIED renders Help icon with "অনিশ্চিত" label and unconfirmed copy',
        (tester) async {
      final status = ZoneCategoryStatus(
        h3Index: '883cf10ca1fffff',
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'water',
        state: HalchalStatusState.unverified,
        distinctReporters: 2,
        weightedScore: 1.8,
        stateSince: now,
        updatedAt: now,
      );

      await tester.pumpWidget(buildTestableWidget(status: status));

      expect(find.text('পানি'), findsOneWidget);
      expect(find.text('অনিশ্চিত'), findsOneWidget);
      expect(find.byIcon(Icons.help_outline_rounded), findsOneWidget);
      expect(find.text('২ জন বলছেন, এখনো নিশ্চিত নয়'), findsOneWidget);
    });

    testWidgets('State UNKNOWN renders Radio button with "খবর নেই" label - NEVER GREEN',
        (tester) async {
      final status = ZoneCategoryStatus(
        h3Index: '883cf10ca1fffff',
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'lpg',
        state: HalchalStatusState.unknown,
        distinctReporters: 0,
        weightedScore: 0.0,
        stateSince: now,
        updatedAt: now,
      );

      await tester.pumpWidget(buildTestableWidget(status: status));

      expect(find.text('এলপিজি'), findsOneWidget);
      expect(find.text('খবর নেই'), findsOneWidget);
      expect(find.byIcon(Icons.radio_button_unchecked), findsOneWidget);
      expect(find.text('এখনো কেউ জানাননি'), findsOneWidget);

      // Verify Golden Rule: Never rendered as green!
      final token = AppTheme.darkStatusTheme.unknown;
      expect(token.primary != const Color(0xFF10B981), isTrue);
      expect(token.text != const Color(0xFF6EE7B7), isTrue);
    });

    testWidgets('Shows optimistic badge when isOptimistic is true', (tester) async {
      final status = ZoneCategoryStatus(
        h3Index: '883cf10ca1fffff',
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'electricity',
        state: HalchalStatusState.out,
        distinctReporters: 1,
        weightedScore: 1.0,
        stateSince: now,
        updatedAt: now,
        isOptimistic: true,
      );

      await tester.pumpWidget(buildTestableWidget(status: status));

      expect(find.text('আপনার রিপোর্ট অন্তর্ভুক্ত হয়েছে'), findsOneWidget);
    });
  });
}
