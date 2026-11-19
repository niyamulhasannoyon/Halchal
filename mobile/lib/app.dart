import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/constants/app_strings_bn.dart';
import 'core/notifications/notification_service.dart';
import 'core/providers/core_providers.dart';
import 'features/history/presentation/history_screen.dart';
import 'features/home/presentation/home_screen.dart';
import 'features/map/presentation/map_screen.dart';
import 'features/settings/presentation/settings_screen.dart';
import 'features/settings/presentation/widgets/battery_optimization_dialog.dart';
import 'theme/app_theme.dart';

/// Root Application Widget with Persistent Bottom Navigation
class HalchalApp extends ConsumerStatefulWidget {
  const HalchalApp({super.key});

  @override
  ConsumerState<HalchalApp> createState() => _HalchalAppState();
}

class _HalchalAppState extends ConsumerState<HalchalApp> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeScreen(),
    MapScreen(),
    HistoryScreen(),
    SettingsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkPermissionsAndGuidance();
    });
  }

  Future<void> _checkPermissionsAndGuidance() async {
    // 1. Android 13+ POST_NOTIFICATIONS request
    final notifService = NotificationService();
    await notifService.requestNotificationPermissions();

    // 2. Battery Optimization Guidance check
    if (!mounted) return;
    final storage = ref.read(localStorageProvider);
    if (!storage.isBatteryGuidanceDismissed()) {
      await storage.setBatteryGuidanceDismissed(true);
      if (mounted) {
        BatteryOptimizationDialog.show(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppStringsBn.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: _screens,
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: const Color(0xFF10B981),
          unselectedItemColor: const Color(0xFF94A3B8),
          selectedFontSize: 12,
          unselectedFontSize: 12,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.flash_on_rounded),
              label: AppStringsBn.navHome,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.map_rounded),
              label: AppStringsBn.navMap,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.history_rounded),
              label: AppStringsBn.navHistory,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.settings_rounded),
              label: AppStringsBn.navSettings,
            ),
          ],
        ),
      ),
    );
  }
}
