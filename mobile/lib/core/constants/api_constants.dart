/// API and Network Constants for Halchal Mobile
///
/// Reuses the existing Supabase backend, database functions, and Edge Functions.
/// Adheres strictly to ADR-0001, ADR-0002, ADR-0008, and ADR-0010.
class ApiConstants {
  /// Default Supabase Base URL (Overridable via Dart define)
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://xyzcompany.supabase.co',
  );

  /// Supabase Anonymous Key (Overridable via Dart define)
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyAnonKeyForHalchalClient',
  );

  /// Edge Function Endpoint for submitting reports (Single Write Gateway - ADR-0002)
  static String get submitReportUrl => '$supabaseUrl/functions/v1/submit-report';

  /// Edge Function Endpoint for single-use interactive restoration voting (ADR-0008, ADR-0011)
  static String get restoreVoteUrl => '$supabaseUrl/functions/v1/restore-vote';

  /// Default Uber H3 Resolution (Resolution 8: ~0.74 km², edge length ~460m)
  static const int h3Resolution = 8;

  /// Default fallback H3 Cell for Dhaka central zone (Mirpur-10)
  static const String defaultDhakaH3 = '883cf10ca1fffff';

  /// Non-OSM Dark Basemap Vector/Raster Style (CartoDB Dark Matter)
  /// Strictly complies with OSM tile usage policy (ADR-0010)
  static const String darkBasemapStyleUrl =
      'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

  /// Maximum GPS accuracy allowed in meters (200m per server-side Zod validation)
  static const double maxAccuracyM = 200.0;

  /// Offline queue expiration duration (30 minutes)
  static const Duration queueExpiration = Duration(minutes: 30);

  /// Rate limit per category per device/user (15 minutes)
  static const Duration rateLimitCooldown = Duration(minutes: 15);
}
