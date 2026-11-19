import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:hive_ce/hive.dart';
import '../constants/api_constants.dart';

/// Offline Report Item Representation
///
/// CLAUDE.md Privacy Directive (Section 3.1):
/// "Never persist raw GPS coordinates (latitude, longitude) or street addresses
/// in any database table, log, or telemetry stream."
///
/// This offline queue is the ONLY location where raw coordinates exist briefly
/// during network blackouts. They are permanently wiped immediately upon successful
/// delivery or when pruned after 30 minutes.
class OfflineQueueItem {
  final String id;
  final String category;
  final String state;
  final double? priceBdt;
  final double lat;
  final double lng;
  final double accuracyM;
  final String clientTs;
  final String deviceId;
  final int retryCount;
  final String? lastAttempt;

  const OfflineQueueItem({
    required this.id,
    required this.category,
    required this.state,
    this.priceBdt,
    required this.lat,
    required this.lng,
    required this.accuracyM,
    required this.clientTs,
    required this.deviceId,
    this.retryCount = 0,
    this.lastAttempt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'category': category,
      'state': state,
      'price_bdt': priceBdt,
      'lat': lat,
      'lng': lng,
      'accuracy_m': accuracyM,
      'client_ts': clientTs,
      'device_id': deviceId,
      'retry_count': retryCount,
      'last_attempt': lastAttempt,
    };
  }

  factory OfflineQueueItem.fromMap(Map<String, dynamic> map) {
    return OfflineQueueItem(
      id: map['id'] as String,
      category: map['category'] as String,
      state: map['state'] as String,
      priceBdt: map['price_bdt'] != null ? (map['price_bdt'] as num).toDouble() : null,
      lat: (map['lat'] as num).toDouble(),
      lng: (map['lng'] as num).toDouble(),
      accuracyM: (map['accuracy_m'] as num).toDouble(),
      clientTs: map['client_ts'] as String,
      deviceId: map['device_id'] as String,
      retryCount: map['retry_count'] as int? ?? 0,
      lastAttempt: map['last_attempt'] as String?,
    );
  }

  OfflineQueueItem copyWith({
    int? retryCount,
    String? lastAttempt,
  }) {
    return OfflineQueueItem(
      id: id,
      category: category,
      state: state,
      priceBdt: priceBdt,
      lat: lat,
      lng: lng,
      accuracyM: accuracyM,
      clientTs: clientTs,
      deviceId: deviceId,
      retryCount: retryCount ?? this.retryCount,
      lastAttempt: lastAttempt ?? this.lastAttempt,
    );
  }

  /// Calculates exponential backoff delay based on retry count
  /// Formula: min(5s * 2^retryCount, 300s)
  Duration getBackoffDelay() {
    final seconds = min(5 * pow(2, retryCount), 300).toInt();
    return Duration(seconds: seconds);
  }

  /// Checks if the item should be attempted now based on backoff
  bool isReadyForRetry({DateTime? now}) {
    if (lastAttempt == null) return true;
    final lastTime = DateTime.tryParse(lastAttempt!);
    if (lastTime == null) return true;
    final currentTime = now ?? DateTime.now();
    return currentTime.difference(lastTime) >= getBackoffDelay();
  }

  /// Checks if the item has expired (> 30 minutes old)
  bool isExpired({DateTime? now}) {
    final createdTime = DateTime.tryParse(clientTs);
    if (createdTime == null) return true;
    final currentTime = now ?? DateTime.now();
    return currentTime.difference(createdTime) > ApiConstants.queueExpiration;
  }
}

/// Offline Queue Manager utilizing maintained `hive_ce`
class OfflineQueueManager {
  static const String boxName = 'halchal_offline_reports_v1';
  final Box<String> _box;

  OfflineQueueManager(this._box);

  static Future<OfflineQueueManager> init() async {
    final box = await Hive.openBox<String>(boxName);
    return OfflineQueueManager(box);
  }

  /// Enqueues a new report during network dropout
  Future<void> enqueue(OfflineQueueItem item) async {
    final jsonStr = jsonEncode(item.toMap());
    await _box.put(item.id, jsonStr);
  }

  /// Removes items older than 30 minutes from disk
  /// Wipes coordinates of all dropped items permanently.
  Future<int> pruneExpired({DateTime? now}) async {
    final keysToDelete = <dynamic>[];
    int prunedCount = 0;

    for (final key in _box.keys) {
      final jsonStr = _box.get(key);
      if (jsonStr == null) {
        keysToDelete.add(key);
        continue;
      }

      try {
        final map = jsonDecode(jsonStr) as Map<String, dynamic>;
        final item = OfflineQueueItem.fromMap(map);
        if (item.isExpired(now: now)) {
          keysToDelete.add(key);
          prunedCount++;
        }
      } catch (_) {
        keysToDelete.add(key);
      }
    }

    if (keysToDelete.isNotEmpty) {
      await _box.deleteAll(keysToDelete);
    }

    return prunedCount;
  }

  /// Retrieves unexpired items waiting for transmission
  List<OfflineQueueItem> getPendingItems({DateTime? now}) {
    final items = <OfflineQueueItem>[];

    for (final key in _box.keys) {
      final jsonStr = _box.get(key);
      if (jsonStr == null) continue;

      try {
        final map = jsonDecode(jsonStr) as Map<String, dynamic>;
        final item = OfflineQueueItem.fromMap(map);
        if (!item.isExpired(now: now)) {
          items.add(item);
        }
      } catch (_) {
        // Skip corrupted entries
      }
    }

    return items;
  }

  /// Permanently deletes an item after successful delivery.
  /// This is the exact moment raw GPS coordinates are wiped from device disk!
  Future<void> deleteItem(String id) async {
    await _box.delete(id);
  }

  /// Records a failed transmission attempt and updates exponential backoff
  Future<void> recordFailure(String id, {DateTime? now}) async {
    final jsonStr = _box.get(id);
    if (jsonStr == null) return;

    try {
      final map = jsonDecode(jsonStr) as Map<String, dynamic>;
      final item = OfflineQueueItem.fromMap(map);
      final updated = item.copyWith(
        retryCount: item.retryCount + 1,
        lastAttempt: (now ?? DateTime.now()).toIso8601String(),
      );
      await _box.put(id, jsonEncode(updated.toMap()));
    } catch (_) {}
  }

  /// Count of items currently waiting in queue
  int get count => _box.length;

  /// Clear all items (used for testing or user cache wipe)
  Future<void> clear() async {
    await _box.clear();
  }
}
