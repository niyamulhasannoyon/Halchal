import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:halchal_mobile/core/storage/offline_queue.dart';
import 'package:hive_ce/hive.dart';

void main() {
  late Directory tempDir;
  late Box<String> testBox;
  late OfflineQueueManager queueManager;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('halchal_test_hive_');
    Hive.init(tempDir.path);
    testBox = await Hive.openBox<String>('test_offline_box');
    queueManager = OfflineQueueManager(testBox);
  });

  tearDown(() async {
    await testBox.close();
    await Hive.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('OfflineQueueManager Unit Tests', () {
    test('Enqueue stores report payload including ephemeral coordinates', () async {
      final now = DateTime.now();
      final item = OfflineQueueItem(
        id: 'test-uuid-1',
        category: 'electricity',
        state: 'out',
        priceBdt: null,
        lat: 23.8069,
        lng: 90.3683,
        accuracyM: 15.0,
        clientTs: now.toIso8601String(),
        deviceId: 'device-uuid-1',
      );

      await queueManager.enqueue(item);

      expect(queueManager.count, 1);
      final pending = queueManager.getPendingItems();
      expect(pending.length, 1);
      expect(pending.first.id, 'test-uuid-1');
      expect(pending.first.category, 'electricity');
      expect(pending.first.state, 'out');
      // Coordinates exist briefly while queued
      expect(pending.first.lat, 23.8069);
      expect(pending.first.lng, 90.3683);
    });

    test('Prunes and drops items older than 30 minutes', () async {
      final now = DateTime.now();
      final freshTime = now.subtract(const Duration(minutes: 10));
      final expiredTime = now.subtract(const Duration(minutes: 31));

      final freshItem = OfflineQueueItem(
        id: 'fresh-report',
        category: 'electricity',
        state: 'ok',
        lat: 23.80,
        lng: 90.36,
        accuracyM: 20.0,
        clientTs: freshTime.toIso8601String(),
        deviceId: 'device-1',
      );

      final expiredItem = OfflineQueueItem(
        id: 'expired-report',
        category: 'gas',
        state: 'out',
        lat: 23.81,
        lng: 90.37,
        accuracyM: 25.0,
        clientTs: expiredTime.toIso8601String(),
        deviceId: 'device-2',
      );

      await queueManager.enqueue(freshItem);
      await queueManager.enqueue(expiredItem);
      expect(queueManager.count, 2);

      // Prune expired items
      final pruned = await queueManager.pruneExpired(now: now);

      expect(pruned, 1);
      expect(queueManager.count, 1);

      final remaining = queueManager.getPendingItems(now: now);
      expect(remaining.length, 1);
      expect(remaining.first.id, 'fresh-report');
    });

    test('Calculates exponential backoff delay correctly', () {
      const item0 = OfflineQueueItem(
        id: '1',
        category: 'water',
        state: 'low',
        lat: 23.8,
        lng: 90.3,
        accuracyM: 10,
        clientTs: '2026-11-19T10:00:00.000Z',
        deviceId: 'dev',
        retryCount: 0,
      );
      // 5 * 2^0 = 5s
      expect(item0.getBackoffDelay(), const Duration(seconds: 5));

      const item1 = OfflineQueueItem(
        id: '2',
        category: 'water',
        state: 'low',
        lat: 23.8,
        lng: 90.3,
        accuracyM: 10,
        clientTs: '2026-11-19T10:00:00.000Z',
        deviceId: 'dev',
        retryCount: 1,
      );
      // 5 * 2^1 = 10s
      expect(item1.getBackoffDelay(), const Duration(seconds: 10));

      const item2 = OfflineQueueItem(
        id: '3',
        category: 'water',
        state: 'low',
        lat: 23.8,
        lng: 90.3,
        accuracyM: 10,
        clientTs: '2026-11-19T10:00:00.000Z',
        deviceId: 'dev',
        retryCount: 3,
      );
      // 5 * 2^3 = 40s
      expect(item2.getBackoffDelay(), const Duration(seconds: 40));
    });

    test('Deletes item permanently upon submit (raw coordinates wiped)', () async {
      final item = OfflineQueueItem(
        id: 'submitted-report',
        category: 'lpg',
        state: 'ok',
        priceBdt: 1450.0,
        lat: 23.805,
        lng: 90.365,
        accuracyM: 12.0,
        clientTs: DateTime.now().toIso8601String(),
        deviceId: 'dev-1',
      );

      await queueManager.enqueue(item);
      expect(queueManager.count, 1);

      // Simulate successful submission -> delete immediately
      await queueManager.deleteItem('submitted-report');

      expect(queueManager.count, 0);
      expect(queueManager.getPendingItems(), isEmpty);
    });
  });
}
