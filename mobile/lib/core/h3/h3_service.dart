import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:h3_flutter/h3_flutter.dart';

/// Abstract H3 Service Interface (ADR-0001, ADR-0008)
///
/// Enables dependency injection so that widget and unit tests running on
/// host development machines (macOS/Linux/Windows) can operate with pure-Dart
/// mock data without requiring Android-compiled native FFI shared libraries (`libh3.so`).
abstract class IH3Service {
  /// Converts lat/lng coordinates to an H3 Resolution 8 index string.
  Future<String> latLngToH3(double lat, double lng, {int resolution = 8});

  /// Returns the k-ring neighbors around an H3 index (e.g. k=1 produces center + 6 neighbors).
  Future<List<String>> getDisk(String h3Index, {int ringSize = 1});

  /// Returns the polygon boundary coordinates [[lng, lat], ...] for MapLibre GeoJSON.
  Future<List<List<double>>> getCellBoundary(String h3Index);

  /// Checks if a candidate H3 index is within the user's home zone or immediate ring-1 neighbors.
  Future<bool> isWithinHomeRing(String homeH3, String candidateH3);
}

/// Production H3 Service utilizing `h3_flutter` native C bindings
class ProductionH3Service implements IH3Service {
  H3? _h3;

  Future<H3> _getH3() async {
    if (_h3 != null) return _h3!;
    _h3 = await const H3Factory().load();
    return _h3!;
  }

  @override
  Future<String> latLngToH3(double lat, double lng, {int resolution = 8}) async {
    final h3 = await _getH3();
    final index = h3.geoToCell(GeoCoord(lat: lat, lon: lng), resolution);
    return index.toRadixString(16);
  }

  @override
  Future<List<String>> getDisk(String h3Index, {int ringSize = 1}) async {
    final h3 = await _getH3();
    final idx = BigInt.parse(h3Index, radix: 16);
    final disk = h3.gridDisk(idx, ringSize);
    return disk.map((i) => i.toRadixString(16)).toList();
  }

  @override
  Future<List<List<double>>> getCellBoundary(String h3Index) async {
    final h3 = await _getH3();
    final idx = BigInt.parse(h3Index, radix: 16);
    final boundary = h3.cellToBoundary(idx);
    // MapLibre coordinates are [longitude, latitude]
    final coords = boundary.map((pt) => [pt.lon, pt.lat]).toList();
    // Close polygon loop if not already closed
    if (coords.isNotEmpty &&
        (coords.first[0] != coords.last[0] || coords.first[1] != coords.last[1])) {
      coords.add([coords.first[0], coords.first[1]]);
    }
    return coords;
  }

  @override
  Future<bool> isWithinHomeRing(String homeH3, String candidateH3) async {
    if (homeH3 == candidateH3) return true;
    final ring = await getDisk(homeH3, ringSize: 1);
    return ring.contains(candidateH3);
  }
}

/// Mock H3 Service for Unit & Widget Tests and Host Execution
class MockH3Service implements IH3Service {
  final Map<String, List<String>> _predefinedDisks = {
    '883cf10ca1fffff': [
      '883cf10ca1fffff',
      '883cf10ca3fffff',
      '883cf10ca5fffff',
      '883cf10ca7fffff',
      '883cf10ca9fffff',
      '883cf10cabfffff',
      '883cf10cadfffff',
    ],
  };

  @override
  Future<String> latLngToH3(double lat, double lng, {int resolution = 8}) async {
    // Mirpur-10 approximate coordinates
    if ((lat - 23.80).abs() < 0.05 && (lng - 90.36).abs() < 0.05) {
      return '883cf10ca1fffff';
    }
    return '883cf10ca1fffff';
  }

  @override
  Future<List<String>> getDisk(String h3Index, {int ringSize = 1}) async {
    return _predefinedDisks[h3Index] ?? [h3Index];
  }

  @override
  Future<List<List<double>>> getCellBoundary(String h3Index) async {
    // Return sample hexagon boundary around Dhaka
    const centerLon = 90.3683;
    const centerLat = 23.8069;
    const delta = 0.003;
    return [
      [centerLon, centerLat + delta],
      [centerLon + delta, centerLat + delta / 2],
      [centerLon + delta, centerLat - delta / 2],
      [centerLon, centerLat - delta],
      [centerLon - delta, centerLat - delta / 2],
      [centerLon - delta, centerLat + delta / 2],
      [centerLon, centerLat + delta], // Closed ring
    ];
  }

  @override
  Future<bool> isWithinHomeRing(String homeH3, String candidateH3) async {
    if (homeH3 == candidateH3) return true;
    final disk = await getDisk(homeH3, ringSize: 1);
    return disk.contains(candidateH3);
  }
}

/// Factory selector that gracefully falls back to Mock in unit test / desktop runner
IH3Service createH3Service({bool forceMock = false}) {
  if (forceMock || kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
    return MockH3Service();
  }
  return ProductionH3Service();
}
