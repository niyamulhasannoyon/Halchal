import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/core_providers.dart';
import '../../home/providers/home_zone_provider.dart';

class H3HexFeature {
  final String h3Index;
  final List<List<double>> boundaryCoordinates; // [[lon, lat], ...]
  final String state; // 'ok', 'low', 'out', 'unverified', 'unknown'
  final String areaNameBn;

  const H3HexFeature({
    required this.h3Index,
    required this.boundaryCoordinates,
    required this.state,
    required this.areaNameBn,
  });
}

/// Provider that resolves H3 boundary polygons for home zone + ring-1 neighbors
final mapHexFeaturesProvider = FutureProvider<List<H3HexFeature>>((ref) async {
  final homeH3 = ref.watch(currentH3Provider);
  final h3Service = ref.watch(h3ServiceProvider);
  final apiClient = ref.watch(apiClientProvider);

  final cells = await h3Service.getDisk(homeH3, ringSize: 1);
  final features = <H3HexFeature>[];

  for (final cell in cells) {
    final boundary = await h3Service.getCellBoundary(cell);

    String state = 'unknown';
    String areaName = 'এলাকা';

    try {
      final statuses = await apiClient.getZoneStatus(cell);
      if (statuses.isNotEmpty) {
        areaName = statuses.first['area_name_bn'] as String? ?? 'এলাকা';
        // Aggregate state (out takes precedence, then low, then ok)
        final states = statuses.map((s) => s['state'] as String? ?? 'unknown').toList();
        if (states.contains('out')) {
          state = 'out';
        } else if (states.contains('low')) {
          state = 'low';
        } else if (states.contains('ok')) {
          state = 'ok';
        } else if (states.contains('unverified')) {
          state = 'unverified';
        }
      }
    } catch (_) {}

    features.add(
      H3HexFeature(
        h3Index: cell,
        boundaryCoordinates: boundary,
        state: state,
        areaNameBn: areaName,
      ),
    );
  }

  return features;
});
