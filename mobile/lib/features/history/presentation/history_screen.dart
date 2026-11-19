import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_strings_bn.dart';
import '../../../../theme/app_theme.dart';
import '../../../../utils/bengali_utils.dart';
import '../models/zone_insights_model.dart';
import '../providers/history_provider.dart';

/// 7-Day Community Reliability History Screen
class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final insightsAsync = ref.watch(zoneInsightsProvider);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(
          AppStringsBn.navHistory,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.refresh(zoneInsightsProvider),
          ),
        ],
      ),
      body: SafeArea(
        child: insightsAsync.when(
          data: (insights) => _buildInsightsContent(context, insights, isDark),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(
            child: Text(
              'ইতিহাস লোড হতে সমস্যা হয়েছে: $err',
              style: TextStyle(color: theme.colorScheme.error),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInsightsContent(
    BuildContext context,
    Zone7DayInsights insights,
    bool isDark,
  ) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Summary Header Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
              width: 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.insights_rounded, color: Color(0xFF10B981)),
                  const SizedBox(width: 8),
                  Text(
                    '${insights.areaNameBn} - গত ৭ দিনের সারসংক্ষেপ',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (insights.insightBn != null) ...[
                Text(
                  insights.insightBn!,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.6,
                    color: isDark ? AppTheme.oledTextSecondary : AppTheme.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 12),
              ],
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStatItem(
                    label: 'মোট নাগরিক রিপোর্ট',
                    value: BengaliUtils.toBengaliDigits(insights.totalReporters),
                    isDark: isDark,
                  ),
                  _buildStatItem(
                    label: 'সক্রিয় দিন',
                    value: '${BengaliUtils.toBengaliDigits(insights.distinctDays)} দিন',
                    isDark: isDark,
                  ),
                  _buildStatItem(
                    label: 'নির্ভরযোগ্যতা',
                    value: insights.dataConfidence == 'high'
                        ? 'উচ্চ'
                        : insights.dataConfidence == 'medium'
                            ? 'মধ্যম'
                            : 'প্রাথমিক',
                    isDark: isDark,
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        const Text(
          'ক্যাটাগরিভিত্তিক বিভ্রাট পরিসংখ্যান',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),

        _buildCategoryCard('electricity', 'বিদ্যুৎ', Icons.bolt_rounded, insights.categories['electricity'], isDark),
        const SizedBox(height: 10),
        _buildCategoryCard('gas', 'গ্যাস', Icons.local_fire_department_rounded, insights.categories['gas'], isDark),
        const SizedBox(height: 10),
        _buildCategoryCard('water', 'পানি', Icons.water_drop_rounded, insights.categories['water'], isDark),
        const SizedBox(height: 10),
        _buildCategoryCard('lpg', 'এলপিজি', Icons.propane_tank_rounded, insights.categories['lpg'], isDark),
      ],
    );
  }

  Widget _buildStatItem({
    required String label,
    required String value,
    required bool isDark,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isDark ? AppTheme.oledTextMuted : AppTheme.lightTextMuted,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryCard(
    String key,
    String title,
    IconData icon,
    CategoryOutageMetrics? metrics,
    bool isDark,
  ) {
    final outageMins = metrics?.totalOutageMinutes ?? 0;
    final events = metrics?.outageEvents ?? 0;
    final hours = outageMins ~/ 60;
    final mins = outageMins % 60;

    String durationStr = '';
    if (hours > 0) {
      durationStr += '${BengaliUtils.toBengaliDigits(hours)} ঘণ্টা ';
    }
    durationStr += '${BengaliUtils.toBengaliDigits(mins)} মিনিট';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 24, color: const Color(0xFF10B981)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                Text(
                  'মোট বিভ্রাট: $durationStr',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppTheme.oledTextSecondary : AppTheme.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.oledSurfaceElevated : AppTheme.lightSurfaceElevated,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '${BengaliUtils.toBengaliDigits(events)} বার',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
