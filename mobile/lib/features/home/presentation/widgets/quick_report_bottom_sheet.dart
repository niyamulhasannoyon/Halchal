import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_strings_bn.dart';
import '../../../../theme/app_theme.dart';
import '../../providers/report_submission_provider.dart';

/// One-Tap Hyperlocal Reporting Bottom Sheet
class QuickReportBottomSheet extends ConsumerStatefulWidget {
  final String? initialCategory;

  const QuickReportBottomSheet({super.key, this.initialCategory});

  static Future<void> show(BuildContext context, {String? initialCategory}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => QuickReportBottomSheet(initialCategory: initialCategory),
    );
  }

  @override
  ConsumerState<QuickReportBottomSheet> createState() => _QuickReportBottomSheetState();
}

class _QuickReportBottomSheetState extends ConsumerState<QuickReportBottomSheet> {
  late String _selectedCategory;
  String _selectedState = 'ok';
  final TextEditingController _priceController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory ?? 'electricity';
  }

  @override
  void dispose() {
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final notifier = ref.read(reportSubmissionProvider.notifier);

    double? price;
    if (_selectedCategory == 'lpg' && _priceController.text.trim().isNotEmpty) {
      price = double.tryParse(_priceController.text.trim());
    }

    final result = await notifier.submitReport(
      category: _selectedCategory,
      state: _selectedState,
      priceBdt: price,
    );

    if (!mounted) return;

    if (result.isMockedHint) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(AppStringsBn.gpsMockWarning),
          backgroundColor: Color(0xFFB45309),
          duration: Duration(seconds: 4),
        ),
      );
    }

    if (result.status == SubmissionStatus.success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message ?? AppStringsBn.reportSuccess),
          backgroundColor: const Color(0xFF047857),
        ),
      );
    } else if (result.status == SubmissionStatus.queuedOffline) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message ?? AppStringsBn.offlineSavedToast),
          backgroundColor: const Color(0xFFB45309),
        ),
      );
    } else if (result.status == SubmissionStatus.error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message ?? 'রিপোর্ট জমা ব্যর্থ হয়েছে'),
          backgroundColor: const Color(0xFFB91C1C),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final submissionState = ref.watch(reportSubmissionProvider);

    return Container(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.oledSurface : AppTheme.lightSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(
            color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
            width: 1.5,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Text(
            AppStringsBn.reportSheetTitle,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            AppStringsBn.reportSheetSubtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontSize: 14,
              color: isDark ? AppTheme.oledTextSecondary : AppTheme.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 20),

          // Category Selector Tabs
          Row(
            children: [
              _buildCategoryTab('electricity', 'বিদ্যুৎ', Icons.bolt_rounded, isDark),
              const SizedBox(width: 8),
              _buildCategoryTab('gas', 'গ্যাস', Icons.local_fire_department_rounded, isDark),
              const SizedBox(width: 8),
              _buildCategoryTab('water', 'পানি', Icons.water_drop_rounded, isDark),
              const SizedBox(width: 8),
              _buildCategoryTab('lpg', 'এলপিজি', Icons.propane_tank_rounded, isDark),
            ],
          ),
          const SizedBox(height: 20),

          // State Radio Choices
          Text(
            AppStringsBn.selectState,
            style: theme.textTheme.labelLarge?.copyWith(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 10),

          _buildStateOption(
            stateKey: 'ok',
            label: 'আছে (স্বাভাবিক)',
            desc: AppStringsBn.stateOkDesc,
            color: const Color(0xFF10B981),
            icon: Icons.check_circle_outline_rounded,
            isDark: isDark,
          ),
          const SizedBox(height: 8),
          _buildStateOption(
            stateKey: 'low',
            label: 'কম (চাপ কম / সমস্যা)',
            desc: AppStringsBn.stateLowDesc,
            color: const Color(0xFFF59E0B),
            icon: Icons.warning_amber_rounded,
            isDark: isDark,
          ),
          const SizedBox(height: 8),
          _buildStateOption(
            stateKey: 'out',
            label: 'নেই (বন্ধ)',
            desc: AppStringsBn.stateOutDesc,
            color: const Color(0xFFEF4444),
            icon: Icons.cancel_outlined,
            isDark: isDark,
          ),

          // Optional LPG Price Input
          if (_selectedCategory == 'lpg') ...[
            const SizedBox(height: 16),
            TextField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              style: TextStyle(
                color: isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary,
              ),
              decoration: InputDecoration(
                labelText: AppStringsBn.lpgPriceLabel,
                hintText: AppStringsBn.lpgPriceHint,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.attach_money_rounded),
              ),
            ),
          ],

          const SizedBox(height: 24),

          // Submit Button (Min height 52px thumb reach zone)
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: submissionState.isLoading ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: isDark
                    ? const Color(0xFF10B981)
                    : const Color(0xFF047857),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 0,
              ),
              child: submissionState.isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      AppStringsBn.submitReport,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.3,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryTab(String key, String label, IconData icon, bool isDark) {
    final isSelected = _selectedCategory == key;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedCategory = key),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? const Color(0xFF182030) : const Color(0xFFE2E8F0))
                : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? (isDark ? const Color(0xFF10B981) : const Color(0xFF047857))
                  : (isDark ? AppTheme.oledBorder : AppTheme.lightBorder),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected
                    ? (isDark ? const Color(0xFF10B981) : const Color(0xFF047857))
                    : (isDark ? AppTheme.oledTextMuted : AppTheme.lightTextMuted),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected
                      ? (isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary)
                      : (isDark ? AppTheme.oledTextSecondary : AppTheme.lightTextSecondary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStateOption({
    required String stateKey,
    required String label,
    required String desc,
    required Color color,
    required IconData icon,
    required bool isDark,
  }) {
    final isSelected = _selectedState == stateKey;
    return InkWell(
      onTap: () => setState(() => _selectedState = stateKey),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withOpacity(isDark ? 0.15 : 0.08)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? color
                : (isDark ? AppTheme.oledBorder : AppTheme.lightBorder),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
              color: isSelected ? color : (isDark ? AppTheme.oledTextMuted : AppTheme.lightTextMuted),
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.oledTextPrimary : AppTheme.lightTextPrimary,
                    ),
                  ),
                  Text(
                    desc,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppTheme.oledTextSecondary : AppTheme.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(icon, color: color, size: 22),
          ],
        ),
      ),
    );
  }
}
