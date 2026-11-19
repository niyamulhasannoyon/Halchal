import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:maplibre_gl/maplibre_gl.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/constants/app_strings_bn.dart';
import '../../../../theme/app_theme.dart';
import '../providers/map_provider.dart';
import 'widgets/map_legend.dart';

/// Lazy-Loaded MapLibre GL Map Screen (ADR-0009, ADR-0010)
class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  MapLibreMapController? _mapController;

  static const CameraPosition _initialCamera = CameraPosition(
    target: LatLng(23.8069, 90.3683), // Mirpur-10, Dhaka
    zoom: 13.5,
  );

  void _onMapCreated(MapLibreMapController controller) {
    _mapController = controller;
    _drawHexPolygons();
  }

  void _onStyleLoaded() {
    _drawHexPolygons();
  }

  void _drawHexPolygons() async {
    final controller = _mapController;
    if (controller == null) return;

    final hexFeaturesAsync = ref.read(mapHexFeaturesProvider);
    final features = hexFeaturesAsync.valueOrNull ?? [];

    for (final feature in features) {
      if (feature.boundaryCoordinates.isEmpty) continue;

      final latLngList = feature.boundaryCoordinates
          .map((pt) => LatLng(pt[1], pt[0]))
          .toList();

      Color fillColor;
      switch (feature.state) {
        case 'ok':
          fillColor = const Color(0x6610B981);
          break;
        case 'low':
          fillColor = const Color(0x66F59E0B);
          break;
        case 'out':
          fillColor = const Color(0x66EF4444);
          break;
        case 'unverified':
          fillColor = const Color(0x4494A3B8);
          break;
        case 'unknown':
        default:
          fillColor = const Color(0x3364748B);
          break;
      }

      try {
        await controller.addFill(
          FillOptions(
            geometry: [latLngList],
            fillColor: '#${fillColor.value.toRadixString(16).substring(2)}',
            fillOutlineColor: '#10B981',
          ),
        );
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final hexFeatures = ref.watch(mapHexFeaturesProvider);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(
          AppStringsBn.navMap,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
      ),
      body: Stack(
        children: [
          // Map Canvas
          kIsWeb || (!defaultTargetPlatform.name.contains('android') && !defaultTargetPlatform.name.contains('iOS'))
              ? _buildDesktopFallback(isDark, hexFeatures.valueOrNull ?? [])
              : MapLibreMap(
                  styleString: ApiConstants.darkBasemapStyleUrl,
                  initialCameraPosition: _initialCamera,
                  onMapCreated: _onMapCreated,
                  onStyleLoadedCallback: _onStyleLoaded,
                  myLocationEnabled: true,
                  trackCameraPosition: true,
                ),

          // Legend at Bottom
          const Positioned(
            left: 16,
            right: 16,
            bottom: 20,
            child: Center(child: MapLegend()),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopFallback(bool isDark, List<H3HexFeature> features) {
    return Container(
      color: isDark ? AppTheme.oledCanvas : AppTheme.lightCanvas,
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.map_rounded, size: 64, color: Color(0xFF10B981)),
            const SizedBox(height: 16),
            const Text(
              'লাইভ ম্যাপ ভিউ (H3 হেক্সাগন গ্রিড)',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              '${features.length}টি জোন পর্যবেক্ষণ করা হচ্ছে',
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: features.map((f) {
                return Chip(
                  avatar: CircleAvatar(
                    backgroundColor: f.state == 'ok'
                        ? const Color(0xFF10B981)
                        : f.state == 'low'
                            ? const Color(0xFFF59E0B)
                            : f.state == 'out'
                                ? const Color(0xFFEF4444)
                                : const Color(0xFF64748B),
                    radius: 6,
                  ),
                  label: Text('${f.areaNameBn} (${f.state})'),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
