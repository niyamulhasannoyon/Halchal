import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/core_providers.dart';

class SettingsState {
  final List<String> categories;
  final bool allowNightAlerts;
  final String homeH3;
  final int homeChangeDaysRemaining;

  const SettingsState({
    required this.categories,
    required this.allowNightAlerts,
    required this.homeH3,
    required this.homeChangeDaysRemaining,
  });

  SettingsState copyWith({
    List<String>? categories,
    bool? allowNightAlerts,
    String? homeH3,
    int? homeChangeDaysRemaining,
  }) {
    return SettingsState(
      categories: categories ?? this.categories,
      allowNightAlerts: allowNightAlerts ?? this.allowNightAlerts,
      homeH3: homeH3 ?? this.homeH3,
      homeChangeDaysRemaining: homeChangeDaysRemaining ?? this.homeChangeDaysRemaining,
    );
  }
}

class SettingsNotifier extends StateNotifier<SettingsState> {
  final Ref _ref;

  SettingsNotifier(this._ref)
      : super(
          SettingsState(
            categories: _ref.read(localStorageProvider).getSubscribedCategories(),
            allowNightAlerts: _ref.read(localStorageProvider).getAllowNightAlerts(),
            homeH3: _ref.read(localStorageProvider).getHomeH3(),
            homeChangeDaysRemaining: _ref.read(localStorageProvider).getHomeZoneChangeDaysRemaining(),
          ),
        );

  Future<void> toggleCategory(String category) async {
    final storage = _ref.read(localStorageProvider);
    final updated = List<String>.from(state.categories);

    if (updated.contains(category)) {
      if (updated.length > 1) {
        // Keep at least one category selected
        updated.remove(category);
      }
    } else {
      updated.add(category);
    }

    await storage.setSubscribedCategories(updated);
    state = state.copyWith(categories: updated);
  }

  Future<void> toggleNightAlerts(bool allow) async {
    final storage = _ref.read(localStorageProvider);
    await storage.setAllowNightAlerts(allow);
    state = state.copyWith(allowNightAlerts: allow);
  }

  Future<bool> updateHomeH3(String newH3) async {
    final storage = _ref.read(localStorageProvider);
    final success = await storage.setHomeH3(newH3);
    if (success) {
      state = state.copyWith(
        homeH3: newH3,
        homeChangeDaysRemaining: storage.getHomeZoneChangeDaysRemaining(),
      );
    }
    return success;
  }
}

final settingsProvider = StateNotifierProvider<SettingsNotifier, SettingsState>((ref) {
  return SettingsNotifier(ref);
});
