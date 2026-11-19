import 'package:flutter/foundation.dart';
import 'package:hive_ce/hive.dart';
import 'package:path_provider/path_provider.dart';
import 'package:workmanager/workmanager.dart';
import '../network/connectivity_service.dart';
import '../network/halchal_api_client.dart';
import '../storage/offline_queue.dart';

/// Top-Level WorkManager Background Task Dispatcher
///
/// Mandate:
/// "Retry with exponential backoff (WorkManager for background retries),
/// drop items older than 30 minutes"
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    if (kDebugMode) {
      print('[HalchalWorkManager] Executing background task: $taskName');
    }

    try {
      // 1. Initialize Hive storage in background isolate
      final dir = await getApplicationDocumentsDirectory();
      Hive.init(dir.path);
      final queueManager = await OfflineQueueManager.init();

      // 2. Prune items older than 30 minutes
      final pruned = await queueManager.pruneExpired();
      if (kDebugMode && pruned > 0) {
        print('[HalchalWorkManager] Pruned $pruned expired items (> 30 mins)');
      }

      final pendingItems = queueManager.getPendingItems();
      if (pendingItems.isEmpty) {
        return true;
      }

      // 3. Verify actual internet reachability (do not trust interface flag alone)
      final connectivity = ConnectivityService();
      final hasInternet = await connectivity.checkActiveInternet();
      if (!hasInternet) {
        if (kDebugMode) {
          print('[HalchalWorkManager] No active internet. Postponing retry.');
        }
        return true;
      }

      // 4. Flush pending items
      final apiClient = HalchalApiClient();
      for (final item in pendingItems) {
        if (!item.isReadyForRetry()) continue;

        try {
          await apiClient.submitReport(
            category: item.category,
            state: item.state,
            priceBdt: item.priceBdt,
            lat: item.lat,
            lng: item.lng,
            accuracyM: item.accuracyM,
            clientTs: item.clientTs,
            deviceId: item.deviceId,
            attestation: {
              'provider': 'mock',
              'token': 'valid-play-integrity-token',
            },
          );

          // Permanently delete coordinates and record upon successful submit
          await queueManager.deleteItem(item.id);
          if (kDebugMode) {
            print('[HalchalWorkManager] Delivered queued report: ${item.id}');
          }
        } catch (e) {
          await queueManager.recordFailure(item.id);
          if (kDebugMode) {
            print('[HalchalWorkManager] Delivery failed for ${item.id}: $e');
          }
        }
      }

      apiClient.close();
      return true;
    } catch (e) {
      if (kDebugMode) {
        print('[HalchalWorkManager] Task execution error: $e');
      }
      return false;
    }
  });
}

/// WorkManager Service Helper
class WorkmanagerService {
  static const String taskFlushQueue = 'com.halchal.task.flush_queue';
  static const String periodicTaskFlush = 'com.halchal.task.periodic_flush';

  /// Initializes WorkManager
  static Future<void> initialize() async {
    try {
      await Workmanager().initialize(callbackDispatcher);
    } catch (e) {
      if (kDebugMode) {
        print('[WorkmanagerService] Initialization error: $e');
      }
    }
  }

  /// Schedules an immediate one-off background retry with exponential backoff
  static Future<void> scheduleQueueFlushOneOff({Duration initialDelay = const Duration(seconds: 15)}) async {
    try {
      await Workmanager().registerOneOffTask(
        'flush_one_off_${DateTime.now().millisecondsSinceEpoch}',
        taskFlushQueue,
        initialDelay: initialDelay,
        constraints: Constraints(
          networkType: NetworkType.connected,
        ),
        backoffPolicy: BackoffPolicy.exponential,
        backoffPolicyDelay: const Duration(seconds: 10),
      );
    } catch (e) {
      if (kDebugMode) {
        print('[WorkmanagerService] Failed to schedule one-off task: $e');
      }
    }
  }

  /// Registers a periodic background check (every 15 minutes)
  static Future<void> registerPeriodicFlush() async {
    try {
      await Workmanager().registerPeriodicTask(
        periodicTaskFlush,
        periodicTaskFlush,
        frequency: const Duration(minutes: 15),
        constraints: Constraints(
          networkType: NetworkType.connected,
        ),
      );
    } catch (e) {
      if (kDebugMode) {
        print('[WorkmanagerService] Failed to register periodic task: $e');
      }
    }
  }
}
