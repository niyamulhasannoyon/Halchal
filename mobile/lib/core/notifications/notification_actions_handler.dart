import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';

/// Top-Level Background Action Handler for Notification Button Taps
///
/// Mandate:
/// "Handle taps in a top-level @pragma('vm:entry-point') background handler
/// that initializes only what it needs and POSTs to `restore-vote` with the
/// signed action token from the payload (no Supabase session needed)."
///
/// Executes in an isolated background Dart VM isolate spawned by Android.
/// Zero UI, zero heavy state initialization, sub-second execution.
@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse notificationResponse) {
  _processBackgroundNotificationAction(notificationResponse);
}

/// Helper function to perform the async HTTP POST to `restore-vote`
Future<void> _processBackgroundNotificationAction(
  NotificationResponse response, {
  http.Client? customClient,
}) async {
  final actionId = response.actionId;
  final payloadStr = response.payload;

  if (actionId == null || payloadStr == null) {
    if (kDebugMode) {
      print('[HalchalNotifAction] Missing actionId or payload: action=$actionId');
    }
    return;
  }

  // Determine vote direction
  // 'action_restored' -> 'ok' ("হ্যাঁ, ফিরেছে")
  // 'action_not_restored' -> 'out' ("না, এখনো নেই")
  String? vote;
  if (actionId == 'action_restored') {
    vote = 'ok';
  } else if (actionId == 'action_not_restored') {
    vote = 'out';
  }

  if (vote == null) {
    if (kDebugMode) {
      print('[HalchalNotifAction] Unrecognized actionId: $actionId');
    }
    return;
  }

  try {
    final payload = jsonDecode(payloadStr) as Map<String, dynamic>;
    final actionToken = payload['action_token'] as String?;

    if (actionToken == null || actionToken.isEmpty) {
      if (kDebugMode) {
        print('[HalchalNotifAction] Action token is empty in payload');
      }
      return;
    }

    // Direct, minimal HTTP POST to restore-vote Edge Function
    // No Supabase session, anon headers, or client libraries needed
    final client = customClient ?? http.Client();
    final url = Uri.parse(ApiConstants.restoreVoteUrl);

    final res = await client
        .post(
          url,
          headers: {'Content-Type': 'application/json; charset=utf-8'},
          body: jsonEncode({
            'token': actionToken,
            'vote': vote,
          }),
        )
        .timeout(const Duration(seconds: 8));

    if (kDebugMode) {
      print(
        '[HalchalNotifAction] Vote $vote submitted: HTTP ${res.statusCode}',
      );
    }
  } catch (e) {
    if (kDebugMode) {
      print('[HalchalNotifAction] Failed to submit vote: $e');
    }
  }
}
