import '../../../theme/app_theme.dart';

/// Zone Category Status Model
///
/// Matches PostgreSQL RPC `public.get_zone_status(p_h3)` contract.
class ZoneCategoryStatus {
  final String h3Index;
  final String areaNameBn;
  final String ward;
  final String city;
  final String category;
  final HalchalStatusState state;
  final int distinctReporters;
  final double weightedScore;
  final DateTime stateSince;
  final DateTime updatedAt;
  final bool isOptimistic;

  const ZoneCategoryStatus({
    required this.h3Index,
    required this.areaNameBn,
    required this.ward,
    required this.city,
    required this.category,
    required this.state,
    required this.distinctReporters,
    required this.weightedScore,
    required this.stateSince,
    required this.updatedAt,
    this.isOptimistic = false,
  });

  factory ZoneCategoryStatus.fromMap(Map<String, dynamic> map) {
    return ZoneCategoryStatus(
      h3Index: map['h3_index'] as String? ?? '',
      areaNameBn: map['area_name_bn'] as String? ?? 'মিরপুর-১০',
      ward: map['ward'] as String? ?? '',
      city: map['city'] as String? ?? 'ঢাকা',
      category: map['category'] as String,
      state: parseHalchalStatusState(map['state'] as String?),
      distinctReporters: (map['distinct_reporters'] as num?)?.toInt() ?? 0,
      weightedScore: (map['weighted_score'] as num?)?.toDouble() ?? 0.0,
      stateSince: DateTime.tryParse(map['state_since'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updated_at'] as String? ?? '') ?? DateTime.now(),
      isOptimistic: false,
    );
  }

  static HalchalStatusState parseHalchalStatusState(String? stateStr) {
    switch (stateStr?.toLowerCase()) {
      case 'ok':
        return HalchalStatusState.ok;
      case 'low':
        return HalchalStatusState.low;
      case 'out':
        return HalchalStatusState.out;
      case 'unverified':
        return HalchalStatusState.unverified;
      case 'unknown':
      default:
        return HalchalStatusState.unknown;
    }
  }

  ZoneCategoryStatus copyWith({
    HalchalStatusState? state,
    int? distinctReporters,
    DateTime? updatedAt,
    bool? isOptimistic,
  }) {
    return ZoneCategoryStatus(
      h3Index: h3Index,
      areaNameBn: areaNameBn,
      ward: ward,
      city: city,
      category: category,
      state: state ?? this.state,
      distinctReporters: distinctReporters ?? this.distinctReporters,
      weightedScore: weightedScore,
      stateSince: stateSince,
      updatedAt: updatedAt ?? this.updatedAt,
      isOptimistic: isOptimistic ?? this.isOptimistic,
    );
  }
}
