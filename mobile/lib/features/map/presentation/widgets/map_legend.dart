import 'package:flutter/material.dart';
import '../../../../theme/app_theme.dart';

/// Multi-Modal Map Legend Widget
class MapLegend extends StatelessWidget {
  const MapLegend({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: (isDark ? AppTheme.oledSurface : AppTheme.lightSurface).withOpacity(0.92),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildItem(const Color(0xFF10B981), 'আছে (স্বাভাবিক)', Icons.check_circle),
          const SizedBox(width: 10),
          _buildItem(const Color(0xFFF59E0B), 'কম (চাপ কম)', Icons.warning_amber_rounded),
          const SizedBox(width: 10),
          _buildItem(const Color(0xFFEF4444), 'নেই (বন্ধ)', Icons.cancel_outlined),
          const SizedBox(width: 10),
          _buildItem(const Color(0xFF64748B), 'খবর নেই', Icons.radio_button_unchecked),
        ],
      ),
    );
  }

  Widget _buildItem(Color color, String label, IconData icon) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}
