import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/integrity/location_integrity.dart';
import '../../../core/network/halchal_api_client.dart';
import '../../../core/providers/core_providers.dart';
import '../../../core/storage/offline_queue.dart';
import 'home_zone_provider.dart';

/// Provider for the number of pending offline reports
final pendingOfflineCountProvider = StateProvider<int>((ref) {
  final queue = ref.watch(offlineQueueProvider);
  return queue.count;
});

/// Controller to flush the offline queue when connection is restored
class OfflineQueueFlusher {
  final Ref _ref;

  OfflineQueueFlusher(this._ref) {
    // Automatically attempt flush whenever verified internet returns
    _ref.listen<AsyncValue<bool>>(isOnlineProvider, (previous, next) {
      if (next.value == true) {
        flushQueue();
      }
    });
  }

  /// Flushes all eligible unexpired reports in the offline queue
  Future<int> flushQueue() async {
    final queue = _ref.read(offlineQueueProvider);
    final apiClient = _ref.read(apiClientProvider);
    final integrity = _ref.read(locationIntegrityProvider);

    // 1. Drop items older than 30 minutes
    await queue.pruneExpired();

    final pending = queue.getPendingItems();
    if (pending.isEmpty) {
      _ref.read(pendingOfflineCountProvider.notifier).state = 0;
      return 0;
    }

    int successCount = 0;

    for (final item in pending) {
      if (!item.isReadyForRetry()) continue;

      try {
        final attestation = await integrity.getAttestationPayload();

        await apiClient.submitReport(
          category: item.category,
          state: item.state,
          priceBdt: item.priceBdt,
          lat: item.lat,
          lng: item.lng,
          accuracyM: item.accuracyM,
          clientTs: item.clientTs,
          deviceId: item.deviceId,
          attestation: attestation,
        );

        // Delete permanently immediately after submit (privacy compliance)
        await queue.deleteItem(item.id);
        successCount++;
      } catch (e) {
        await queue.recordFailure(item.id);
      }
    }

    _ref.read(pendingOfflineCountProvider.notifier).state = queue.count;

    if (successCount > 0) {
      // Refresh current zone status
      _ref.read(zoneStatusProvider.notifier).refresh();
    }

    return successCount;
  }
}

final offlineQueueFlusherProvider = Provider<OfflineQueueFlusher>((ref) {
  return OfflineQueueFlusher(ref);
});
