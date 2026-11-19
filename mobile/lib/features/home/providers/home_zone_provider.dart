import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/core_providers.dart';
import '../../../theme/app_theme.dart';
import '../models/zone_status_model.dart';

/// Provider for the currently active Home H3 Index
final currentH3Provider = StateProvider<String>((ref) {
  final storage = ref.watch(localStorageProvider);
  return storage.getHomeH3();
});

/// StateNotifier to manage 4-category zone status with optimistic updates and auto-refresh
class ZoneStatusNotifier extends AsyncNotifier<List<ZoneCategoryStatus>> {
  @override
  Future<List<ZoneCategoryStatus>> build() async {
    final h3 = ref.watch(currentH3Provider);
    final apiClient = ref.watch(apiClientProvider);

    try {
      final rows = await apiClient.getZoneStatus(h3);
      if (rows.isNotEmpty) {
        return rows.map((r) => ZoneCategoryStatus.fromMap(r)).toList();
      }
    } catch (_) {
      // Fallback on network error or offline cold-start
    }

    return _buildFallbackCategories(h3);
  }

  /// Refreshes status from server
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final h3 = ref.read(currentH3Provider);
      final apiClient = ref.read(apiClientProvider);
      final rows = await apiClient.getZoneStatus(h3);
      if (rows.isNotEmpty) {
        return rows.map((r) => ZoneCategoryStatus.fromMap(r)).toList();
      }
      return _buildFallbackCategories(h3);
    });
  }

  /// Optimistically applies a user's report to the local status card immediately
  void applyOptimisticReport({
    required String category,
    required HalchalStatusState reportedState,
  }) {
    final currentList = state.valueOrNull;
    if (currentList == null) return;

    final updated = currentList.map((item) {
      if (item.category == category) {
        return item.copyWith(
          state: reportedState,
          distinctReporters: item.distinctReporters + 1,
          updatedAt: DateTime.now(),
          isOptimistic: true,
        );
      }
      return item;
    }).toList();

    state = AsyncValue.data(updated);
  }

  static List<ZoneCategoryStatus> _buildFallbackCategories(String h3) {
    final now = DateTime.now();
    return [
      ZoneCategoryStatus(
        h3Index: h3,
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'electricity',
        state: HalchalStatusState.unknown,
        distinctReporters: 0,
        weightedScore: 0.0,
        stateSince: now,
        updatedAt: now,
      ),
      ZoneCategoryStatus(
        h3Index: h3,
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'gas',
        state: HalchalStatusState.unknown,
        distinctReporters: 0,
        weightedScore: 0.0,
        stateSince: now,
        updatedAt: now,
      ),
      ZoneCategoryStatus(
        h3Index: h3,
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'water',
        state: HalchalStatusState.unknown,
        distinctReporters: 0,
        weightedScore: 0.0,
        stateSince: now,
        updatedAt: now,
      ),
      ZoneCategoryStatus(
        h3Index: h3,
        areaNameBn: 'মিরপুর-১০',
        ward: 'ওয়ার্ড ৩',
        city: 'ঢাকা',
        category: 'lpg',
        state: HalchalStatusState.unknown,
        distinctReporters: 0,
        weightedScore: 0.0,
        stateSince: now,
        updatedAt: now,
      ),
    ];
  }
}

final zoneStatusProvider =
    AsyncNotifierProvider<ZoneStatusNotifier, List<ZoneCategoryStatus>>(
  ZoneStatusNotifier.new,
);
