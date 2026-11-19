import 'package:flutter/material.dart';
import '../../../../core/constants/app_strings_bn.dart';
import '../../../../theme/app_theme.dart';

/// Community Disclaimer Banner (CLAUDE.md Section 1.5)
///
/// "Every view must clearly state that all displayed statuses are
/// 'community-reported, not an official measurement'
/// (নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়)."
class CommunityDisclaimer extends StatelessWidget {
  const CommunityDisclaimer({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.oledSurface : AppTheme.lightSurfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? AppTheme.oledBorder : AppTheme.lightBorder,
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(
            Icons.info_outline_rounded,
            size: 16,
            color: isDark ? AppTheme.oledTextMuted : AppTheme.lightTextMuted,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              AppStringsBn.communityDisclaimer,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontSize: 12,
                height: 1.4,
                color: isDark ? AppTheme.oledTextMuted : AppTheme.lightTextMuted,
              ),
              textAlign: TextAlign.start,
            ),
          ),
        ],
      ),
    );
  }
}
