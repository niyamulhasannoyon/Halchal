import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../constants/app_strings_bn.dart';
import 'notification_actions_handler.dart';

/// Top-Level FCM Background Message Handler (DATA-ONLY Messages)
///
/// Mandate:
/// "FCM notification messages cannot carry custom action buttons.
/// Send high-priority DATA-ONLY messages and render the notification with
/// flutter_local_notifications, with actions 'হ্যাঁ, ফিরেছে' / 'না, এখনো নেই'."
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Ensure Firebase is initialized for background isolate
  try {
    await Firebase.initializeApp();
  } catch (_) {}

  final notificationService = NotificationService();
  await notificationService.initializeLocalNotifications();
  await notificationService.renderRemoteNotification(message);
}

/// Notification Service for Halchal Mobile Client
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static const String channelAlertsId = 'halchal_utility_alerts';
  static const String channelAlertsName = 'ইউটিলিটি সতর্কবার্তা (Utility Alerts)';

  static const String channelRestorationId = 'halchal_restoration_channel';
  static const String channelRestorationName = 'পুনরুদ্ধার যাচাই (Restoration Inquiries)';

  bool _initialized = false;

  /// Initializes Flutter Local Notifications and Android Channels
  Future<void> initializeLocalNotifications() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        // Foreground or opened from tray
        if (response.actionId != null) {
          notificationTapBackground(response);
        }
      },
      onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
    );

    // Create Notification Channels on Android
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin != null) {
      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          channelAlertsId,
          channelAlertsName,
          description: 'বিদ্যুৎ, গ্যাস ও পানির বিভ্রাট সংক্রান্ত নোটিফিকেশন',
          importance: Importance.high,
          playSound: true,
          enableVibration: true,
        ),
      );

      await androidPlugin.createNotificationChannel(
        const AndroidNotificationChannel(
          channelRestorationId,
          channelRestorationName,
          description: 'বিদ্যুৎ বা গ্যাস ফিরেছে কিনা যাচাইয়ের ইন্টারেক্টিভ বোতামসহ অ্যালার্ট',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
        ),
      );
    }

    _initialized = true;
  }

  /// Requests Android 13+ (API 33+) POST_NOTIFICATIONS permission
  Future<bool> requestNotificationPermissions() async {
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin != null) {
      final granted = await androidPlugin.requestNotificationsPermission();
      return granted ?? false;
    }

    // Fallback to Firebase Messaging requestPermission
    final settings = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    return settings.authorizationStatus == AuthorizationStatus.authorized;
  }

  /// Sets up FCM listeners for high-priority DATA-ONLY messages
  Future<void> setupForegroundListeners() async {
    await initializeLocalNotifications();

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      renderRemoteNotification(message);
    });

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  }

  /// Renders a local notification from incoming FCM payload
  Future<void> renderRemoteNotification(RemoteMessage message) async {
    final data = message.data;
    final type = data['type'] as String? ?? 'status_alert';

    final id = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final title = data['title'] as String? ?? message.notification?.title ?? 'হালচাল আপডেট';
    final body = data['body'] as String? ?? message.notification?.body ?? 'নতুন তথ্য পাওয়া গেছে।';

    if (type == 'interactive_confirmation') {
      // 30-minute restoration confirmation with one-tap action buttons
      // "হ্যাঁ, ফিরেছে" and "না, এখনো নেই"
      final actionToken = data['action_token'] as String? ?? '';
      final payloadJson = jsonEncode({
        'action_token': actionToken,
        'h3_index': data['h3_index'],
        'category': data['category'],
        'restore_url': data['restore_url'],
      });

      final androidDetails = AndroidNotificationDetails(
        channelRestorationId,
        channelRestorationName,
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        actions: const [
          AndroidNotificationAction(
            'action_restored',
            AppStringsBn.notifRestoredAction, // "হ্যাঁ, ফিরেছে"
            showsUserInterface: false,
            cancelNotification: true,
          ),
          AndroidNotificationAction(
            'action_not_restored',
            AppStringsBn.notifNotRestoredAction, // "না, এখনো নেই"
            showsUserInterface: false,
            cancelNotification: true,
          ),
        ],
      );

      await _localNotifications.show(
        id,
        title,
        body,
        NotificationDetails(android: androidDetails),
        payload: payloadJson,
      );
    } else {
      // Standard status change alert
      const androidDetails = AndroidNotificationDetails(
        channelAlertsId,
        channelAlertsName,
        importance: Importance.high,
        priority: Priority.high,
        playSound: true,
      );

      await _localNotifications.show(
        id,
        title,
        body,
        const NotificationDetails(android: androidDetails),
        payload: jsonEncode(data),
      );
    }
  }

  /// Obtains the FCM device registration token
  Future<String?> getFcmToken() async {
    try {
      return await FirebaseMessaging.instance.getToken();
    } catch (_) {
      return null;
    }
  }
}
