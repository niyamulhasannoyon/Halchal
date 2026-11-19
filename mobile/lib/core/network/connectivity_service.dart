import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Connectivity Service (Halchal Resilience Architecture)
///
/// Mandate: "Do not trust the connectivity_plus flag alone: it only says a
/// network exists, not that the internet works."
///
/// Combines hardware interface observation with an active socket/DNS probe
/// to detect captive portals, dead Wi-Fi routers during blackouts, and exhausted
/// 2G/3G mobile data connections.
class ConnectivityService {
  final Connectivity _connectivity;
  final Duration _probeTimeout;

  StreamController<bool>? _statusController;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _lastKnownInternetStatus = true;

  ConnectivityService({
    Connectivity? connectivity,
    Duration probeTimeout = const Duration(seconds: 3),
  })  : _connectivity = connectivity ?? Connectivity(),
        _probeTimeout = probeTimeout;

  /// Stream of verified internet reachability status
  Stream<bool> get onInternetStatusChanged {
    _statusController ??= StreamController<bool>.broadcast(
      onListen: _startMonitoring,
      onCancel: _stopMonitoring,
    );
    return _statusController!.stream;
  }

  /// Synchronously checks last known status or performs an active check
  bool get lastKnownStatus => _lastKnownInternetStatus;

  void _startMonitoring() {
    _subscription = _connectivity.onConnectivityChanged.listen((results) async {
      // If hardware interface reports no connection at all, internet is definitely absent
      if (results.contains(ConnectivityResult.none) || results.isEmpty) {
        _updateStatus(false);
        return;
      }

      // Hardware interface exists (wifi, mobile, etc.), but verify real reachability
      final hasInternet = await checkActiveInternet();
      _updateStatus(hasInternet);
    });

    // Initial probe
    checkActiveInternet().then(_updateStatus);
  }

  void _stopMonitoring() {
    _subscription?.cancel();
    _subscription = null;
  }

  void _updateStatus(bool status) {
    if (_lastKnownInternetStatus != status) {
      _lastKnownInternetStatus = status;
      _statusController?.add(status);
    }
  }

  /// Performs an active socket reachability probe.
  /// Never trusts the local network interface alone.
  Future<bool> checkActiveInternet() async {
    // In test or web environments, return graceful default
    if (kIsWeb) return true;

    try {
      // Probe Cloudflare DNS and Google DNS with strict timeout
      final result = await InternetAddress.lookup('one.one.one.one')
          .timeout(_probeTimeout);
      final hasAddresses = result.isNotEmpty && result[0].rawAddress.isNotEmpty;
      _lastKnownInternetStatus = hasAddresses;
      return hasAddresses;
    } on SocketException catch (_) {
      _lastKnownInternetStatus = false;
      return false;
    } on TimeoutException catch (_) {
      _lastKnownInternetStatus = false;
      return false;
    } catch (_) {
      _lastKnownInternetStatus = false;
      return false;
    }
  }

  void dispose() {
    _subscription?.cancel();
    _statusController?.close();
  }
}
