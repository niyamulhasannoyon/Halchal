import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_strings_bn.dart';
import '../../../../theme/app_theme.dart';

/// Battery Optimization Guidance Dialog for Aggressive OEM Task Killers
///
/// Mandate:
/// "add an onboarding step guiding users on Xiaomi/Oppo/Vivo/Samsung to disable
/// aggressive battery optimization for the app, since those OEMs kill background work."
class BatteryOptimizationDialog extends StatelessWidget {
  const BatteryOptimizationDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (context) => const BatteryOptimizationDialog(),
    );
  }

  Future<void> _openSystemBatterySettings() async {
    // Open system application details / battery optimization intent
    final uri = Uri.parse('package:com.halchal.halchal_mobile');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AlertDialog(
      backgroundColor: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          const Icon(
            Icons.battery_alert_rounded,
            color: Color(0xFFF59E0B),
            size: 26,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              AppStringsBn.batteryOptimizationTitle,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary,
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              AppStringsBn.batteryOptimizationSubtitle,
              style: TextStyle(
                fontSize: 13,
                height: 1.5,
                color: isDark ? AppTheme.oledTextSecondary : AppTheme.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 16),

            _buildOemTile(
              brand: 'Xiaomi (MIUI / HyperOS)',
              icon: Icons.phone_android_rounded,
              instruction: AppStringsBn.batteryOptimizationXiaomi,
              isDark: isDark,
            ),
            const SizedBox(height: 8),

            _buildOemTile(
              brand: 'Samsung (One UI)',
              icon: Icons.phone_android_rounded,
              instruction: AppStringsBn.batteryOptimizationSamsung,
              isDark: isDark,
            ),
            const SizedBox(height: 8),

            _buildOemTile(
              brand: 'Oppo / Realme (ColorOS)',
              icon: Icons.phone_android_rounded,
              instruction: AppStringsBn.batteryOptimizationOppo,
              isDark: isDark,
            ),
            const SizedBox(height: 8),

            _buildOemTile(
              brand: 'Vivo (Funtouch OS)',
              icon: Icons.phone_android_rounded,
              instruction: AppStringsBn.batteryOptimizationVivo,
              isDark: isDark,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text(
            AppStringsBn.dismiss,
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            _openSystemBatterySettings();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          child: const Text(AppStringsBn.openBatterySettings),
        ),
      ],
    );
  }

  Widget _buildOemTile({
    required String brand,
    required IconData icon,
    required String instruction,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.oledSurfaceElevated : AppTheme.lightSurfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFF10B981)),
              const SizedBox(width: 6),
              Text(
                brand,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            instruction,
            style: TextStyle(
              fontSize: 12,
              height: 1.45,
              color: isDark ? AppTheme.oledTextSecondary : AppTheme.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
