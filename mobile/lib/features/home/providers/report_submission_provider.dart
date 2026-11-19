import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/background/workmanager_service.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/constants/app_strings_bn.dart';
import '../../../core/integrity/location_integrity.dart';
import '../../../core/providers/core_providers.dart';
import '../../../core/storage/offline_queue.dart';
import '../../../theme/app_theme.dart';
import 'home_zone_provider.dart';

enum SubmissionStatus { idle, loading, success, queuedOffline, error }

class ReportSubmissionState {
  final SubmissionStatus status;
  final String? message;
  final bool isMockedHint;

  const ReportSubmissionState({
    this.status = SubmissionStatus.idle,
    this.message,
    this.isMockedHint = false,
  });

  bool get isLoading => status == SubmissionStatus.loading;
}

class ReportSubmissionNotifier extends StateNotifier<ReportSubmissionState> {
  final Ref _ref;

  ReportSubmissionNotifier(this._ref) : super(const ReportSubmissionState());

  /// Submits a user's one-tap utility report with full offline and integrity handling
  Future<ReportSubmissionState> submitReport({
    required String category,
    required String state, // 'ok', 'low', 'out'
    double? priceBdt,
  }) async {
    state = const ReportSubmissionState(status: SubmissionStatus.loading);

    final storage = _ref.read(localStorageProvider);
    final connectivity = _ref.read(connectivityServiceProvider);
    final integrityService = _ref.read(locationIntegrityProvider);
    final queueManager = _ref.read(offlineQueueProvider);
    final apiClient = _ref.read(apiClientProvider);

    // 1. Client-Side Cooldown Check (15 minutes per category)
    final lastReport = storage.getLastReportTime(category);
    if (lastReport != null) {
      final elapsed = DateTime.now().difference(lastReport);
      if (elapsed < ApiConstants.rateLimitCooldown) {
        final result = const ReportSubmissionState(
          status: SubmissionStatus.error,
          message: AppStringsBn.reportRateLimited,
        );
        state = result;
        return result;
      }
    }

    // 2. Acquire GPS Fix & Assess Location Integrity
    final positionResult = await integrityService.getCurrentPosition();
    if (!positionResult.isSuccess || positionResult.position == null) {
      final result = ReportSubmissionState(
        status: SubmissionStatus.error,
        message: positionResult.error ?? 'লোকেশন পাওয়া যায়নি',
        isMockedHint: positionResult.isMockedHint,
      );
      state = result;
      return result;
    }

    final pos = positionResult.position!;
    final deviceId = storage.getDeviceId();
    final clientTs = DateTime.now().toIso8601String();
    final reportId = const Uuid().v4();

    // 3. Map to theme status state for optimistic local UI update
    final halchalState = state == 'ok'
        ? HalchalStatusState.ok
        : state == 'low'
            ? HalchalStatusState.low
            : HalchalStatusState.out;

    _ref.read(zoneStatusProvider.notifier).applyOptimisticReport(
          category: category,
          reportedState: halchalState,
        );

    // 4. Actively verify internet reachability (do not trust interface flag alone)
    final hasInternet = await connectivity.checkActiveInternet();

    if (!hasInternet) {
      // 5a. OFFLINE PATH: Enqueue locally in Hive CE
      final queueItem = OfflineQueueItem(
        id: reportId,
        category: category,
        state: state,
        priceBdt: priceBdt,
        lat: pos.latitude,
        lng: pos.longitude,
        accuracyM: pos.accuracy,
        clientTs: clientTs,
        deviceId: deviceId,
      );

      await queueManager.enqueue(queueItem);
      await storage.setLastReportTime(category, DateTime.now());
      await WorkmanagerService.scheduleQueueFlushOneOff();

      final result = ReportSubmissionState(
        status: SubmissionStatus.queuedOffline,
        message: AppStringsBn.offlineSavedToast,
        isMockedHint: positionResult.isMockedHint,
      );
      state = result;
      return result;
    }

    // 5b. ONLINE PATH: Submit to Edge Function
    try {
      final attestation = await integrityService.getAttestationPayload();

      await apiClient.submitReport(
        category: category,
        state: state,
        priceBdt: priceBdt,
        lat: pos.latitude,
        lng: pos.longitude,
        accuracyM: pos.accuracy,
        clientTs: clientTs,
        deviceId: deviceId,
        attestation: attestation,
      );

      await storage.setLastReportTime(category, DateTime.now());

      final result = ReportSubmissionState(
        status: SubmissionStatus.success,
        message: AppStringsBn.reportSuccess,
        isMockedHint: positionResult.isMockedHint,
      );
      state = result;
      return result;
    } catch (e) {
      // Network dropped during in-flight request -> Fallback to Offline Queue
      final queueItem = OfflineQueueItem(
        id: reportId,
        category: category,
        state: state,
        priceBdt: priceBdt,
        lat: pos.latitude,
        lng: pos.longitude,
        accuracyM: pos.accuracy,
        clientTs: clientTs,
        deviceId: deviceId,
      );

      await queueManager.enqueue(queueItem);
      await storage.setLastReportTime(category, DateTime.now());
      await WorkmanagerService.scheduleQueueFlushOneOff();

      final result = ReportSubmissionState(
        status: SubmissionStatus.queuedOffline,
        message: AppStringsBn.offlineSavedToast,
        isMockedHint: positionResult.isMockedHint,
      );
      state = result;
      return result;
    }
  }

  void reset() {
    state = const ReportSubmissionState();
  }
}

final reportSubmissionProvider =
    StateNotifierProvider<ReportSubmissionNotifier, ReportSubmissionState>((ref) {
  return ReportSubmissionNotifier(ref);
});
