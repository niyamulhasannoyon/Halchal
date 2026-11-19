/// 7-Day Community Reliability Insights Model
///
/// Matches RPC `public.get_zone_7day_insights(p_h3)` contract.
class Zone7DayInsights {
  final String h3Index;
  final String areaNameBn;
  final String ward;
  final String city;
  final String dataConfidence;
  final int distinctDays;
  final int totalReporters;
  final String? insightBn;
  final Map<String, CategoryOutageMetrics> categories;

  const Zone7DayInsights({
    required this.h3Index,
    required this.areaNameBn,
    required this.ward,
    required this.city,
    required this.dataConfidence,
    required this.distinctDays,
    required this.totalReporters,
    this.insightBn,
    required this.categories,
  });

  factory Zone7DayInsights.fromMap(Map<String, dynamic> map) {
    final catMap = <String, CategoryOutageMetrics>{};
    final rawCats = map['categories'] as Map<String, dynamic>? ?? {};

    rawCats.forEach((k, v) {
      if (v is Map<String, dynamic>) {
        catMap[k] = CategoryOutageMetrics.fromMap(v);
      }
    });

    return Zone7DayInsights(
      h3Index: map['h3_index'] as String? ?? '',
      areaNameBn: map['area_name_bn'] as String? ?? 'মিরপুর-১০',
      ward: map['ward'] as String? ?? '',
      city: map['city'] as String? ?? 'ঢাকা',
      dataConfidence: map['data_confidence'] as String? ?? 'insufficient',
      distinctDays: (map['distinct_days'] as num?)?.toInt() ?? 0,
      totalReporters: (map['total_reporters'] as num?)?.toInt() ?? 0,
      insightBn: map['insight_bn'] as String?,
      categories: catMap,
    );
  }
}

class CategoryOutageMetrics {
  final int totalOutageMinutes;
  final int outageEvents;
  final double? uptimePercentage;

  const CategoryOutageMetrics({
    required this.totalOutageMinutes,
    required this.outageEvents,
    this.uptimePercentage,
  });

  factory CategoryOutageMetrics.fromMap(Map<String, dynamic> map) {
    return CategoryOutageMetrics(
      totalOutageMinutes: (map['total_outage_minutes'] as num?)?.toInt() ?? 0,
      outageEvents: (map['outage_events'] as num?)?.toInt() ?? 0,
      uptimePercentage: (map['uptime_percentage'] as num?)?.toDouble(),
    );
  }
}
