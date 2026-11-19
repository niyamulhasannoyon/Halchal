import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../constants/api_constants.dart';

/// Local Storage Manager for Halchal Client
///
/// Implements ADR-0008 (Hardware pseudonymization without browser/device fingerprinting)
/// and 7-day home zone lock persistence.
class LocalStorage {
  static const String _keyDeviceId = 'halchal_device_id';
  static const String _keyHomeH3 = 'halchal_home_h3';
  static const String _keyHomeChangeDate = 'halchal_home_change_date';
  static const String _keyAllowNightAlerts = 'halchal_night_alerts';
  static const String _keyNotificationCategories = 'halchal_notif_categories';
  static const String _keyBatteryOptimizedDismissed = 'halchal_battery_guidance_dismissed';
  static const String _prefixLastReport = 'halchal_last_report_';

  final SharedPreferences _prefs;

  LocalStorage(this._prefs);

  static Future<LocalStorage> create() async {
    final prefs = await SharedPreferences.getInstance();
    return LocalStorage(prefs);
  }

  /// Persistent anonymous Device UUID. Generated once upon install.
  /// Zero device fingerprinting (Canvas, WebGL, IMEI, MAC strictly forbidden by ADR-0008).
  String getDeviceId() {
    String? id = _prefs.getString(_keyDeviceId);
    if (id == null || id.isEmpty) {
      id = const Uuid().v4();
      _prefs.setString(_keyDeviceId, id);
    }
    return id;
  }

  /// User's registered home H3 Resolution 8 index
  String getHomeH3() {
    return _prefs.getString(_keyHomeH3) ?? ApiConstants.defaultDhakaH3;
  }

  /// Sets home H3 zone with 7-day change lock enforcement (ADR-0008)
  Future<bool> setHomeH3(String h3Index, {bool force = false}) async {
    final lastChangeStr = _prefs.getString(_keyHomeChangeDate);
    if (lastChangeStr != null && !force) {
      final lastChange = DateTime.tryParse(lastChangeStr);
      if (lastChange != null) {
        final daysSince = DateTime.now().difference(lastChange).inDays;
        if (daysSince < 7) {
          // Cannot change within 7 days
          return false;
        }
      }
    }

    await _prefs.setString(_keyHomeH3, h3Index);
    await _prefs.setString(_keyHomeChangeDate, DateTime.now().toIso8601String());
    return true;
  }

  /// Days remaining until home zone can be changed again (0 if eligible now)
  int getHomeZoneChangeDaysRemaining() {
    final lastChangeStr = _prefs.getString(_keyHomeChangeDate);
    if (lastChangeStr == null) return 0;
    final lastChange = DateTime.tryParse(lastChangeStr);
    if (lastChange == null) return 0;
    final diffDays = DateTime.now().difference(lastChange).inDays;
    return (7 - diffDays).clamp(0, 7);
  }

  /// Subscribed notification categories
  List<String> getSubscribedCategories() {
    final list = _prefs.getStringList(_keyNotificationCategories);
    if (list == null || list.isEmpty) {
      return ['electricity', 'gas', 'water', 'lpg'];
    }
    return list;
  }

  Future<void> setSubscribedCategories(List<String> categories) async {
    await _prefs.setStringList(_keyNotificationCategories, categories);
  }

  /// Quiet hours (23:00 - 06:00 BDT) night alerts permission
  bool getAllowNightAlerts() {
    return _prefs.getBool(_keyAllowNightAlerts) ?? false;
  }

  Future<void> setAllowNightAlerts(bool allow) async {
    await _prefs.setBool(_keyAllowNightAlerts, allow);
  }

  /// Tracks last report submission time per category to show local 15m cooldown
  DateTime? getLastReportTime(String category) {
    final raw = _prefs.getString('$_prefixLastReport$category');
    if (raw == null) return null;
    return DateTime.tryParse(raw);
  }

  Future<void> setLastReportTime(String category, DateTime time) async {
    await _prefs.setString('$_prefixLastReport$category', time.toIso8601String());
  }

  bool isBatteryGuidanceDismissed() {
    return _prefs.getBool(_keyBatteryOptimizedDismissed) ?? false;
  }

  Future<void> setBatteryGuidanceDismissed(bool dismissed) async {
    await _prefs.setBool(_keyBatteryOptimizedDismissed, dismissed);
  }
}
