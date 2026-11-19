import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/core_providers.dart';
import '../../home/providers/home_zone_provider.dart';
import '../models/zone_insights_model.dart';

final zoneInsightsProvider = FutureProvider<Zone7DayInsights>((ref) async {
  final h3 = ref.watch(currentH3Provider);
  final apiClient = ref.watch(apiClientProvider);

  try {
    final raw = await apiClient.getZone7DayInsights(h3);
    return Zone7DayInsights.fromMap(raw);
  } catch (_) {
    // Return empty fallback model on cold-start/offline
    return Zone7DayInsights(
      h3Index: h3,
      areaNameBn: 'মিরপুর-১০',
      ward: 'ওয়ার্ড ৩',
      city: 'ঢাকা',
      dataConfidence: 'insufficient',
      distinctDays: 0,
      totalReporters: 0,
      insightBn: 'গত ৭ দিনের কোনো রেকর্ড সংরক্ষিত নেই।',
      categories: const {},
    );
  }
});
