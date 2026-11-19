import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../h3/h3_service.dart';
import '../integrity/location_integrity.dart';
import '../network/connectivity_service.dart';
import '../network/halchal_api_client.dart';
import '../storage/local_storage.dart';
import '../storage/offline_queue.dart';

/// Provider for LocalStorage instance (initialized in main)
final localStorageProvider = Provider<LocalStorage>((ref) {
  throw UnimplementedError('localStorageProvider must be initialized');
});

/// Provider for HalchalApiClient
final apiClientProvider = Provider<HalchalApiClient>((ref) {
  final client = HalchalApiClient();
  ref.onDispose(() => client.close());
  return client;
});

/// Provider for ConnectivityService
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Stream of verified internet connectivity
final isOnlineProvider = StreamProvider<bool>((ref) {
  final connectivity = ref.watch(connectivityServiceProvider);
  return connectivity.onInternetStatusChanged;
});

/// Provider for H3 Service
final h3ServiceProvider = Provider<IH3Service>((ref) {
  return createH3Service();
});

/// Provider for Location Integrity Service
final locationIntegrityProvider = Provider<LocationIntegrityService>((ref) {
  return LocationIntegrityService();
});

/// Provider for OfflineQueueManager (initialized in main)
final offlineQueueProvider = Provider<OfflineQueueManager>((ref) {
  throw UnimplementedError('offlineQueueProvider must be initialized');
});
