import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';
import 'app.dart';
import 'core/background/workmanager_service.dart';
import 'core/notifications/notification_service.dart';
import 'core/providers/core_providers.dart';
import 'core/storage/local_storage.dart';
import 'core/storage/offline_queue.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialize Hive CE for Offline Queue
  await Hive.initFlutter();
  final offlineQueueManager = await OfflineQueueManager.init();

  // 2. Initialize Local Storage (SharedPreferences)
  final localStorage = await LocalStorage.create();

  // 3. Initialize Firebase if configured
  try {
    await Firebase.initializeApp();
    final notifService = NotificationService();
    await notifService.setupForegroundListeners();
  } catch (e) {
    debugPrint('[HalchalMain] Firebase initialization bypassed or unconfigured: $e');
  }

  // 4. Initialize WorkManager Background Retries
  try {
    await WorkmanagerService.initialize();
    await WorkmanagerService.registerPeriodicFlush();
  } catch (e) {
    debugPrint('[HalchalMain] WorkManager initialization error: $e');
  }

  runApp(
    ProviderScope(
      overrides: [
        localStorageProvider.overrideWithValue(localStorage),
        offlineQueueProvider.overrideWithValue(offlineQueueManager),
      ],
      child: const HalchalApp(),
    ),
  );
}
