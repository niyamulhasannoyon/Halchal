import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_strings_bn.dart';
import '../../../../theme/app_theme.dart';
import '../../../../utils/bengali_utils.dart';
import '../providers/settings_provider.dart';
import 'widgets/battery_optimization_dialog.dart';

/// Settings & Notification Preferences Screen
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final settings = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(
          AppStringsBn.navSettings,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // OEM Battery Optimization Guide Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0x1AF59E0B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0x73F59E0B), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.battery_saver_rounded, color: Color(0xFFF59E0B)),
                      SizedBox(width: 8),
                      Text(
                        'জরুরি নোটিফিকেশন মিস হচ্ছে?',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFFCD34D),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Xiaomi, Oppo, Vivo ও Samsung ফোনে ব্যাকগ্রাউন্ডে নোটিফিকেশন পেতে ব্যাটারি অপ্টিমাইজেশন বন্ধ করুন।',
                    style: TextStyle(fontSize: 13, height: 1.45),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 40,
                    child: OutlinedButton(
                      onPressed: () => BatteryOptimizationDialog.show(context),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFF59E0B)),
                        foregroundColor: const Color(0xFFFCD34D),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text('গাইড ও সেটিংস দেখুন'),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Notification Categories Section
            Text(
              AppStringsBn.settingsNotificationsHeader,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),

            _buildCategorySwitch(
              label: 'বিদ্যুৎ বিভ্রাট অ্যালার্ট',
              category: 'electricity',
              icon: Icons.bolt_rounded,
              settings: settings,
              notifier: notifier,
              isDark: isDark,
            ),
            const SizedBox(height: 8),

            _buildCategorySwitch(
              label: 'গ্যাস সরবরাহ ও চাপ অ্যালার্ট',
              category: 'gas',
              icon: Icons.local_fire_department_rounded,
              settings: settings,
              notifier: notifier,
              isDark: isDark,
            ),
            const SizedBox(height: 8),

            _buildCategorySwitch(
              label: 'পানি সরবরাহ অ্যালার্ট',
              category: 'water',
              icon: Icons.water_drop_rounded,
              settings: settings,
              notifier: notifier,
              isDark: isDark,
            ),
            const SizedBox(height: 8),

            _buildCategorySwitch(
              label: 'এলপিজি দাম হালনাগাদ',
              category: 'lpg',
              icon: Icons.propane_tank_rounded,
              settings: settings,
              notifier: notifier,
              isDark: isDark,
            ),

            const SizedBox(height: 16),

            // Night Alerts
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
                ),
              ),
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  AppStringsBn.settingsNightAlerts,
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                subtitle: const Text(
                  AppStringsBn.settingsNightAlertsDesc,
                  style: TextStyle(fontSize: 12),
                ),
                value: settings.allowNightAlerts,
                activeColor: const Color(0xFF10B981),
                onChanged: (val) => notifier.toggleNightAlerts(val),
              ),
            ),

            const SizedBox(height: 24),

            // Home Zone Information
            Text(
              AppStringsBn.settingsHomeZoneHeader,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.home_work_rounded, color: Color(0xFF10B981)),
                      const SizedBox(width: 8),
                      Text(
                        'নিবন্ধিত এলাকা H3: ${settings.homeH3}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    settings.homeChangeDaysRemaining > 0
                        ? 'হোম জোন পরিবর্তন করতে আরও ${BengaliUtils.toBengaliDigits(settings.homeChangeDaysRemaining)} দিন অপেক্ষা করতে হবে।'
                        : 'হোম জোন বর্তমানে পরিবর্তনযোগ্য।',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppTheme.oledTextSecondary : AppTheme.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Privacy & Community Rules
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.oledSurfaceElevated : AppTheme.lightSurfaceElevated,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'গোপনীয়তা ও ডেটা সুরক্ষা নীতিমালা',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '১. কোনো জিপিএস স্থানাঙ্ক বা ব্যক্তিগত পরিচয় ডেটাবেজে সংরক্ষণ করা হয় না।\n'
                    '২. আপনার রিপোর্ট সম্পূর্ণ বেনামী।\n'
                    '৩. ৭২ ঘণ্টা পর সব কাঁচা রিপোর্ট মুছে যায়।',
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.6,
                      color: isDark ? AppTheme.oledTextMuted : AppTheme.lightTextMuted,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildCategorySwitch({
    required String label,
    required String category,
    required IconData icon,
    required SettingsState settings,
    required SettingsNotifier notifier,
    required bool isDark,
  }) {
    final isSelected = settings.categories.contains(category);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
        ),
      ),
      child: SwitchListTile(
        contentPadding: EdgeInsets.zero,
        secondary: Icon(icon, color: const Color(0xFF10B981)),
        title: Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        value: isSelected,
        activeColor: const Color(0xFF10B981),
        onChanged: (_) => notifier.toggleCategory(category),
      ),
    );
  }
}
