import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';

/// Halchal API Client
///
/// Communicates with Supabase Edge Functions and RPC endpoints.
/// Strictly conforms to ADR-0002 (Single Write Gateway) and ADR-0007 (Security Definer RPCs).
class HalchalApiClient {
  final http.Client _client;
  final String _baseUrl;
  final String _anonKey;

  HalchalApiClient({
    http.Client? client,
    String? baseUrl,
    String? anonKey,
  })  : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? ApiConstants.supabaseUrl,
        _anonKey = anonKey ?? ApiConstants.supabaseAnonKey;

  Map<String, String> _buildHeaders({String? authToken}) {
    final token = authToken ?? _anonKey;
    return {
      'Content-Type': 'application/json; charset=utf-8',
      'apikey': _anonKey,
      'Authorization': 'Bearer $token',
    };
  }

  /// Submits an ephemeral report to `submit-report` Edge Function (ADR-0002)
  ///
  /// Lat/Lng coordinates are processed in volatile memory on the server,
  /// converted to H3 Res 8, and immediately scrubbed.
  Future<Map<String, dynamic>> submitReport({
    required String category,
    required String state,
    double? priceBdt,
    required double lat,
    required double lng,
    required double accuracyM,
    required String clientTs,
    required String deviceId,
    required Map<String, dynamic> attestation,
    bool updateHome = false,
    String? userToken,
  }) async {
    final url = Uri.parse(ApiConstants.submitReportUrl);
    final payload = {
      'category': category,
      'state': state,
      'price_bdt': priceBdt,
      'lat': lat,
      'lng': lng,
      'accuracy_m': accuracyM,
      'client_ts': clientTs,
      'device_id': deviceId,
      'attestation': attestation,
      'update_home': updateHome,
    };

    final response = await _client
        .post(
          url,
          headers: _buildHeaders(authToken: userToken),
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 15));

    final decoded = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    final errorMessage = decoded['error'] as String? ??
        decoded['message'] as String? ??
        'রিপোর্ট জমা ব্যর্থ হয়েছে (HTTP ${response.statusCode})';

    throw HalchalApiException(
      statusCode: response.statusCode,
      message: errorMessage,
      code: decoded['code'] as String?,
      details: decoded,
    );
  }

  /// Casts an interactive single-use restoration vote to `restore-vote` Edge Function (ADR-0008)
  ///
  /// Requires NO Supabase session; authenticated solely via HMAC-SHA256 signed action token.
  Future<Map<String, dynamic>> restoreVote({
    required String actionToken,
    required String vote, // 'ok' or 'out'
  }) async {
    final url = Uri.parse(ApiConstants.restoreVoteUrl);
    final payload = {
      'token': actionToken,
      'vote': vote,
    };

    final response = await _client
        .post(
          url,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 10));

    final decoded = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    final errorMessage = decoded['error'] as String? ??
        decoded['message'] as String? ??
        'ভোট গ্রহণ ব্যর্থ হয়েছে';

    throw HalchalApiException(
      statusCode: response.statusCode,
      message: errorMessage,
      code: decoded['code'] as String?,
      details: decoded,
    );
  }

  /// Fetches sanitized 4-category status for an H3 zone via RPC `get_zone_status`
  Future<List<Map<String, dynamic>>> getZoneStatus(String h3Index) async {
    final url = Uri.parse('$_baseUrl/rest/v1/rpc/get_zone_status');
    final payload = {'p_h3': h3Index};

    final response = await _client
        .post(
          url,
          headers: _buildHeaders(),
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final list = jsonDecode(utf8.decode(response.bodyBytes)) as List<dynamic>;
      return list.cast<Map<String, dynamic>>();
    }

    throw HalchalApiException(
      statusCode: response.statusCode,
      message: 'এলাকার হালনাগাদ তথ্য পাওয়া যায়নি',
    );
  }

  /// Fetches 7-day community reliability insights for an H3 zone via RPC `get_zone_7day_insights`
  Future<Map<String, dynamic>> getZone7DayInsights(String h3Index) async {
    final url = Uri.parse('$_baseUrl/rest/v1/rpc/get_zone_7day_insights');
    final payload = {'p_h3': h3Index};

    final response = await _client
        .post(
          url,
          headers: _buildHeaders(),
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final map = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
      return map;
    }

    throw HalchalApiException(
      statusCode: response.statusCode,
      message: '৭ দিনের ইতিহাস পাওয়া যায়নি',
    );
  }

  void close() {
    _client.close();
  }
}

class HalchalApiException implements Exception {
  final int statusCode;
  final String message;
  final String? code;
  final Map<String, dynamic>? details;

  const HalchalApiException({
    required this.statusCode,
    required this.message,
    this.code,
    this.details,
  });

  @override
  String toString() => 'HalchalApiException($statusCode, $code): $message';
}
